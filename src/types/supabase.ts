export type UserRole = 'employee' | 'manager';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export interface Profile {
  id: string; // UUID from public.profiles
  user_id: string; // UUID from auth.users
  name: string;
  email: string;
  area?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  created_by?: string; // Profile ID
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  program_id?: string; // Program ID
  program_name: string;
  task_name: string;
  description?: string;
  estimated_hours?: number;
  assigned_to?: string; // Profile ID
  due_date?: string;
  status: TaskStatus;
  current_phase?: string;
  observations?: string;
  comments?: string;
  created_by?: string; // Profile ID
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string; // Task ID
  user_id: string; // Profile ID
  comment: string;
  created_at: string;
}