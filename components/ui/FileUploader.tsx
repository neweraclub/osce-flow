'use client'

import React, { useState, useRef } from 'react'
import { CheckCircle2, FileText, UploadCloud, X } from 'lucide-react'

export interface FileUploaderProps {
  accept?: string // e.g. ".csv, .pdf, .xlsx"
  maxSizeMB?: number // e.g. 10
  onFileSelect?: (file: File | null) => void
  label?: string
  description?: string
  className?: string
}

export function FileUploader({
  accept = '.csv, .pdf, .xlsx',
  maxSizeMB = 10,
  onFileSelect,
  label = 'Clinical Document & Roster Uploader',
  description = 'Drag & drop student CSV roster or station PDF guidelines (max 10MB)',
  className = '',
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    setError('')
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds the ${maxSizeMB}MB limit.`)
      return false
    }
    return true
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (validateFile(file)) {
      setSelectedFile(file)
      onFileSelect?.(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
    onFileSelect?.(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-sky-500/50 bg-slate-50/50 dark:bg-slate-800/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-sm">
              <UploadCloud className="size-6 animate-bounce" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">{description}</p>
          </div>
        </div>
      ) : (
        /* Selected File Preview State */
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {selectedFile.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatFileSize(selectedFile.size)} • Ready for processing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-900/50">
              <CheckCircle2 className="size-3" />
              Validated
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Remove File"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-500 mt-1.5">{error}</p>}
    </div>
  )
}
