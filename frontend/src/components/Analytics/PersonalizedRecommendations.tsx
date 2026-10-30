
import { useEffect, useState } from 'react'
import {
  getPersonalizedRecommendations,
  submitRecommendationFeedback,
  type PersonalizedRecommendationsResponse,
  type RecommendationFeedbackType,
} from '../../Services/analytics'

type FeedbackState = {
  type: RecommendationFeedbackType
  message: string
}

export default function PersonalizedRecommendations() {
  const [data, setData] =
    useState<PersonalizedRecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [feedbackErrors, setFeedbackErrors] = useState<Record<string, string>>(
    {},
  )

  const loadRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getPersonalizedRecommendations()
      setData(response)
    } catch {
      setError('Unable to load personalized recommendations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRecommendations()
  }, [])

  const factorLabels: Record<string, string> = {
    workload: 'Pending workload',
    work_duration: 'Work duration',
    interruptions: 'Interruptions',
    insufficient_breaks: 'Insufficient breaks',
    general: 'Overall routine',
  }

  const submitFeedback = async (
    factor: string,
    title: string,
    type: RecommendationFeedbackType,
  ) => {
    const key = `${factor}::${title}`

    setSubmitting((previous) => ({ ...previous, [key]: true }))
    setFeedbackErrors((previous) => ({ ...previous, [key]: '' }))

    try {
      await submitRecommendationFeedback({
        recommendation_factor: factor,
        recommendation_title: title,
        feedback_type: type,
      })

      const messages: Record<RecommendationFeedbackType, string> = {
        helpful: 'Thanks! Your feedback has been saved.',
        not_helpful: 'Thanks. Your feedback has been saved.',
        will_try: 'Great! Your response has been saved.',
      }

      setFeedback((previous) => ({
        ...previous,
        [key]: { type, message: messages[type] },
      }))
    } catch {
      setFeedbackErrors((previous) => ({
        ...previous,
        [key]: 'Could not save feedback. Please try again.',
      }))
    } finally {
      setSubmitting((previous) => ({ ...previous, [key]: false }))
    }
  }

  if (loading) {
    return (
      <section className="mb-card p-6">
        <p className="text-sm text-ink-2">
          Generating personalized recommendations...
        </p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="mb-card p-6">
        <p role="alert" className="text-sm text-danger">
          {error || 'No recommendation data available.'}
        </p>
        <button
          type="button"
          onClick={() => void loadRecommendations()}
          className="mb-btn mt-3"
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <section className="mb-card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="mb-title">
          Personalized recommendations
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-2">
          Suggestions based on your recorded workload and work patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-tray-2 p-4">
          <p className="text-sm text-ink-2">Current estimated score</p>
          <p className="mt-2 text-2xl font-medium text-ink">
            {data.fatigue_score.toFixed(2)} / 100
          </p>
        </div>

        <div className="rounded-xl bg-tray-2 p-4">
          <p className="text-sm text-ink-2">Estimated level</p>
          <p className="mt-2 text-2xl font-medium capitalize text-ink">
            {data.fatigue_level}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {data.recommendations.map((recommendation) => {
          const key = `${recommendation.factor}::${recommendation.title}`
          const savedFeedback = feedback[key]
          const isSubmitting = submitting[key] ?? false

          return (
            <article
              key={`${recommendation.factor}-${recommendation.priority}`}
              className="rounded-xl border border-line bg-tray-2 p-4"
            >
              <div className="flex items-start gap-3">
                <div className={`mb-chip ${['mb-chip--pink', 'mb-chip--olive', 'mb-chip--blue', 'mb-chip--violet'][(Number(recommendation.priority) - 1) % 4] ?? ''} h-7 w-7 shrink-0 justify-center !p-0 !text-sm`}>
                  {recommendation.priority}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mt-0.5 font-medium text-ink">
                    {recommendation.title}
                  </h3>

                  <span className="mb-chip mt-2 capitalize">
                    {factorLabels[recommendation.factor] ??
                      recommendation.factor.replace(/_/g, ' ')}
                  </span>

                  <p className="mt-2 text-sm leading-6 text-ink-2">
                    {recommendation.message}
                  </p>

                  {recommendation.weighted_contribution !== null && (
                    <p className="mt-3 text-xs text-ink-2">
                      Weighted contribution:{' '}
                      {recommendation.weighted_contribution.toFixed(2)} points
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-ink-2">
                      Was this recommendation useful?
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['helpful', 'Helpful'],
                          ['not_helpful', 'Not helpful'],
                          ['will_try', "I'll try this"],
                        ] as const
                      ).map(([type, label]) => (
                        <button
                          key={type}
                          type="button"
                          disabled={isSubmitting || Boolean(savedFeedback)}
                          onClick={() =>
                            void submitFeedback(
                              recommendation.factor,
                              recommendation.title,
                              type,
                            )
                          }
                          aria-pressed={savedFeedback?.type === type}
                          className={`${savedFeedback?.type === type ? 'mb-btn' : 'mb-btn-ghost'} mb-btn-sm`}
                        >
                          {isSubmitting && savedFeedback?.type !== type
                            ? 'Saving...'
                            : label}
                        </button>
                      ))}
                    </div>

                    {savedFeedback && (
                      <p
                        role="status"
                        className="mt-2 text-xs text-blue-ink"
                      >
                        {savedFeedback.message}
                      </p>
                    )}

                    {feedbackErrors[key] && (
                      <p role="alert" className="mt-2 text-xs text-danger">
                        {feedbackErrors[key]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-ink-3">
        {data.disclaimer}
      </p>

      <button
        type="button"
        onClick={() => void loadRecommendations()}
        className="mb-btn-ghost"
      >
        Refresh recommendations
      </button>
    </section>
  )
}
