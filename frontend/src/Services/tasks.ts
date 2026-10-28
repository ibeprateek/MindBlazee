
import { apiRequest } from './api'

export interface Task {
  id: number
  user_id: number
  title: string
  description: string | null
  priority: string
  status: string
  estimated_minutes: number | null
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  title: string
  description?: string | null
  priority?: string
  status?: string
  estimated_minutes?: number | null
  due_at?: string | null
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>

export function getTasks(): Promise<Task[]> {
  return apiRequest<Task[]>('/tasks/')
}

export function createTask(data: CreateTaskRequest): Promise<Task> {
  return apiRequest<Task>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTask(
  taskId: number,
  data: UpdateTaskRequest,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteTask(taskId: number): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, {
    method: 'DELETE',
  })
}
