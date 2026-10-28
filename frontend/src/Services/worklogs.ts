import { apiRequest } from './api'

export interface WorkLog {
  id: number
  user_id: number
  task_id: number | null
  started_at: string
  ended_at: string | null
  break_minutes: number
  interruption_count: number
  notes: string | null
  created_at: string
  status: string
  actual_work_minutes: number | null
}

export interface StartWorkLogRequest {
  task_id?: number | null
  break_minutes?: number
  interruption_count?: number
  notes?: string | null
}

export interface FinishWorkLogRequest {
  break_minutes?: number
  interruption_count?: number
  notes?: string | null
}

// Start a work session
export function startWorkLog(
  data: StartWorkLogRequest = {},
): Promise<WorkLog> {
  return apiRequest<WorkLog>('/work-logs/start', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Finish an active work session
export function finishWorkLog(
  logId: number,
  data: FinishWorkLogRequest = {},
): Promise<WorkLog> {
  return apiRequest<WorkLog>(`/work-logs/${logId}/finish`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Retrieve work logs
export function getWorkLogs(): Promise<WorkLog[]> {
  return apiRequest<WorkLog[]>('/work-logs/')
}