"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Copy, Move } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface BulkOperationsProps {
  selectedItems: string[]
  onBulkDelete: () => void
  onBulkDuplicate: () => void
  onBulkMove?: () => void
  onSelectAll?: () => void
  totalItems: number
}

export default function BulkOperations({
  selectedItems,
  onBulkDelete,
  onBulkDuplicate,
  onBulkMove,
  onSelectAll,
  totalItems,
}: BulkOperationsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedCount = selectedItems.length
  const allSelected = selectedCount === totalItems && totalItems > 0

  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
        </span>
        {!allSelected && onSelectAll && (
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBulkDuplicate}>
          <Copy className="w-4 h-4 mr-2" /> Duplicate
        </Button>
        {onBulkMove && (
          <Button variant="outline" size="sm" onClick={onBulkMove}>
            <Move className="w-4 h-4 mr-2" /> Move
          </Button>
        )}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onBulkDelete()
                  setShowDeleteConfirm(false)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

