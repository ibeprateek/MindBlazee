
import { useEffect, useState } from 'react'
import {
  simulateFatigue,
  type FatigueSimulationResponse,
} from '../../Services/analytics'

export default function FatigueSimulator() {
  const [reducePending, setReducePending] = useState(60)
  const [reduceWork, setReduceWork] = useState(0)
  const [reduceInterruptions, setReduceInterruptions] = useState(2)
  const [addBreak, setAddBreak] = useState(5)

  const [result, setResult] =
    useState<FatigueSimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
const factorLabels: Record<string, string> = {
  workload: 'Pending workload',
  work_duration: 'Work duration',
  interruptions: 'Interruptions',
  insufficient_breaks: 'Insufficient breaks',
}

const factorDescriptions: Record<string, string> = {
  workload: 'Estimated workload remaining in pending tasks.',
  work_duration: 'Recorded work duration relative to the model’s eight-hour reference.',
  interruptions: 'Recorded interruptions relative to the model’s ten-interruption reference.',
  insufficient_breaks: 'Estimated break deficit relative to the model’s break-time assumption.',
}


  useEffect(() => {
    let cancelled = false

    const loadSimulation = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await simulateFatigue({
          reduce_pending_minutes: reducePending,
          reduce_work_minutes: reduceWork,
          reduce_interruptions: reduceInterruptions,
          add_break_minutes: addBreak,
        })

        if (!cancelled) setResult(data)
      } catch {
        if (!cancelled) {
          setError('Unable to calculate the scenario. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSimulation()

    return () => {
      cancelled = true
    }
  }, [reducePending, reduceWork, reduceInterruptions, addBreak])

  const sliders = [
    {
      label: 'Reduce pending workload',
      value: reducePending,
      min: 0,
      max: 480,
      step: 15,
      unit: 'minutes',
      setValue: setReducePending,
    },
    {
      label: 'Reduce work duration',
      value: reduceWork,
      min: 0,
      max: 480,
      step: 15,
      unit: 'minutes',
      setValue: setReduceWork,
    },
    {
      label: 'Reduce interruptions',
      value: reduceInterruptions,
      min: 0,
      max: 10,
      step: 1,
      unit: '',
      setValue: setReduceInterruptions,
    },
    {
      label: 'Add break time',
      value: addBreak,
      min: 0,
      max: 120,
      step: 5,
      unit: 'minutes',
      setValue: setAddBreak,
    },
  ]

  const levelColor = (level: string) => {
    if (level === 'low') return 'text-green-600'
    if (level === 'moderate') return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          What-If Fatigue Simulator
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Adjust your work patterns to explore how the estimated score changes.
        </p>
      </div>

      <div className="space-y-6">
        {sliders.map((slider) => (
          <div key={slider.label}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-700">
                {slider.label}
              </label>
              <span className="text-sm font-semibold text-slate-900">
                {slider.value} {slider.unit}
              </span>
            </div>

            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={slider.value}
              onChange={(event) =>
                slider.setValue(Number(event.target.value))
              }
              className="w-full cursor-pointer accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>{slider.min}</span>
              <span>{slider.max}</span>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-slate-500">
          Calculating your scenario...
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-5 border-t border-slate-200 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current score</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {result.current_score.toFixed(2)}
              </p>
            </div>

            <div className="space-y-5">
  <div>
    <h3 className="font-semibold text-slate-900">
      Fatigue Factor Breakdown
    </h3>
    <p className="mt-1 text-sm text-slate-500">
      Compare each factor before and after your hypothetical adjustments.
    </p>
  </div>

  {Object.entries(result.current_factors).map(([key, currentValue]) => {
    const projectedValue = result.projected_factors[key] ?? 0
    const weight = result.weights[key] ?? 0
    const currentContribution =
      result.current_weighted_contributions[key] ?? 0
    const projectedContribution =
      result.projected_weighted_contributions[key] ?? 0

    return (
      <div
        key={key}
        className="rounded-xl border border-slate-200 p-4"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row">
          <div>
            <h4 className="font-medium text-slate-800">
              {factorLabels[key] ?? key}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {factorDescriptions[key] ?? 'Factor used in the fatigue estimate.'}
            </p>
          </div>

          <div className="text-sm sm:text-right">
            <p>
              Current: <strong>{currentValue.toFixed(2)}%</strong>
            </p>
            <p>
              Projected: <strong>{projectedValue.toFixed(2)}%</strong>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Current factor score</span>
            <span>{currentValue.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-400 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, currentValue))}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Projected factor score</span>
            <span>{projectedValue.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, projectedValue))}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <span>Weight: {(weight * 100).toFixed(0)}%</span>
          <span>
            Current contribution: {currentContribution.toFixed(2)} points
          </span>
          <span>
            Projected contribution: {projectedContribution.toFixed(2)} points
          </span>
        </div>
      </div>
    )
  })}
</div>

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-sm text-slate-500">Projected score</p>
              <p className="mt-2 text-3xl font-bold text-indigo-700">
                {result.projected_score.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Score change</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {result.score_difference > 0 ? '+' : ''}
                {result.score_difference.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Negative means a lower estimated score.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500">Projected level</p>
            <p className={`mt-1 text-lg font-semibold capitalize ${levelColor(result.projected_level)}`}>
              {result.projected_level}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Recommendations
            </h3>
            <div className="mt-3 space-y-3">
              {result.recommendations.map((item, index) => (
                <div
                  key={`${item.factor}-${index}`}
                  className="rounded-lg bg-slate-50 p-4"
                >
                  <p className="font-medium text-slate-800">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            {result.disclaimer}
          </p>
        </div>
      )}
    </section>
  )
}
