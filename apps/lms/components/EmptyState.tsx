"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          {Icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <Icon className="h-12 w-12 text-muted-foreground mb-4 opacity-60" />
            </motion.div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">{description}</p>}
          {actionLabel && onAction && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={onAction}>{actionLabel}</Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

