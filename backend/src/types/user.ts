export interface User {
  id: number;
  email: string;
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  membership_status: string | null;
  is_admin: boolean;
  password_hash?: string; // never send this in responses
  created_at: string; // ISO string
  updated_at: string; // ISO string
}
