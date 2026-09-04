import { useState, useCallback } from 'react'

export function useTableSelection<T extends string = string>() {
  const [selectedIds, setSelectedIds] = useState<T[]>([])

  const isSelected = useCallback(
    (id: T) => selectedIds.includes(id),
    [selectedIds]
  )

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const toggleSelectAll = useCallback((allIds: T[]) => {
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.includes(id))
      if (allSelected) {
        return prev.filter((id) => !allIds.includes(id))
      }
      const newSelected = new Set([...prev, ...allIds])
      return Array.from(newSelected) as T[]
    })
  }, [])

  const isAllSelected = useCallback(
    (allIds: T[]) => allIds.length > 0 && allIds.every((id) => selectedIds.includes(id)),
    [selectedIds]
  )

  const isIndeterminate = useCallback(
    (allIds: T[]) => {
      const selectedCount = allIds.filter((id) => selectedIds.includes(id)).length
      return selectedCount > 0 && selectedCount < allIds.length
    },
    [selectedIds]
  )

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    isIndeterminate,
    clearSelection,
  }
}
