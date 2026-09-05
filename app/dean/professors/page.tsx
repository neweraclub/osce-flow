'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export interface ProfessorRecord {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  created_at: string
}

export default function ProfessorsPage() {
  const { showSuccess, showError } = useToast()

  const [professors, setProfessors] = useState<ProfessorRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // In-flight deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProf, setEditingProf] = useState<ProfessorRecord | null>(null)
  const [deletingProf, setDeletingProf] = useState<ProfessorRecord | null>(null)

  // Add Form states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit Form states
  const [editInitialData, setEditInitialData] = useState<{
    first_name: string
    last_name: string
    email: string
    is_active: boolean
  } | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editPassword, setEditPassword] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false)
  const [editFormError, setEditFormError] = useState('')

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false)
        setEditingProf(null)
        setDeletingProf(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchProfessors = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/dean/professors')
      const json = await res.json()

      if (res.ok && json.success) {
        setProfessors(json.professors || [])
      } else {
        showError(json.error || 'Failed to fetch professors roster.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfessors()
  }, [])

  const filteredProfessors = professors.filter((p) => {
    const term = search.toLowerCase()
    return (
      p.first_name.toLowerCase().includes(term) ||
      p.last_name.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term)
    )
  })

  // Quick Account State Toggle in Table Row
  const handleToggleStatus = async (p: ProfessorRecord) => {
    const newStatus = !p.is_active
    setTogglingId(p.id)

    // Optimistic UI update
    setProfessors((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, is_active: newStatus } : item))
    )

    try {
      const res = await fetch('/api/dean/professors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          user_id: p.user_id,
          is_active: newStatus,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess(`Account ${newStatus ? 'activated' : 'suspended'} for Prof. ${p.first_name} ${p.last_name}.`)
      } else {
        // Revert optimistic update
        setProfessors((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, is_active: p.is_active } : item))
        )
        showError(json.error || 'Failed to update account state.')
      }
    } catch {
      // Revert optimistic update
      setProfessors((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: p.is_active } : item))
      )
      showError('Network error updating account state.')
    } finally {
      setTogglingId(null)
    }
  }

  // Open Add Modal
  const openAddModal = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('ProfEcos2026!')
    setShowAddPassword(false)
    setFormError('')
    setIsAddOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (p: ProfessorRecord) => {
    setEditingProf(p)
    setEditInitialData({
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      is_active: p.is_active,
    })
    setEditFirstName(p.first_name)
    setEditLastName(p.last_name)
    setEditEmail(p.email)
    setEditIsActive(p.is_active)
    setEditPassword('')
    setShowEditPassword(false)
    setIsPasswordResetOpen(false)
    setEditFormError('')
  }

  // Dirty State Checker for Edit Form
  const isEditDirty = useMemo(() => {
    if (!editInitialData) return false
    const nameChanged = editFirstName.trim() !== editInitialData.first_name
    const lastChanged = editLastName.trim() !== editInitialData.last_name
    const emailChanged = editEmail.trim().toLowerCase() !== editInitialData.email.toLowerCase()
    const statusChanged = editIsActive !== editInitialData.is_active
    const passwordChanged = editPassword.trim().length > 0
    return nameChanged || lastChanged || emailChanged || statusChanged || passwordChanged
  }, [editInitialData, editFirstName, editLastName, editEmail, editIsActive, editPassword])

  // Handle Add Submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('First name, last name, and institutional email are required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password: password || 'ProfEcos2026!',
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Professor registered successfully.')
        setIsAddOpen(false)
        fetchProfessors(true)
      } else {
        const msg = json.error || 'Failed to register professor.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving professor.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Edit Submission (Dual-Table update)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProf) return

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setEditFormError('First name, last name, and institutional email are required.')
      return
    }

    setSubmitting(true)
    setEditFormError('')

    try {
      const payload: any = {
        id: editingProf.id,
        user_id: editingProf.user_id,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim().toLowerCase(),
        is_active: editIsActive,
      }

      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim()
      }

      const res = await fetch('/api/dean/professors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Professor account updated successfully.')
        setEditingProf(null)
        setProfessors((prev) =>
          prev.map((item) =>
            item.id === editingProf.id
              ? {
                  ...item,
                  first_name: editFirstName.trim(),
                  last_name: editLastName.trim(),
                  email: editEmail.trim().toLowerCase(),
                  is_active: editIsActive,
                }
              : item
          )
        )
      } else {
        const msg = json.error || 'Failed to update professor.'
        setEditFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving changes.'
      setEditFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Deletion with In-Flight Row Loading Spinner
  const handleDeleteConfirm = async () => {
    if (!deletingProf) return
    const targetId = deletingProf.id
    const targetUserId = deletingProf.user_id

    // Close modal & mark row as deleting in-flight
    setDeletingProf(null)
    setDeletingId(targetId)

    try {
      const res = await fetch(`/api/dean/professors?id=${targetId}&user_id=${targetUserId}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setProfessors((prev) => prev.filter((p) => p.id !== targetId))
        showSuccess('Professor removed successfully.')
      } else {
        showError(json.error || 'Failed to remove professor. Please try again.')
      }
    } catch {
      showError('Failed to remove professor. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Professors & Invigilators Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Faculty examiner accounts authorized for OSCE station scoring and invigilation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProfessors(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
            title="Refresh records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus className="size-4" />
            Register Professor
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search professor name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Professors Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Professor Details</th>
                <th className="px-6 py-4">Institutional Email</th>
                <th className="px-6 py-4">Account State</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading professors roster...
                  </td>
                </tr>
              ) : filteredProfessors.length > 0 ? (
                filteredProfessors.map((p) => {
                  const isDeleting = deletingId === p.id
                  const isToggling = togglingId === p.id

                  return (
                    <tr
                      key={p.id}
                      className={`transition-all duration-200 ${
                        isDeleting
                          ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/50'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      {/* 1. Professor Details */}
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                            <Stethoscope className="size-5" />
                          </div>
                          <span className="truncate">Prof. {p.first_name} {p.last_name}</span>
                        </div>
                      </td>

                      {/* 2. Institutional Email */}
                      <td className="px-6 py-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {p.email}
                      </td>

                      {/* 3. Account State Toggle */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={p.is_active}
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(p)}
                            title={p.is_active ? 'Click to suspend account' : 'Click to activate account'}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 ${
                              p.is_active
                                ? 'bg-emerald-500'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                p.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              p.is_active
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {isToggling ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Loader2 className="size-3 animate-spin" />
                                Updating...
                              </span>
                            ) : p.is_active ? (
                              'Active'
                            ) : (
                              'Suspended'
                            )}
                          </span>
                        </div>
                      </td>

                      {/* 4. Actions: Edit + Delete */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
                            title="Edit Professor Details"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProf(p)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                            title="Remove Account"
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No professor accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT PROFESSOR MODAL (DUAL-TABLE UPDATE) */}
      {editingProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Professor & Invigilator</h3>
                  <p className="text-xs text-slate-500">Update account credentials and examiner authorizations.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProf(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="e.g. Karim"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="e.g. Benali"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="prof.benali@univ-alger.dz"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Account State Switch in Modal */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Account Status
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editIsActive
                      ? 'Active — Authorized for exam invigilation & scoring'
                      : 'Suspended — Access to scoring portals disabled'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editIsActive}
                  onClick={() => setEditIsActive((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    editIsActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Collapsible Password Reset Section */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordResetOpen((prev) => !prev)
                    if (isPasswordResetOpen) setEditPassword('')
                  }}
                  className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Key className="size-3.5 text-blue-500" />
                    Reset Account Password
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">
                    {isPasswordResetOpen ? 'Cancel' : 'Set New Password'}
                  </span>
                </button>

                {isPasswordResetOpen && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter new password to reset..."
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showEditPassword ? 'Hide password' : 'Show password'}
                      >
                        {showEditPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Leave blank to keep existing password intact.
                    </p>
                  </div>
                )}
              </div>

              {/* Dirty-checked Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProf(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isEditDirty || submitting}
                  className={`px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all ${
                    !isEditDirty || submitting
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer'
                  }`}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER PROFESSOR MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Professor</h3>
                  <p className="text-xs text-slate-500">Provision invigilator account for OSCE scoring.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Karim"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Benali"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prof.benali@univ-alger.dz"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showAddPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAddPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Professor Account?</h3>
                <p className="text-xs text-slate-500">Invigilator removal alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">Prof. {deletingProf.first_name} {deletingProf.last_name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingProf(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <span>Remove Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
