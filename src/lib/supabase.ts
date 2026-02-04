import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types
export type UserRole = 'admin' | 'technician'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  description?: string
  has_machines: boolean
  color: string
  is_active: boolean
}

export interface Machine {
  id: number
  name: string
  category_id: number
  description?: string
  is_active: boolean
}

export interface Reagent {
  id: number
  name: string
  category_id: number
  machine_id?: number
  unit: string
  current_stock: number
  minimum_stock: number
  storage_condition: string
  expiry_date?: string
  lot_number?: string
  remarks?: string
  is_active: boolean
  created_at: string
  // Joined
  category_name?: string
  machine_name?: string
}

export interface StockTransaction {
  id: number
  reagent_id: number
  user_id: string
  transaction_type: 'withdraw' | 'add'
  quantity: number
  previous_stock: number
  new_stock: number
  reason?: string
  created_at: string
  // Joined
  reagent_name?: string
  reagent_unit?: string
  user_name?: string
  category_name?: string
  machine_name?: string
}

export interface Notification {
  id: number
  user_id: string
  type: 'low_stock' | 'expiry' | 'system'
  title: string
  message: string
  reagent_id?: number
  is_read: boolean
  email_sent: boolean
  created_at: string
}
