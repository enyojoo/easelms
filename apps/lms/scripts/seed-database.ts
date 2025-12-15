/**
 * Database Seed Script
 * 
 * This script migrates mock data from the data/ directory to Supabase.
 * Run with: npx tsx scripts/seed-database.ts
 * 
 * Make sure to set up your .env.local file with Supabase credentials first.
 */

import { createClient } from '@supabase/supabase-js'
import { modules } from '../data/courses'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedDatabase() {
  console.log('Starting database seed...')

  try {
    // Note: Courses and other data should be created through the application
    // as they require proper user authentication and relationships

    console.log('Database seed completed!')
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

seedDatabase()

