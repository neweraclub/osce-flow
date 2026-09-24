'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Loader2,
  Sparkles,
  Table,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  ParsedQuestionRow,
  parseRawQuestionRows,
  downloadQuestionsExcelTemplate,
} from '@/lib/excelQuestionParser'
import { bulkImportQuestionsAction } from '@/app/professor/stations/actions'

interface ImportQuestionsExcelModalProps {
  isOpen: boolean
  onClose: () => void
  stationId: string
  stationTitle?: string
  onImportSuccess: (count: number) => void
}

export function ImportQuestionsExcelModal({
  isOpen,
  onClose,
  stationId,
  stationTitle,
  onImportSuccess,
}: ImportQuestionsExcelModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedQuestionRow[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset state when opening/closing
  const handleClose = () => {
    setFile(null)
    setParsedRows([])
    setParseError(null)
    setSubmitError(null)
    setDetectedColumns([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    processSpreadsheet(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processSpreadsheet(droppedFile)
    }
  }

  const processSpreadsheet = (uploadedFile: File) => {
    setFile(uploadedFile)
    setParseError(null)
    setSubmitError(null)
    setParsing(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const sheetName = wb.SheetNames.includes('Station_Checklist')
          ? 'Station_Checklist'
          : wb.SheetNames[0]

        const ws = wb.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rawJson.length === 0) {
          setParseError('The uploaded spreadsheet contains no data rows.')
          setParsedRows([])
          setParsing(false)
          return
        }

        // Extract column headers
        const headers = Object.keys(rawJson[0])
        setDetectedColumns(headers)

        const { rows, mapping } = parseRawQuestionRows(rawJson, headers)

        if (mapping.missingRequired.length > 0) {
          setParseError(
            `Could not detect required column: ${mapping.missingRequired.join(
              ', '
            )}. Accepted header aliases include: question_text, question, text, prompt, criteria.`
          )
          setParsedRows([])
        } else {
          setParsedRows(rows)
        }
      } catch (err: any) {
        console.error('Spreadsheet parse exception:', err)
        setParseError(
          'Failed to read spreadsheet file. Please verify that it is a valid .xlsx, .xls, or .csv document.'
        )
        setParsedRows([])
      } finally {
        setParsing(false)
      }
    }

    reader.onerror = () => {
      setParseError('Error reading file from disk.')
      setParsing(false)
    }

    reader.readAsBinaryString(uploadedFile)
  }

  const validRows = parsedRows.filter((r) => r.isValid)
  const invalidRowsCount = parsedRows.length - validRows.length

  const handleConfirmImport = async () => {
    if (validRows.length === 0 || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = validRows.map((r) => ({
        question_text: r.question_text,
        question_type: r.question_type,
        max_scale_value: r.max_scale_value,
        options: r.options,
      }))

      const res = await bulkImportQuestionsAction({
        stationId,
        questions: payload,
      })

      if (res.success) {
        onImportSuccess(res.count || payload.length)
        handleClose()
      } else {
        setSubmitError(res.error || 'Failed to bulk import questions into database.')
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error executing bulk question import.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-excel-title"
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0B1612] rounded-3xl border border-emerald-500/25 shadow-2xl overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-500/20 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 shrink-0">
              <FileSpreadsheet className="size-5 sm:size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="import-excel-title"
                  className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
                >
                  Import Questions from Excel / CSV
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Bulk Parser
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {stationTitle ? (
                  <span>
                    Target Station:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {stationTitle}
                    </strong>
                  </span>
                ) : (
                  'Batch import station rubric questions, types, scale points, and options.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Visual Template Reference Guide */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/30 dark:bg-emerald-950/20 overflow-hidden transition-all">
            <div
              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
              onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Reference Template Guide & Column Specifications
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadQuestionsExcelTemplate()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Download Sample .xlsx</span>
                </button>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${
                    isTemplateExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {isTemplateExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-emerald-100 dark:border-emerald-500/15 space-y-3.5">
                {/* Visual Image Preview of Excel Template (excel_docs.jfif) */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative bg-slate-900 max-h-44 flex items-center justify-center">
                  <img
                    src="/excel_docs.jfif"
                    alt="OSCE Questions Import Excel Template Reference"
                    className="w-full h-auto object-cover max-h-44 hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                    <Table className="size-3" />
                    <span>OSCE_Questions_Import_Template_V2.xlsx</span>
                  </div>
                </div>

                {/* Column Specifications Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                      question_text *
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Question prompt or clinical task. Also accepts: <code className="text-[10px]">prompt, text, criteria</code>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                      question_type
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      ENUM: <strong className="text-slate-800 dark:text-slate-200">MCQ</strong>, <strong className="text-slate-800 dark:text-slate-200">SCQ</strong>, or <strong className="text-slate-800 dark:text-slate-200">Q&A</strong>. Defaults logically based on options.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 block">
                      max_scale_value
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Maximum points awarded (e.g. 1, 5, 10). Also accepts: <code className="text-[10px]">points, score, scale</code>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 block">
                      options
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      JSON array <code className="text-[10px]">[&quot;Yes&quot;, &quot;No&quot;]</code> or comma-separated list. Mark key with <code className="text-[10px]">*</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-emerald-400/60 dark:border-emerald-600/40 hover:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all text-center cursor-pointer space-y-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-xs">
              <UploadCloud className="size-6" />
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {file ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Active file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  'Click to upload or drag & drop spreadsheet'
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Parsing Spinner */}
          {parsing && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 text-emerald-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">
                Parsing spreadsheet rows and mapping column headers...
              </span>
            </div>
          )}

          {/* 3. Parsed Rows Preview Table */}
          {parsedRows.length > 0 && !parsing && (
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Total: {parsedRows.length} rows
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    <span>{validRows.length} Ready to Import</span>
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      <span>{invalidRowsCount} Invalid / Skipped</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setParsedRows([])
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-slate-400 hover:text-rose-500 font-semibold transition-colors"
                >
                  Clear Selection
                </button>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Question Prompt</th>
                        <th className="py-2.5 px-3 w-24">Type</th>
                        <th className="py-2.5 px-3 w-20 text-center">Points</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Options & Answer Keys</th>
                        <th className="py-2.5 px-3 w-20 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {parsedRows.map((r) => {
                        const typeBadgeStyle =
                          r.question_type === 'MCQ'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                            : r.question_type === 'SCQ'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'

                        return (
                          <tr
                            key={r.index}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                              !r.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                              {r.index}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 dark:text-white block line-clamp-2">
                                {r.question_text || (
                                  <span className="text-rose-500 italic">
                                    [Empty Prompt]
                                  </span>
                                )}
                              </span>
                              {r.warnings.length > 0 && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                  {r.warnings.join(' ')}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border inline-block ${typeBadgeStyle}`}
                              >
                                {r.question_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {r.max_scale_value} pts
                            </td>
                            <td className="py-2.5 px-3">
                              {r.question_type === 'Q&A' ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  Scale Scoring (No choices)
                                </span>
                              ) : r.options.length === 0 ? (
                                <span className="text-[11px] text-amber-500">
                                  None provided
                                </span>
                              ) : (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {r.options.slice(0, 3).map((opt) => (
                                    <span
                                      key={opt.id}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate max-w-[120px] ${
                                        opt.is_correct
                                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold'
                                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                      }`}
                                      title={opt.text + (opt.is_correct ? ' (Key)' : '')}
                                    >
                                      {opt.text}
                                      {opt.is_correct && ' ✓'}
                                    </span>
                                  ))}
                                  {r.options.length > 3 && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      +{r.options.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {r.isValid ? (
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                  <Check className="size-3 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center size-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-help"
                                  title={r.validationError}
                                >
                                  <AlertCircle className="size-3.5" />
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={downloadQuestionsExcelTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Get Blank Excel Template</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Importing Questions...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  <span>
                    Import {validRows.length}{' '}
                    {validRows.length === 1 ? 'Question' : 'Questions'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
