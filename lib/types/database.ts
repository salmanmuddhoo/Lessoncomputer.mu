export type UserRole = 'admin' | 'student'
export type ContentType = 'video' | 'live_class'
export type PurchaseStatus = 'pending' | 'completed' | 'refunded'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      grades: {
        Row: Grade
        Insert: Omit<Grade, 'id' | 'created_at'>
        Update: Partial<Omit<Grade, 'id' | 'created_at'>>
      }
      chapters: {
        Row: Chapter
        Insert: Omit<Chapter, 'id' | 'created_at'>
        Update: Partial<Omit<Chapter, 'id' | 'created_at'>>
      }
      videos: {
        Row: Video
        Insert: Omit<Video, 'id' | 'created_at'>
        Update: Partial<Omit<Video, 'id' | 'created_at'>>
      }
      live_classes: {
        Row: LiveClass
        Insert: Omit<LiveClass, 'id' | 'created_at'>
        Update: Partial<Omit<LiveClass, 'id' | 'created_at'>>
      }
      purchases: {
        Row: Purchase
        Insert: Omit<Purchase, 'id' | 'created_at'>
        Update: Partial<Omit<Purchase, 'id' | 'created_at'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at'>
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>
      }
      subscription_packages: {
        Row: SubscriptionPackage
        Insert: Omit<SubscriptionPackage, 'id' | 'created_at'>
        Update: Partial<Omit<SubscriptionPackage, 'id' | 'created_at'>>
      }
      subscription_package_chapters: {
        Row: { package_id: string; chapter_id: string }
        Insert: { package_id: string; chapter_id: string }
        Update: { package_id?: string; chapter_id?: string }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  grade_id: string | null
  created_at: string
  grade?: Grade
}

export interface Grade {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  image_url: string | null
  order_index: number
  is_active: boolean
  created_at: string
}

export interface Chapter {
  id: string
  grade_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
  grade?: Grade
}

export interface Video {
  id: string
  title: string
  description: string | null
  grade_id: string
  chapter_id: string | null
  streamable_url: string
  thumbnail_url: string | null
  price: number
  is_free: boolean
  is_demo: boolean
  duration_minutes: number | null
  is_published: boolean
  created_by: string
  created_at: string
  grade?: Grade
  chapter?: Chapter
}

export interface LiveClass {
  id: string
  title: string
  description: string | null
  grade_id: string
  package_id: string | null
  streamable_replay_url: string | null
  meet_url: string | null
  scheduled_at: string
  price: number
  is_subscription_only: boolean
  max_students: number | null
  is_published: boolean
  is_recurring: boolean
  recurrence_day_of_week: number | null
  end_time: string | null
  created_by: string
  created_at: string
  grade?: Grade
}

export interface Purchase {
  id: string
  student_id: string
  video_id: string
  amount: number
  status: PurchaseStatus
  created_at: string
  video?: Video
}

export interface Subscription {
  id: string
  student_id: string
  grade_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  starts_at: string
  ends_at: string
  created_at: string
  grade?: Grade
}

export interface SubscriptionPackage {
  id: string
  name: string
  description: string | null
  grade_id: string
  price: number
  month: number
  year: number
  is_active: boolean
  created_by: string | null
  created_at: string
  grade?: Grade
  chapters?: Chapter[]
}

export interface Document {
  id: string
  title: string
  description: string | null
  grade_id: string
  chapter_id: string | null
  file_url: string
  file_name: string | null
  is_published: boolean
  created_by: string
  created_at: string
  grade?: Grade
  chapter?: Chapter
}

export interface StudentSubscription {
  id: string
  student_id: string
  package_id: string
  is_recurring: boolean
  status: 'active' | 'cancelled'
  purchased_at: string
  created_by: string | null
  created_at: string
  package?: SubscriptionPackage
}
