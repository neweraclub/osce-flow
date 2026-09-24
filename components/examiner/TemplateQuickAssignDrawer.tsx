'use client'

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  X,
  GripVertical,
  Check,
  Search,
  Zap,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Loader2,
  Layers,
} from 'lucide-react'
import { PenaltyBonusTemplate } from '@/app/actions/penaltyBonusTemplates'
import { useToast } from '@/context/ToastContext'

interface TemplateQuickAssignDrawerProps {
  isOpen: boolean
  onClose: () => void
  templates: PenaltyBonusTemplate[]
  activeStudentName?: string
  onQuickApply: (template: PenaltyBonusTemplate) => void
  onCustomizeApply: (template: PenaltyBonusTemplate) => void
  onCreateTemplate: (input: {
    type: 'bonus' | 'penalty'
    title: string
    default_value: number
    default_note: string
  }) => Promise<boolean>
  onUpdateTemplate: (
    id: string,
    input: Partial<PenaltyBonusTemplate>
  ) => Promise<boolean>
  onDeleteTemplate: (id: string) => Promise<boolean>
}

export function TemplateQuickAssignDrawer({
  isOpen,
  onClose,
  templates,
  activeStudentName,
  onQuickApply,
  onCustomizeApply,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: TemplateQuickAssignDrawerProps) {
  const { showSuccess, showError } = useToast()

  const [activeTab, setActiveTab] = useState<'all' | 'bonus' | 'penalty'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Template Form Modal (Create or Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PenaltyBonusTemplate | null>(null)
  const [formType, setFormType] = useState<'bonus' | 'penalty'>('penalty')
  const [formTitle, setFormTitle] = useState('')
  const [formValue, setFormValue] = useState<string>('0.5')
  const [formNote, setFormNote] = useState('')
  const [submittingForm, setSubmittingForm] = useState(false)

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesTab = activeTab === 'all' || tpl.type === activeTab
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        (tpl.default_note && tpl.default_note.toLowerCase().includes(q))
      return matchesTab && matchesSearch
    })
  }, [templates, activeTab, searchQuery])

  const bonusCount = useMemo(() => templates.filter((t) => t.type === 'bonus').length, [templates])
  const penaltyCount = useMemo(
    () => templates.filter((t) => t.type === 'penalty').length,
    [templates]
  )

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormType(activeTab === 'bonus' ? 'bonus' : 'penalty')
    setFormTitle('')
    setFormValue('0.5')
    setFormNote('')
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (tpl: PenaltyBonusTemplate) => {
    setEditingTemplate(tpl)
    setFormType(tpl.type)
    setFormTitle(tpl.title)
    setFormValue(String(Math.abs(tpl.default_value)))
    setFormNote(tpl.default_note || '')
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      showError('Please enter a template title.')
      return
    }

    const numVal = Math.abs(parseFloat(formValue))
    if (isNaN(numVal) || numVal <= 0) {
      showError('Please provide a valid point value greater than zero.')
      return
    }

    setSubmittingForm(true)
    try {
      if (editingTemplate) {
        const ok = await onUpdateTemplate(editingTemplate.id, {
          title: formTitle.trim(),
          type: formType,
          default_value: numVal,
          default_note: formNote.trim(),
        })
        if (ok) {
          showSuccess('Template updated successfully.')
          setIsFormModalOpen(false)
        }
      } else {
        const ok = await onCreateTemplate({
          title: formTitle.trim(),
          type: formType,
          default_value: numVal,
          default_note: formNote.trim(),
        })
        if (ok) {
          showSuccess('New template saved to library.')
          setIsFormModalOpen(false)
        }
      }
    } finally {
      setSubmittingForm(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await onDeleteTemplate(id)
    if (ok) {
      showSuccess('Template removed.')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Zap className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <span>Quick Templates</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {templates.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Drag card onto candidate or click <strong>Apply</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs shadow-amber-500/20 transition-all cursor-pointer"
                  title="Create Template"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Sub-Header: Active Target Student Notice */}
            {activeStudentName ? (
              <div className="px-4 py-2.5 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Target:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 truncate">
                    {activeStudentName}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0 bg-amber-100/60 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                  Live Sync
                </span>
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Select a candidate from the roster to quick-assign templates.
              </div>
            )}

            {/* Filter Tabs & Search Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
              {/* Type Filter Pills */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('penalty')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'penalty'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <ShieldAlert className="size-3" />
                  <span>Penalties ({penaltyCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bonus')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'bonus'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <ShieldCheck className="size-3" />
                  <span>Bonuses ({bonusCount})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter templates..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Template Card Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {filteredTemplates.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Layers className="size-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No templates found
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Click <strong>Add</strong> above to create reusable bonus and deduction templates.
                  </p>
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isBonus = tpl.type === 'bonus'
                  const pts = Math.abs(tpl.default_value)

                  return (
                    <div
                      key={tpl.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(tpl))
                        e.dataTransfer.setData('text/plain', tpl.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between space-y-2.5 cursor-grab active:cursor-grabbing select-none ${
                        isBonus
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-500/5'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-800/40 hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-md hover:shadow-rose-500/5'
                      }`}
                    >
                      {/* Top Header: Drag Handle, Title & Value Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <GripVertical className="size-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug truncate">
                              {tpl.title}
                            </h4>
                            {tpl.default_note && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                                {tpl.default_note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Value Badge */}
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-md border shrink-0 ${
                            isBonus
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {isBonus ? `+${pts.toFixed(1)}` : `-${pts.toFixed(1)}`} pts
                        </span>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tpl)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(tpl.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onCustomizeApply(tpl)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all cursor-pointer"
                            title="Tune points/reason before adding"
                          >
                            <Sliders className="size-3" />
                            <span>Customize</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onQuickApply(tpl)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-xs transition-all cursor-pointer active:scale-95 ${
                              isBonus
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                            }`}
                            title={`Instant assign to ${activeStudentName || 'candidate'}`}
                          >
                            <Zap className="size-3 fill-current" />
                            <span>Apply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer Tip */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <HelpCircle className="size-3 text-amber-500" />
                <span>Tip: Drag any card directly over candidate</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE OR EDIT TEMPLATE                                            */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`size-8 rounded-xl flex items-center justify-center ${
                    formType === 'bonus'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formType === 'bonus' ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <ShieldAlert className="size-4" />
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Template Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('penalty')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === 'penalty'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <ShieldAlert className="size-3.5" />
                    <span>Clinical Deduction (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('bonus')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === 'bonus'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Merit Bonus (+)</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Template Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Sterile Field Contamination"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              {/* Points Value */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Points ({formType === 'penalty' ? 'Deduction' : 'Addition'})
                </label>
                <div className="flex items-center gap-2">
                  {[0.5, 1.0, 1.5, 2.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormValue(String(val))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        parseFloat(formValue) === val
                          ? formType === 'bonus'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {formType === 'penalty' ? `-${val}` : `+${val}`}
                    </button>
                  ))}
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="20"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-20 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Default Note / Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Default Remark / Note
                </label>
                <textarea
                  rows={2}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Clinical reason or guidelines for applying this template..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                    formType === 'bonus'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  {submittingForm && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{editingTemplate ? 'Update Template' : 'Save Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
