
import Icon from '../Icon'
import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  predictMLFatigue,
} from '../../Services/api'
import type {
  MLFatiguePredictionResponse,
} from '../../Services/api'

export default function MLFatiguePrediction() {
  const [workHours, setWorkHours] = useState('6')
  const [interruptions, setInterruptions] = useState('4')
  const [pendingMinutes, setPendingMinutes] = useState('120')
  const [difficulty, setDifficulty] = useState('3')
  const [sleepHours, setSleepHours] = useState('7')
  const [activityType, setActivityType] = useState('Programming/technical')

  const [result, setResult] =
    useState<MLFatiguePredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prediction = await predictMLFatigue({
        work_hours: Number(workHours),
        interruption_count: Number(interruptions),
        pending_task_minutes: Number(pendingMinutes),
        task_difficulty_1_to_5: Number(difficulty),
        sleep_hours: sleepHours.trim() === '' ? null : Number(sleepHours),
        activity_type: activityType,
      })

      setResult(prediction)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to calculate the ML prediction.',
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'mb-input mt-2'

  return (
    <section className="mb-card p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <Icon name="spark" size={20} className="mt-1 shrink-0 text-violet-ink" />
        <div>
          <h2 className="mt-1 text-xl font-medium">
            Mental Fatigue Prediction
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">
            Enter your current work patterns to estimate your self-reported
            fatigue rating using the experimental Ridge Regression model.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="ml-work-hours" className="text-sm font-medium">
              Work hours
            </label>
            <input
              id="ml-work-hours"
              className={inputClass}
              type="number"
              min="0"
              max="24"
              step="0.25"
              required
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="ml-interruptions" className="text-sm font-medium">
              Number of interruptions
            </label>
            <input
              id="ml-interruptions"
              className={inputClass}
              type="number"
              min="0"
              step="1"
              required
              value={interruptions}
              onChange={(e) => setInterruptions(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="ml-pending" className="text-sm font-medium">
              Pending workload (minutes)
            </label>
            <input
              id="ml-pending"
              className={inputClass}
              type="number"
              min="0"
              step="1"
              required
              value={pendingMinutes}
              onChange={(e) => setPendingMinutes(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="ml-difficulty" className="text-sm font-medium">
              Task difficulty
            </label>
            <select
              id="ml-difficulty"
              className={inputClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="1">1 — Very easy</option>
              <option value="2">2 — Easy</option>
              <option value="3">3 — Moderate</option>
              <option value="4">4 — Difficult</option>
              <option value="5">5 — Very difficult</option>
            </select>
          </div>

          <div>
            <label htmlFor="ml-sleep" className="text-sm font-medium">
              Sleep hours <span className="font-normal text-ink-2">(optional)</span>
            </label>
            <input
              id="ml-sleep"
              className={inputClass}
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="Leave blank if unknown"
            />
          </div>

          <div>
            <label htmlFor="ml-activity" className="text-sm font-medium">
              Primary activity
            </label>
            <select
              id="ml-activity"
              className={inputClass}
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              <option value="Study">Study</option>
              <option value="Programming/technical">
                Programming/technical
              </option>
              <option value="Office/professional">
                Office/professional
              </option>
              <option value="Research/project">Research/project</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mb-btn w-full sm:w-auto"
        >
          {loading ? 'Predicting...' : 'Predict mental fatigue'}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-line bg-tray-2 p-5">
          <p className="text-sm font-medium text-ink">
            Your predicted fatigue rating
          </p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-medium text-ink">
              {result.predicted_fatigue_rating.toFixed(2)}
            </span>
            <span className="text-sm text-ink-2">/ 10</span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-tray">
            <div
              className="h-full rounded-full bg-blue transition-all"
              style={{
                width: `${result.predicted_fatigue_rating * 10}%`,
              }}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-ink-2">
            Model: {result.model}. {result.disclaimer}
          </p>
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-ink-3">
        This is an experimental prediction trained on a small survey dataset.
        It is not a clinical assessment or diagnosis. Results may be inaccurate
        for individuals or activities unlike those in the training data.
      </p>
    </section>
  )
}
