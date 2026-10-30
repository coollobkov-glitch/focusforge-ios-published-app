import { useState } from 'react'

// Multi-select-then-delete, shared by the Tasks and Habits lists.
//
// Rows used to carry their own delete button revealed on hover, which is
// unreachable on a touchscreen — and tapping it deleted immediately, with no
// confirmation. Instead, deleting is now an explicit mode: turn it on, tap the
// rows to mark them, then confirm once for the whole batch.
export default function useSelectionMode() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  // Second stage of the delete button, so a stray tap can't wipe a selection.
  const [isConfirming, setIsConfirming] = useState(false)

  const reset = () => {
    setIsSelecting(false)
    setSelectedIds([])
    setIsConfirming(false)
  }

  return {
    isSelecting,
    selectedIds,
    isConfirming,
    count: selectedIds.length,
    start: () => {
      setIsSelecting(true)
      setSelectedIds([])
      setIsConfirming(false)
    },
    cancel: reset,
    isSelected: (id) => selectedIds.includes(id),
    toggleSelected: (id) => {
      // Changing the selection invalidates a pending confirmation.
      setIsConfirming(false)
      setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
    },
    requestConfirm: () => setIsConfirming(true),
    // Runs `remove` for each selected id, then leaves the mode.
    confirmDelete: (remove) => {
      selectedIds.forEach(remove)
      reset()
    },
  }
}
