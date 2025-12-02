export type User = {
  id: number
  email: string
  full_name: string | null
  gender: string | null
  date_of_birth: string | null
  height_cm: number | null
  weight_kg: number | null
  goal: string | null
  membership_status: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}
