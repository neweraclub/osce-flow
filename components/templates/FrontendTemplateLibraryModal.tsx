'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  AlertTriangle,
  Search,
  Check,
  RotateCcw,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Layers,
  HelpCircle,
} from 'lucide-react'
import {
  PenaltyBonusTemplate,
  DEFAULT_PENALTY_BONUS_TEMPLATES,
  getLocalTemplates,
  saveLocalTemplate,
  deleteLocalTemplate,
  resetLocalTemplates,
} from '@/lib/penaltyBonusTemplates'
import { useToast } from '@/context/ToastContext'

interface FrontendTemplateLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: 'all' | 'penalty' | 'bonus'
  title?: string
}

export function FrontendTemplateLibraryModal({
  isOpen,
  onClose,
  initialType = 'all',
  title = 'Standardized Scoring Presets & Templates',
}: FrontendTemplateLibraryModalProps) {
  const { showSuccess, showError } = useToast()

  const [templates, setTemplates] = useState<PenaltyBonusTemplate[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'penalty' | 'bonus'>(initialType)
  const [searchQuery, setSearchQuery] = useState('')

  // Form Modal state for adding or editing templates
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PenaltyBonusTemplate | null>(null)
  const [formType, setFormType] = useState<'penalty' | 'bonus'>(
    initialType === 'bonus' ? 'bonus' : 'penalty'
  )
  const [formTitle, setFormTitle] = useState('')
  const [formValue, setFormValue] = useState<string>('0.5')
  const [formNote, setFormNote] = useState('')

  // Reload templates on mount or when storage updates
  const reloadTemplates = () => {
    setTemplates(getLocalTemplates())
  }

  useEffect(() => {
    if (isOpen) {
      reloadTemplates()
      setActiveTab(initialType)
    }
  }, [isOpen, initialType])

  useEffect(() => {
    window.addEventListener('osce-templates-updated', reloadTemplates)
    return () => window.removeEventListener('osce-templates-updated', reloadTemplates)
  }, [])

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesType = activeTab === 'all' || tpl.type === activeTab
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.default_note.toLowerCase().includes(q) ||
        String(Math.abs(tpl.default_value)).includes(q)
      return matchesType && matchesSearch
    })
  }, [templates, activeTab, searchQuery])

  const penaltyCount = useMemo(() => templates.filter((t) => t.type === 'penalty').length, [templates])
  const bonusCount = useMemo(() => templates.filter((t) => t.type === 'bonus').length, [templates])

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormType(activeTab === 'bonus' ? 'bonus' : 'penalty')
    setFormTitle('')
    setFormValue('0.5')
    setFormNote('')
    setIsEditorOpen(true)
  }

  const handleOpenEdit = (tpl: PenaltyBonusTemplate) => {
    setEditingTemplate(tpl)
    setFormType(tpl.type)
    setFormTitle(tpl.title)
    setFormValue(String(Math.abs(tpl.default_value)))
    setFormNote(tpl.default_note)
    setIsEditorOpen(true)
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      showError('Template title is required.')
      return
    }

    const numericVal = parseFloat(formValue)
    if (isNaN(numericVal) || numericVal <= 0) {
      showError('Please enter a positive numeric points value (e.g. 0.5, 1.0).')
      return
    }

    saveLocalTemplate({
      id: editingTemplate ? editingTemplate.id : undefined,
      type: formType,
      title: formTitle,
      default_value: numericVal,
      default_note: formNote,
    })

    showSuccess(
      editingTemplate
        ? `Updated template: "${formTitle}"`
        : `Added template: "${formTitle}"`
    )

    setIsEditorOpen(false)
    reloadTemplates()
  }

  const handleDelete = (id: string, title: string) => {
    if (id.startsWith('preset-')) {
      showError('System default presets cannot be deleted.')
      return
    }
    const ok = deleteLocalTemplate(id)
    if (ok) {
      showSuccess(`Deleted "${title}".`)
      reloadTemplates()
    }
  }

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Reset all templates to standard faculty presets? This will clear custom templates saved in this browser.'
      )
    ) {
      resetLocalTemplates()
      reloadTemplates()
      showSuccess('Templates reset to factory presets.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-emerald-500/20 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-[#0B1612]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sliders className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40">
                  Client-Side Store
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standardized templates surfaced to examiners for 1-click evaluation without database schema overhead.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Preset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-200/60 dark:border-emerald-500/15 bg-white dark:bg-[#12221C] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-[#12221C] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('penalty')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'penalty'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              Deductions ({penaltyCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bonus')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bonus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              Merit Bonuses ({bonusCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by title or note..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50/50 dark:bg-[#0B1612]/50 border border-dashed border-slate-200 dark:border-emerald-500/20 space-y-3">
              <Layers className="size-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No templates found matching your query.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
              >
                <Plus className="size-3.5" />
                <span>Create Preset</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTemplates.map((tpl) => {
                const isBonus = tpl.type === 'bonus'
                const isPreset = tpl.id.startsWith('preset-')
                const absPts = Math.abs(tpl.default_value)

                return (
                  <div
                    key={tpl.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                      isBonus
                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/50'
                        : 'bg-rose-500/[0.04] dark:bg-rose-950/15 border-rose-500/25 hover:border-rose-500/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isBonus
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                            }`}
                          >
                            {isBonus ? (
                              <Sparkles className="size-2.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="size-2.5 text-rose-600" />
                            )}
                            <span>{isBonus ? 'Merit Bonus' : 'Deduction'}</span>
                          </span>

                          <span className="text-[10px] text-slate-400 font-medium">
                            {isPreset ? 'Standard Faculty Preset' : 'Custom Local Preset'}
                          </span>
                        </div>

                        {/* Points badge */}
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg shrink-0 ${
                            isBonus
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-rose-500 text-white shadow-xs'
                          }`}
                        >
                          {isBonus ? `+${absPts.toFixed(1)}` : `-${absPts.toFixed(1)}`} pts
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {tpl.title}
                        </h4>
                        {tpl.default_note && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {tpl.default_note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[10px]">
                        Examiner Terminal Ready (Click/Drag)
                      </span>

                      {!isPreset && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tpl)}
                            className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Edit template"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl.id, tpl.title)}
                            className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-emerald-500/20 bg-slate-50/50 dark:bg-[#0B1612] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Factory Presets</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Nested Editor Modal (Create or Edit) */}
        {isEditorOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/30 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-emerald-500/20 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="size-4 text-emerald-600" />
                  <span>{editingTemplate ? 'Edit Template' : 'New Scoring Preset'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Template Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('penalty')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formType === 'penalty'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <AlertTriangle className="size-3.5" />
                      <span>Deduction (Loss)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('bonus')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formType === 'bonus'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Sparkles className="size-3.5" />
                      <span>Merit Bonus</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Title / Criterion Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Minor Aseptic Breach, Exemplary Technique..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Points Value */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Points Magnitude (Absolute value, e.g. 0.5, 1.0, 2.0) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="100"
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Description Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Clinical Justification / Examiner Note
                  </label>
                  <textarea
                    rows={2}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Standardized guidance or reason description..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {editingTemplate ? 'Update Preset' : 'Save Preset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
