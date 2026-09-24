import * as XLSX from 'xlsx'

export interface QuestionOptionItem {
  id: string
  text: string
  is_correct: boolean
}

export interface ParsedQuestionRow {
  index: number
  raw_question_text: string
  question_text: string
  raw_question_type: string
  question_type: 'MCQ' | 'SCQ' | 'Q&A'
  raw_max_scale: any
  max_scale_value: number
  raw_options: any
  options: QuestionOptionItem[]
  isValid: boolean
  validationError?: string
  warnings: string[]
}

export interface HeaderMappingResult {
  questionTextKey?: string
  questionTypeKey?: string
  maxScaleKey?: string
  optionsKey?: string
  missingRequired: string[]
}

/**
 * Normalizes string for regex comparison (lowercase, trims, removes accents and collapses underscores/spaces).
 */
export function normalizeHeaderKey(header: string): string {
  if (!header) return ''
  return String(header)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
}

/**
 * Flexible regex mapping rules for station question column headers.
 */
export const HEADER_REGEXES = {
  question_text: [
    /^(question\s*text|question\s*title|question\s*prompt|question|prompt|criteria|criterion|item|rubric|titre|enonce|libelle|titre\s*question)$/i,
    /question/i,
    /prompt/i,
    /criteria/i,
  ],
  question_type: [
    /^(question\s*type|type|format|q\s*type|kind|category|type\s*de\s*question|questiontype)$/i,
    /type/i,
    /format/i,
  ],
  max_scale_value: [
    /^(max\s*scale\s*value|max\s*scale|scale|max\s*score|points|max\s*points|score|bareme|note\s*max|valeur\s*max|maxscalevalue|scale\s*value)$/i,
    /scale/i,
    /points/i,
    /score/i,
    /bareme/i,
  ],
  options: [
    /^(options|choices|answers|values|choix|reponses|propositions|options\s*list)$/i,
    /option/i,
    /choice/i,
    /answer/i,
  ],
}

/**
 * Maps raw spreadsheet column headers to standard question attributes using flexible regexes.
 */
export function detectQuestionHeaders(headers: string[]): HeaderMappingResult {
  const result: HeaderMappingResult = {
    missingRequired: [],
  }

  const normalizedMap = new Map<string, string>()
  headers.forEach((h) => {
    normalizedMap.set(h, normalizeHeaderKey(h))
  })

  const matchColumn = (patterns: RegExp[]): string | undefined => {
    // 1. Try exact regex patterns first
    for (const pattern of patterns) {
      for (const [orig, norm] of normalizedMap.entries()) {
        if (pattern.test(norm) || pattern.test(orig)) {
          return orig
        }
      }
    }
    return undefined
  }

  result.questionTextKey = matchColumn(HEADER_REGEXES.question_text)
  result.questionTypeKey = matchColumn(HEADER_REGEXES.question_type)
  result.maxScaleKey = matchColumn(HEADER_REGEXES.max_scale_value)
  result.optionsKey = matchColumn(HEADER_REGEXES.options)

  if (!result.questionTextKey) {
    result.missingRequired.push('question_text (Question text/prompt)')
  }

  return result
}

/**
 * Normalizes question_type string into the strict database ENUM: 'MCQ' | 'SCQ' | 'Q&A'
 */
export function normalizeQuestionType(
  rawType: any,
  optionsCount: number = 0
): { type: 'MCQ' | 'SCQ' | 'Q&A'; warning?: string } {
  if (!rawType || typeof rawType !== 'string' || !rawType.trim()) {
    // Default fallback based on options presence
    if (optionsCount > 0) {
      return { type: 'MCQ', warning: 'Type not specified; defaulted to MCQ based on provided options.' }
    }
    return { type: 'Q&A', warning: 'Type not specified; defaulted to Clinical Q&A.' }
  }

  const cleaned = rawType.toUpperCase().trim()

  // Strict matches
  if (cleaned === 'MCQ' || cleaned === 'QCM' || cleaned.includes('MULTIPLE')) {
    return { type: 'MCQ' }
  }
  if (cleaned === 'SCQ' || cleaned === 'QCU' || cleaned.includes('SINGLE')) {
    return { type: 'SCQ' }
  }
  if (
    cleaned === 'Q&A' ||
    cleaned === 'QA' ||
    cleaned === 'Q_A' ||
    cleaned.includes('CLINICAL') ||
    cleaned.includes('OPEN') ||
    cleaned.includes('SCALE') ||
    cleaned.includes('RUBRIC')
  ) {
    return { type: 'Q&A' }
  }

  // Fallback
  if (optionsCount > 0) {
    return {
      type: 'MCQ',
      warning: `Unknown type "${rawType}"; defaulted to MCQ.`,
    }
  }
  return {
    type: 'Q&A',
    warning: `Unknown type "${rawType}"; defaulted to Q&A.`,
  }
}

/**
 * Parses raw options cell content (JSON array or delimited text) into structured QuestionOptionItem array.
 */
export function parseOptionsField(rawOptions: any): QuestionOptionItem[] {
  if (!rawOptions) return []

  // If already an array
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((item, idx) => {
        if (typeof item === 'string') {
          return sanitizeOptionString(item, idx)
        } else if (typeof item === 'object' && item !== null) {
          return {
            id: item.id || `opt_${idx + 1}`,
            text: String(item.text || item.title || item.option_text || '').trim(),
            is_correct: !!item.is_correct,
          }
        }
        return null
      })
      .filter((opt): opt is QuestionOptionItem => !!opt && !!opt.text)
  }

  const str = String(rawOptions).trim()
  if (!str || str === '[]' || str === 'null' || str === 'undefined') {
    return []
  }

  // 1. Try parsing as JSON array (e.g. ["Yes", "No"] or [{"text": "Yes", "is_correct": true}])
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      // Replace non-standard single quotes if needed
      const sanitizedJsonStr = str.replace(/'/g, '"')
      const parsed = JSON.parse(sanitizedJsonStr)
      if (Array.isArray(parsed)) {
        return parseOptionsField(parsed)
      }
    } catch {
      // Fall through to regex-based delimiter splitting
    }
  }

  // 2. Delimiter detection: newline, pipe, semicolon, or comma
  let items: string[] = []
  if (str.includes('\n')) {
    items = str.split('\n')
  } else if (str.includes('|')) {
    items = str.split('|')
  } else if (str.includes(';')) {
    items = str.split(';')
  } else if (str.includes(',')) {
    items = str.split(',')
  } else {
    items = [str]
  }

  return items
    .map((item, idx) => sanitizeOptionString(item, idx))
    .filter((opt): opt is QuestionOptionItem => !!opt && !!opt.text)
}

function sanitizeOptionString(raw: string, idx: number): QuestionOptionItem | null {
  let text = raw.trim()
  // Strip surrounding quotes
  text = text.replace(/^["'\[]+|["'\]]+$/g, '').trim()
  if (!text) return null

  let isCorrect = false

  // Detect correct answer markers: "Option A*" or "Option A (correct)" or "Option A [key]"
  if (text.endsWith('*')) {
    isCorrect = true
    text = text.slice(0, -1).trim()
  } else if (/\s*\(correct\)$/i.test(text)) {
    isCorrect = true
    text = text.replace(/\s*\(correct\)$/i, '').trim()
  } else if (/\s*\[correct\]$/i.test(text)) {
    isCorrect = true
    text = text.replace(/\s*\[correct\]$/i, '').trim()
  } else if (/\s*\(key\)$/i.test(text)) {
    isCorrect = true
    text = text.replace(/\s*\(key\)$/i, '').trim()
  }

  return {
    id: `opt_${idx + 1}`,
    text,
    is_correct: isCorrect,
  }
}

/**
 * Parses raw JSON rows from XLSX / CSV into strongly typed, validated ParsedQuestionRow objects.
 */
export function parseRawQuestionRows(rawRows: any[], headers: string[]): {
  rows: ParsedQuestionRow[]
  mapping: HeaderMappingResult
} {
  const mapping = detectQuestionHeaders(headers)
  if (mapping.missingRequired.length > 0) {
    return { rows: [], mapping }
  }

  const { questionTextKey, questionTypeKey, maxScaleKey, optionsKey } = mapping

  const rows: ParsedQuestionRow[] = rawRows.map((raw, index) => {
    const rawText = questionTextKey ? raw[questionTextKey] : ''
    const rawType = questionTypeKey ? raw[questionTypeKey] : ''
    const rawScale = maxScaleKey ? raw[maxScaleKey] : ''
    const rawOpts = optionsKey ? raw[optionsKey] : ''

    const warnings: string[] = []
    let isValid = true
    let validationError: string | undefined

    // 1. Question Text
    const question_text = typeof rawText === 'string' ? rawText.trim() : String(rawText || '').trim()
    if (!question_text) {
      isValid = false
      validationError = 'Missing question text / prompt'
    }

    // 2. Options Parsing
    let options = parseOptionsField(rawOpts)

    // 3. Question Type Normalization
    const typeResult = normalizeQuestionType(rawType, options.length)
    const question_type = typeResult.type
    if (typeResult.warning) {
      warnings.push(typeResult.warning)
    }

    // If Q&A, options must be empty
    if (question_type === 'Q&A') {
      if (options.length > 0) {
        warnings.push(`Options omitted because question type is Q&A.`)
        options = []
      }
    } else {
      // MCQ or SCQ
      if (options.length === 0) {
        warnings.push(`No options detected for ${question_type}; candidates will evaluate without predetermined keys.`)
      }
    }

    // 4. Max Scale Value
    let max_scale_value = 10
    if (rawScale !== undefined && rawScale !== null && rawScale !== '') {
      const parsedNum = Number(rawScale)
      if (isNaN(parsedNum) || parsedNum <= 0) {
        warnings.push(`Invalid scale value "${rawScale}"; defaulted to 10 points.`)
        max_scale_value = 10
      } else {
        max_scale_value = Math.max(1, Math.round(parsedNum))
      }
    } else {
      max_scale_value = question_type === 'SCQ' ? 1 : 10
    }

    return {
      index: index + 1,
      raw_question_text: String(rawText || ''),
      question_text,
      raw_question_type: String(rawType || ''),
      question_type,
      raw_max_scale: rawScale,
      max_scale_value,
      raw_options: rawOpts,
      options,
      isValid,
      validationError,
      warnings,
    }
  })

  return { rows, mapping }
}

/**
 * Downloads a sample Excel template matching OSCE_Questions_Import_Template_V2.xlsx exactly.
 */
export function downloadQuestionsExcelTemplate() {
  const sampleData = [
    {
      question_text: 'Confirm patient consent and identity',
      question_type: 'SCQ',
      max_scale_value: 1,
      options: '["Yes", "No"]',
    },
    {
      question_text: 'Select the single best primary diagnosis',
      question_type: 'MCQ',
      max_scale_value: 5,
      options: '["Anemia", "Leukemia", "Lymphoma"]',
    },
    {
      question_text: 'Describe the emergency management steps',
      question_type: 'Q&A',
      max_scale_value: 10,
      options: '[]',
    },
    {
      question_text: 'Demonstrate proper aseptic sterile glove technique',
      question_type: 'SCQ',
      max_scale_value: 2,
      options: '["Satisfactory*", "Needs Improvement", "Unsatisfactory"]',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: ['question_text', 'question_type', 'max_scale_value', 'options'],
  })

  // Set column widths for comfortable reading
  ws['!cols'] = [
    { wch: 45 }, // question_text
    { wch: 15 }, // question_type
    { wch: 18 }, // max_scale_value
    { wch: 50 }, // options
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Station_Checklist')
  XLSX.writeFile(wb, 'OSCE_Questions_Import_Template.xlsx')
}
