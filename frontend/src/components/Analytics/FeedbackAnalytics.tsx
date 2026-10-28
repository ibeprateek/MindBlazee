
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
      <section className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-[#858c85]">
          Loading feedback analytics...
        </p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="glass-panel rounded-2xl p-6">
        <p role="alert" className="text-sm text-red-700">
          {error || 'No feedback analytics available.'}
        </p>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mt-3 rounded-xl bg-[#397858] px-4 py-2 text-sm font-semibold text-white"
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
    <section className="glass-panel space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">
            USER FEEDBACK
          </p>
          <h2 className="font-[Manrope] text-xl font-bold">
            Recommendation feedback analytics
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#858c85]">
            See how you have responded to your recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="rounded-xl border border-[#dce8dc] px-3 py-2 text-sm font-semibold text-[#397858] hover:bg-[#edf5ed]"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-white/60 p-4">
            <p className="text-sm text-[#858c85]">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#315d3d]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#858c85]">
              Share of feedback marked helpful
            </p>
            <p className="mt-2 text-3xl font-bold text-[#315d3d]">
              {data.helpfulness_percentage.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl bg-[#edf5ed] px-3 py-2 text-sm font-semibold text-[#397858]">
            {data.total_feedback} responses
          </div>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#e4eae3]"
          role="progressbar"
          aria-label="Share of feedback marked helpful"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.helpfulness_percentage}
        >
          <div
            className="h-full rounded-full bg-[#397858] transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, data.helpfulness_percentage))}%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-[#263b2b]">
          Feedback by recommendation
        </h3>

        {data.recommendation_breakdown.length === 0 ? (
          <p className="rounded-xl bg-white/60 p-4 text-sm text-[#858c85]">
            No feedback submitted yet. Respond to a recommendation to see
            your results here.
          </p>
        ) : (
          data.recommendation_breakdown.map((item) => (
            <article
              key={`${item.factor}::${item.title}`}
              className="rounded-xl border border-white/80 bg-white/60 p-4"
            >
              <p className="font-semibold text-[#263b2b]">{item.title}</p>
              <p className="mt-1 text-xs capitalize text-[#858c85]">
                {item.factor.replace(/_/g, ' ')}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <p className="text-sm text-[#737d74]">
                  Total: <strong>{item.total}</strong>
                </p>
                <p className="text-sm text-[#397858]">
                  Helpful: <strong>{item.helpful}</strong>
                </p>
                <p className="text-sm text-red-700">
                  Not helpful: <strong>{item.not_helpful}</strong>
                </p>
                <p className="text-sm text-[#737d74]">
                  Will try: <strong>{item.will_try}</strong>
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      <p className="text-xs leading-5 text-[#929991]">{data.note}</p>
    </section>
  )
}
