'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Edit2,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Plus,
  Power,
  RefreshCw,
  School,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Select, SelectOption } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'

export interface FacultyOption {
  id: string
  name: string
  hasDean: boolean
  currentDeanId?: string
}

export interface Dean {
  id: string
  first_name: string
  last_name: string
  email: string
  faculty_id: string
  faculty_name: string
  is_active: boolean
  created_at: string
}

export default function DeansPage() {
  const { showSuccess, showError } = useToast()

  const [deans, setDeans] = useState<Dean[]>([])
  const [facultiesList, setFacultiesList] = useState<FacultyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  // Modals state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false)
  const [editingDean, setEditingDean] = useState<Dean | null>(null)
  const [deletingDean, setDeletingDean] = useState<Dean | null>(null)

  // Form states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [formError, setFormError] = useState('')

  // Global Escape Key Listener for dismissing active modal windows
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProvisionOpen(false)
        setEditingDean(null)
        setDeletingDean(null)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Fetch live deans & faculties from database API
  const fetchDeansData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/superadmin/deans')
      const data = await res.json()

      if (res.ok && data.success) {
        setDeans(data.deans || [])
        setFacultiesList(data.faculties || [])
      } else {
        showError(data.error || 'Failed to fetch deans data.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDeansData()
  }, [])

  const filteredDeans = deans.filter(
    (d) =>
      d.first_name.toLowerCase().includes(search.toLowerCase()) ||
      d.last_name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.faculty_name.toLowerCase().includes(search.toLowerCase())
  )

  const openProvisionModal = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setTempPassword('DeanEcos2026!')
    setSelectedFacultyId('')
    setFormError('')
    setIsProvisionOpen(true)
  }

  const openEditModal = (dean: Dean) => {
    setEditingDean(dean)
    setFirstName(dean.first_name)
    setLastName(dean.last_name)
    setEmail(dean.email)
    setSelectedFacultyId(dean.faculty_id)
    setFormError('')
  }

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('First name, last name, and email are required.')
      return
    }
    if (!selectedFacultyId) {
      setFormError('Please select a vacant medical faculty.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/superadmin/deans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password: tempPassword || 'DeanEcos2026!',
          faculty_id: selectedFacultyId,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showSuccess('Dean account provisioned successfully.')
        setIsProvisionOpen(false)
        fetchDeansData(true)
      } else {
        const errorMsg = data.error || 'Failed to provision dean account.'
        setFormError(errorMsg)
        showError(errorMsg)
      }
    } catch {
      const errorMsg = 'Network error provisioning account.'
      setFormError(errorMsg)
      showError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDean) return

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/superadmin/deans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDean.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          faculty_id: selectedFacultyId,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showSuccess('Dean assignment updated.')
        setEditingDean(null)
        fetchDeansData(true)
      } else {
        const errorMsg = data.error || 'Failed to update dean record.'
        setFormError(errorMsg)
        showError(errorMsg)
      }
    } catch {
      const errorMsg = 'Network error updating record.'
      setFormError(errorMsg)
      showError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActiveStatus = async (dean: Dean) => {
    try {
      const res = await fetch('/api/superadmin/deans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dean.id,
          is_active: !dean.is_active,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showSuccess(dean.is_active ? 'Dean account deactivated.' : 'Dean account activated.')
        fetchDeansData(true)
      } else {
        showError(data.error || 'Failed to update status.')
      }
    } catch {
      showError('Network error communicating with server.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingDean) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/superadmin/deans?id=${deletingDean.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showSuccess('Dean account removed.')
        setDeletingDean(null)
        fetchDeansData(true)
      } else {
        showError(data.error || 'Failed to remove dean account.')
      }
    } catch {
      showError('Network error deleting dean account.')
    } finally {
      setSubmitting(false)
    }
  }

  // Convert real database faculties into custom Select options
  const facultyOptions: SelectOption[] = facultiesList.map((fac) => {
    const isCurrentDeanFaculty = editingDean && fac.id === editingDean.faculty_id
    const isDisabled = fac.hasDean && !isCurrentDeanFaculty

    return {
      value: fac.id,
      label: fac.name,
      subLabel: isCurrentDeanFaculty
        ? 'Current Assigned Faculty'
        : fac.hasDean
        ? 'Dean Assigned'
        : 'Vacant – Available',
      icon: School,
      badge: fac.hasDean
        ? { text: 'Assigned', variant: 'slate' }
        : { text: 'Vacant – Available', variant: 'success' },
      disabled: isDisabled,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            University Deans Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Provision dean credentials, assign medical faculties, and manage active institutional accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDeansData(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openProvisionModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus className="size-4" />
            Provision New Dean
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dean by name, email, or faculty..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {filteredDeans.length} of {deans.length} accounts
        </span>
      </div>

      {/* Deans Data Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Dean Name</th>
                <th className="px-6 py-4">Contact Email</th>
                <th className="px-6 py-4">Assigned Faculty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Provisioned</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading dean records...
                  </td>
                </tr>
              ) : filteredDeans.length > 0 ? (
                filteredDeans.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {d.first_name[0]}{d.last_name[0]}
                        </div>
                        <span>Prof. {d.first_name} {d.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                        <Mail className="size-3.5 text-slate-400 shrink-0" />
                        <span>{d.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <School className="size-3.5 text-blue-500 shrink-0" />
                        <span>{d.faculty_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActiveStatus(d)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-[11px] border transition-all ${
                          d.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/50'
                        }`}
                      >
                        <Power className="size-3" />
                        {d.is_active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{d.created_at}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="Edit / Reassign Dean"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeletingDean(d)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Revoke Account"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No provisioned deans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISION DEAN MODAL */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Provision Dean Account</h3>
                  <p className="text-xs text-slate-500">Assign an administrative dean to manage their medical faculty.</p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
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

            <form onSubmit={handleProvisionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ahmed"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Zekri"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="a.zekri@univ-alger.dz"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Temporary Access Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Assigned Faculty"
                  options={facultyOptions}
                  value={selectedFacultyId}
                  onChange={setSelectedFacultyId}
                  placeholder="Select vacant medical faculty..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / REASSIGN MODAL */}
      {editingDean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit / Reassign Dean</h3>
                  <p className="text-xs text-slate-500">Update credentials or reassign faculty.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDean(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Select
                  label="Assigned Faculty"
                  options={facultyOptions}
                  value={selectedFacultyId}
                  onChange={setSelectedFacultyId}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDean(null)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / REVOKE CONFIRMATION DIALOG */}
      {deletingDean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revoke Dean Account?</h3>
                <p className="text-xs text-slate-500">Account revocation confirmation.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to revoke access for <strong className="text-slate-900 dark:text-white">Prof. {deletingDean.first_name} {deletingDean.last_name}</strong> ({deletingDean.email})?
              This will remove the user account and unbind them from <strong className="text-slate-900 dark:text-white">{deletingDean.faculty_name}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingDean(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Revoke Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
