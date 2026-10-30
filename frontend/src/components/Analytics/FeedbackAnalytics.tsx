
import { useCallback, useEffect, useState } from 'react'
import {
  getFeedbackAnalytics,
  type FeedbackAnalyticsResponse,
} from '../../Services/analytics'

export default function FeedbackAnalytics() {
  const [data, setData] = useState<FeedbackAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getFeedbackAnalytics()
      setData(response)
    } catch {
      setError('Unable to load feedback analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <section className="mb-card p-6">
        <p className="text-sm text-ink-2">
          Loading feedback analytics...
        </p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="mb-card p-6">
        <p role="alert" className="text-sm text-danger">
          {error || 'No feedback analytics available.'}
        </p>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mb-btn mt-3"
        >
          Try again
        </button>
      </section>
    )
  }

  const metrics = [
    {
      label: 'Total responses',
      value: data.total_feedback,
    },
    {
      label: 'Helpful',
      value: data.helpful_count,
    },
    {
      label: 'Not helpful',
      value: data.not_helpful_count,
    },
    {
      label: "I'll try this",
      value: data.will_try_count,
    },
  ]

  return (
    <section className="mb-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-title">
            Recommendation feedback analytics
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-2">
            See how you have responded to your recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mb-btn-ghost mb-btn-sm"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-tray-2 p-4">
            <p className="text-sm text-ink-2">{metric.label}</p>
            <p className="mt-2 text-2xl font-medium text-ink">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-tray-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-2">
              Share of feedback marked helpful
            </p>
            <p className="mt-2 text-3xl font-medium text-ink">
              {data.helpfulness_percentage.toFixed(2)}%
            </p>
          </div>
          <div className="mb-chip mb-chip--blue !px-3 !py-1.5 !text-sm">
            {data.total_feedback} responses
          </div>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-tray"
          role="progressbar"
          aria-label="Share of feedback marked helpful"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.helpfulness_percentage}
        >
          <div
            className="h-full rounded-full bg-blue transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, data.helpfulness_percentage))}%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-ink">
          Feedback by recommendation
        </h3>

        {data.recommendation_breakdown.length === 0 ? (
          <p className="rounded-xl bg-tray-2 p-4 text-sm text-ink-2">
            No feedback submitted yet. Respond to a recommendation to see
            your results here.
          </p>
        ) : (
          data.recommendation_breakdown.map((item) => (
            <article
              key={`${item.factor}::${item.title}`}
              className="rounded-xl border border-line bg-tray-2 p-4"
            >
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-1 text-xs capitalize text-ink-2">
                {item.factor.replace(/_/g, ' ')}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <p className="text-sm text-ink-2">
                  Total: <strong>{item.total}</strong>
                </p>
                <p className="text-sm text-blue-ink">
                  Helpful: <strong>{item.helpful}</strong>
                </p>
                <p className="text-sm text-danger">
                  Not helpful: <strong>{item.not_helpful}</strong>
                </p>
                <p className="text-sm text-ink-2">
                  Will try: <strong>{item.will_try}</strong>
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      <p className="text-xs leading-5 text-ink-3">{data.note}</p>
    </section>
  )
}
