
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
      <section className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-[#858c85]">
          Generating personalized recommendations...
        </p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="glass-panel rounded-2xl p-6">
        <p role="alert" className="text-sm text-red-700">
          {error || 'No recommendation data available.'}
        </p>
        <button
          type="button"
          onClick={() => void loadRecommendations()}
          className="mt-3 rounded-xl bg-[#397858] px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <section className="glass-panel space-y-5 rounded-2xl p-5 sm:p-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">
          YOUR NEXT STEPS
        </p>
        <h2 className="font-[Manrope] text-xl font-bold">
          Personalized recommendations
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#858c85]">
          Suggestions based on your recorded workload and work patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/60 p-4">
          <p className="text-sm text-[#858c85]">Current estimated score</p>
          <p className="mt-2 text-2xl font-bold text-[#315d3d]">
            {data.fatigue_score.toFixed(2)} / 100
          </p>
        </div>

        <div className="rounded-xl bg-white/60 p-4">
          <p className="text-sm text-[#858c85]">Estimated level</p>
          <p className="mt-2 text-2xl font-bold capitalize text-[#315d3d]">
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
              className="rounded-xl border border-white/80 bg-white/60 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf5ed] font-semibold text-[#397858]">
                  {recommendation.priority}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#5b8a67]">
                    {factorLabels[recommendation.factor] ??
                      recommendation.factor.replace(/_/g, ' ')}
                  </p>

                  <h3 className="mt-1 font-semibold text-[#263b2b]">
                    {recommendation.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#737d74]">
                    {recommendation.message}
                  </p>

                  {recommendation.weighted_contribution !== null && (
                    <p className="mt-3 text-xs text-[#858c85]">
                      Weighted contribution:{' '}
                      {recommendation.weighted_contribution.toFixed(2)} points
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-[#737d74]">
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
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            savedFeedback?.type === type
                              ? 'border-[#397858] bg-[#edf5ed] text-[#315d3d]'
                              : 'border-[#dce8dc] text-[#397858] hover:bg-[#edf5ed]'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
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
                        className="mt-2 text-xs text-[#397858]"
                      >
                        {savedFeedback.message}
                      </p>
                    )}

                    {feedbackErrors[key] && (
                      <p role="alert" className="mt-2 text-xs text-red-700">
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

      <p className="text-xs leading-5 text-[#929991]">
        {data.disclaimer}
      </p>

      <button
        type="button"
        onClick={() => void loadRecommendations()}
        className="rounded-xl border border-[#dce8dc] px-4 py-2.5 text-sm font-semibold text-[#397858] hover:bg-[#edf5ed]"
      >
        Refresh recommendations
      </button>
    </section>
  )
}
