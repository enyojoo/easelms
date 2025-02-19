"use client"

import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import type { User } from "@supabase/supabase-js"

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { supabase, user }
}

