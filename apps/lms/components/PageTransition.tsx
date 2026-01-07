"use client"

import type React from "react"

import { motion } from "framer-motion"

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}
