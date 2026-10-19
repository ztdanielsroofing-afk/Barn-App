export type Role = 'owner' | 'head_trainer' | 'trainer' | 'client';

export interface Barn {
  id: string;
  name: string;
  brand_color: string | null;
  phone: string | null;
  email: string | null;
  venmo: string | null;
  paypal: string | null;
  cashapp: string | null;
  head_can_edit_billing: boolean;
  head_can_edit_staff?: boolean;
  arena_open?: string | null;
  arena_close?: string | null;
  arena_days?: Record<string, boolean> | null;
  arena_slot_min?: number | null;
  created_at?: string;
}

export interface ArenaBooking {
  id: string;
  barn_id: string;
  family_id: string | null;
  rider_name: string | null;
  date: string;
  start_label: string;
  status: string;   // 'requested' | 'approved' | 'denied'
  created_at?: string;
}

export interface AppUser {
  id: string;
  auth_id: string;
  barn_id: string;
  role: Role;
  full_name: string;
  email: string;
  family_id: string | null;
  phone?: string | null;
  pay_type?: string | null;   // 'per_lesson' | 'hourly' | 'percent' | 'manual'
  pay_rate?: number | null;
  created_at?: string;
}

export interface Family {
  id: string;
  barn_id: string;
  family_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  home_address: string | null;
  emergency_contact: string | null;
  autopay: boolean;
  payment_method: string | null;
  status: string;
  balance: number;
  onboarded?: boolean;
  billing_mode?: string | null;   // 'per_lesson' on = auto-charge lessons
  monthly_fee?: number | null;
  board_fee?: number | null;
  billing_day?: number | null;     // day of month (1–28) monthly fee + board are charged

  created_at?: string;
}

export interface Charge {
  id: string;
  barn_id: string;
  family_id: string | null;
  label: string | null;
  amount: number;
  lesson_id: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  barn_id: string;
  trainer_id: string;
  amount: number;
  note: string | null;
  paid_on?: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  barn_id: string;
  family_id: string | null;
  full_name: string;
  age: number | null;
  flat_level: string | null;
  jump_level: string | null;
  dressage_level: string | null;
  trainer_note: string | null;
  is_self?: boolean;
  relationship?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  created_at?: string;
}

export interface CriticalNote { text: string; by: string; }
export interface Vaccine { name: string; due: string; soon?: boolean; }

export interface Horse {
  id: string;
  barn_id: string;
  name: string;
  breed: string | null;
  age: string | null;
  barn_owned: boolean;
  owner_name: string | null;
  owner_family_id: string | null;
  vaccines: Vaccine[] | null;
  farrier_last: string | null;
  farrier_next: string | null;
  farrier_interval: string | null;
  critical_notes: CriticalNote[] | null;
  em_vet: string | null;
  em_owner_phone: string | null;
  em_medical: string | null;
  em_handling: string | null;
  feeding: string | null;
  care_level: string;
  next_care_key: string | null;
  tint: string | null;
  created_at?: string;
}

export interface Lesson {
  id: string;
  barn_id: string;
  starts_at: string;
  time_label: string | null;
  rider_name: string | null;
  horse_name: string | null;
  lesson_type: string;
  status: string;
  notes: string | null;
  family_id?: string | null;
  trainer_id?: string | null;
  trainer_name?: string | null;
  fee?: number | null;
  series_id?: string | null;
  duration_min?: number | null;
  participants?: { name: string; family_id: string | null }[] | null;
  work_types?: string[] | null;
}

export interface TrainingSession {
  id: string;
  barn_id: string;
  horse_id: string;
  trainer_id: string | null;
  trainer_name: string | null;
  date: string | null;
  work_types: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  barn_id: string;
  family_id: string | null;
  period: string | null;
  total: number;
  due: number;
  status: string;
  line_items?: { label: string; amount: number }[] | null;
  created_at?: string;
}

export interface Payment {
  id: string;
  barn_id: string;
  family_id: string | null;
  amount: number;
  method: string | null;
  note: string | null;
  created_at?: string;
}

export interface DocRow {
  id: string;
  barn_id: string;
  family_id: string | null;
  title: string;
  kind: string | null;
  status: string;
  signed_at: string | null;
  created_at?: string;
}

export interface TaskRow {
  id: string;
  barn_id: string;
  label: string;
  task_type: string | null;
  horse_name: string | null;
  assignee_name: string | null;
  assignee_id: string | null;
  time_label: string | null;
  done: boolean;
  done_at: string | null;
  created_at?: string;
}

export interface Show {
  id: string;
  barn_id: string;
  name: string;
  date_label: string | null;
  venue: string | null;
  trailer_cap: number;
  reserved: number;
  fee: number;
  deadline: string | null;
  haul_est: string | null;
  note: string | null;
  bring_list: string[] | null;
  trainer_name?: string | null;
  created_at?: string;
}

export interface BarnDocument {
  id: string;
  barn_id: string;
  title: string;
  body: string | null;
  required: boolean;
  active: boolean;
  created_at?: string;
}

export interface Signature {
  id: string;
  barn_id: string;
  document_id: string;
  family_id: string | null;
  signer_name: string | null;
  method: string | null;
  signature_data: string | null;
  signed_at: string;
}

export interface AppNotification {
  id: string;
  barn_id: string;
  audience: string | null;
  family_id: string | null;
  title: string;
  body: string | null;
  kind: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  barn_id: string;
  active: boolean;
  category: string;
  title: string;
  detail: string | null;
  price: number | null;
  contact: string | null;
  created_at?: string;
}
