
import { apiRequest } from './api'

export interface WorkloadAnalytics {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  estimated_pending_minutes: number
  actual_focus_minutes: number
  completion_rate_percent: number
}

export interface FatigueEstimate {
  [key: string]: unknown
}

export interface DailyActivity {
  date: string
  work_minutes: number
  break_minutes: number
  interruptions: number
  sessions: number
}

export interface DailyActivityResponse {
  period: string
  daily_activity: DailyActivity[]
}

export const getWorkloadAnalytics = () =>
  apiRequest<WorkloadAnalytics>('/analytics/workload')

export const getFatigueEstimate = () =>
  apiRequest<FatigueEstimate>('/analytics/fatigue')

export const getDailyActivity = () =>
  apiRequest<DailyActivityResponse>('/analytics/daily-activity')

export interface FatigueSimulationRequest {
  reduce_pending_minutes: number
  reduce_work_minutes: number
  reduce_interruptions: number
  add_break_minutes: number
}

export interface FatigueSimulationResponse {
  current_score: number
  projected_score: number
  score_difference: number
  current_level: string
  projected_level: string
  current_factors: Record<string, number>
  projected_factors: Record<string, number>
  current_weighted_contributions: Record<string, number>
  projected_weighted_contributions: Record<string, number>
  weights: Record<string, number>
  scenario_inputs: {
    pending_task_minutes: number
    work_minutes: number
    break_minutes: number
    interruption_count: number
  }
  recommendations: {
    factor: string
    title: string
    message: string
  }[]
  disclaimer: string
}

export const simulateFatigue = (
  payload: FatigueSimulationRequest,
) =>
  apiRequest<FatigueSimulationResponse>(
    '/analytics/fatigue/simulate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

export interface PersonalizedRecommendation {
  factor: string
  title: string
  message: string
  action: string
  factor_score: number | null
  weighted_contribution: number | null
  priority: number
}

export interface PersonalizedRecommendationsResponse {
  fatigue_score: number
  fatigue_level: string
  recommendations: PersonalizedRecommendation[]
  disclaimer: string
}

export const getPersonalizedRecommendations = () =>
  apiRequest<PersonalizedRecommendationsResponse>(
    '/analytics/recommendations',
  )


export type RecommendationFeedbackType =
  | "helpful"
  | "not_helpful"
  | "will_try";

export interface RecommendationFeedbackCreate {
  recommendation_factor: string;
  recommendation_title: string;
  feedback_type: RecommendationFeedbackType;
}

export interface RecommendationFeedbackResponse
  extends RecommendationFeedbackCreate {
  id: number;
  created_at: string;
}

export async function submitRecommendationFeedback(
  feedback: RecommendationFeedbackCreate,
): Promise<RecommendationFeedbackResponse> {
  return apiRequest<RecommendationFeedbackResponse>(
    "/recommendation-feedback/",
    {
      method: "POST",
      body: JSON.stringify(feedback),
    },
  );
}

export async function getMyRecommendationFeedback(): Promise<
  RecommendationFeedbackResponse[]
> {
  return apiRequest<RecommendationFeedbackResponse[]>(
    "/recommendation-feedback/",
  );
}


export interface RecommendationFeedbackBreakdown {
  factor: string
  title: string
  helpful: number
  not_helpful: number
  will_try: number
  total: number
}

export interface FeedbackAnalyticsResponse {
  total_feedback: number
  helpful_count: number
  not_helpful_count: number
  will_try_count: number
  helpfulness_percentage: number
  recommendation_breakdown: RecommendationFeedbackBreakdown[]
  note: string
}

export async function getFeedbackAnalytics(): Promise<FeedbackAnalyticsResponse> {
  return apiRequest<FeedbackAnalyticsResponse>(
    '/recommendation-feedback/analytics',
  )
}
