export type Database = {
  public: {
    Tables: {
      volunteers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['volunteers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['volunteers']['Insert']>
        Relationships: []
      }
      visits: {
        Row: {
          id: string
          volunteer_id: string
          visit_date: string
          visit_time: string
          is_recurring: boolean
          recurrence_day: number | null
          bringing_groceries: boolean
          bringing_meal: boolean
          notes: string | null
          cancelled: boolean
          cancelled_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
        Relationships: []
      }
      food_items: {
        Row: {
          id: string
          visit_id: string
          item_name: string
          quantity: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['food_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['food_items']['Insert']>
        Relationships: []
      }
      pantry_items: {
        Row: {
          id: string
          item_name: string
          quantity: string | null
          location: 'pantry' | 'fridge' | 'freezer'
          last_updated: string
          added_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['pantry_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['pantry_items']['Insert']>
        Relationships: []
      }
      exie_requests: {
        Row: {
          id: string
          message: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['exie_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['exie_requests']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// Convenience types
export type Volunteer = Database['public']['Tables']['volunteers']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']
export type FoodItem = Database['public']['Tables']['food_items']['Row']
export type PantryItem = Database['public']['Tables']['pantry_items']['Row']

export type VisitWithDetails = Visit & {
  volunteer: Volunteer
  food_items: FoodItem[]
}
