"use client"

import type React from "react"

import { motion } from "framer-motion"

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}
