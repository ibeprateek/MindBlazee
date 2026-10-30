
import { useEffect, useState } from 'react'
import { getTasks } from '../Services/tasks'
import { apiRequest } from '../Services/api'
import type { Task } from '../Services/tasks'
import monchArt from '../assets/art/monch.webp'

type FocusSessionRecord = {
  id: number
  user_id: number
  task_id: number | null
  started_at: string
  ended_at: string | null
  status: 'active' | 'completed'
}

const durations = [25, 50, 90]

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDate(date: string) {
  return new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function FocusSession() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<FocusSessionRecord[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [duration, setDuration] = useState(25)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [activeSession, setActiveSession] =
    useState<FocusSessionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [taskData, sessionData] = await Promise.all([
        getTasks(),
        apiRequest<FocusSessionRecord[]>('/focus-sessions/'),
      ])

      setTasks(taskData)
      setSessions(sessionData)

      const active = sessionData.find(
        (session) => session.status === 'active',
      )

      if (active) {
        setActiveSession(active)
        setMessage('You have an active focus session.')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load focus session data.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!activeSession) return

    const timer = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(0, previous - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [activeSession?.id])

  async function startSession() {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const session = await apiRequest<FocusSessionRecord>(
        '/focus-sessions/start',
        {
          method: 'POST',
          body: JSON.stringify({
            task_id: selectedTaskId ? Number(selectedTaskId) : null,
          }),
        },
      )

      setActiveSession(session)
      setRemainingSeconds(duration * 60)
      setSessions((previous) => [
        session,
        ...previous.filter((item) => item.id !== session.id),
      ])
      setMessage('Focus session started. Stay focused!')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start the focus session.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function finishSession() {
    if (!activeSession) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const completed = await apiRequest<FocusSessionRecord>(
        `/focus-sessions/${activeSession.id}/finish`,
        { method: 'POST' },
      )

      setSessions((previous) =>
        previous.map((item) =>
          item.id === completed.id ? completed : item,
        ),
      )

      setActiveSession(null)
      setRemainingSeconds(duration * 60)
      setMessage('Focus session completed successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to finish the focus session.',
      )
    } finally {
      setBusy(false)
    }
  }

  function selectDuration(minutes: number) {
    if (activeSession) return

    setDuration(minutes)
    setRemainingSeconds(minutes * 60)
  }

  const selectedTask = tasks.find(
    (task) => String(task.id) === selectedTaskId,
  )

  const completedSessions = sessions.filter(
    (session) => session.status === 'completed',
  )

  const totalFocusMinutes = completedSessions.reduce(
    (total, session) => {
      if (!session.ended_at) return total

      const elapsed =
        new Date(session.ended_at).getTime() -
        new Date(session.started_at).getTime()

      return total + Math.max(0, Math.floor(elapsed / 60000))
    },
    0,
  )

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-ink-3">
        Loading your focus sessions...
      </div>
    )
  }

  return (
    <section className="space-y-6 text-ink">
      <header>
        <h1 className="mb-display">
          Focus sessions. <span className="mb-quiet">One thing at a time.</span>
        </h1>
        <p className="mt-2 text-base text-ink-2">
          Work on one task at a time. Give your attention room to breathe.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-note"
        >
          {message}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="mb-card overflow-hidden">
          <div className="relative h-40 sm:h-52">
            <img src={monchArt} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
            <p className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-2">
              Ferdinand Hodler, <i>The Mönch with Clouds</i>, 1911
            </p>
          </div>
          <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="mb-title">Your focus timer</h2>
              <p className="mt-1 text-sm text-ink-2">
                {activeSession ? 'Session in progress' : 'Choose your focus duration'}
              </p>
            </div>
            <span
              className={`mb-chip ${activeSession ? 'mb-chip--blue' : ''}`}
            >
              {activeSession ? 'Active' : 'Ready'}
            </span>
          </div>

          <div className="my-8 flex flex-wrap justify-center gap-2">
            {durations.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={Boolean(activeSession)}
                onClick={() => selectDuration(minutes)}
                className={`${duration === minutes ? 'mb-btn' : 'mb-btn-ghost'} mb-btn-sm`}
              >
                {minutes} minutes
              </button>
            ))}
          </div>

          <div
            className="mb-frame mx-auto flex max-w-md items-center justify-center px-6 py-10"
            aria-live="off"
          >
            <div className="text-center">
              <p className="mb-num text-[72px] leading-none sm:text-[96px]">
                {formatTime(remainingSeconds)}
              </p>
              <p className="mt-4 text-sm text-ink-2">
                {activeSession ? 'Keep going' : 'Ready when you are'}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <label
              htmlFor="focus-task"
              className="mb-label"
            >
              Focus task (optional)
            </label>

            <select
              id="focus-task"
              value={
                activeSession
                  ? String(activeSession.task_id ?? '')
                  : selectedTaskId
              }
              onChange={(event) => setSelectedTaskId(event.target.value)}
              disabled={Boolean(activeSession)}
              className="mb-input"
            >
              <option value="">Choose a task</option>
              {tasks
                .filter((task) => task.status !== 'completed')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>

            {selectedTask && !activeSession && (
              <p className="mt-2 text-sm text-ink-2">
                Selected: {selectedTask.title}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!activeSession ? (
              <button
                type="button"
                onClick={() => void startSession()}
                disabled={busy}
                className="mb-btn !min-h-11 flex-1"
              >
                {busy ? 'Starting...' : 'Start focus'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishSession()}
                disabled={busy}
                className="mb-btn !min-h-11 flex-1"
              >
                {busy ? 'Saving...' : 'Finish session'}
              </button>
            )}
          </div>

          {activeSession && remainingSeconds === 0 && (
            <p className="mt-3 rounded-lg bg-[rgb(242_172_19/0.14)] px-3 py-2 text-sm text-amber-ink">
              Your selected timer duration has ended. Finish the session when you are ready.
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-ink-3">
            The timer is a focus-duration guide. Your session start and finish
            times are recorded by the backend.
          </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="mb-card p-6">
            <h2 className="mb-title">Your focus summary</h2>
            <div className="mt-5 grid grid-cols-2 divide-x divide-dashed divide-rule border-y border-dashed border-rule">
              <div className="py-4 pr-4">
                <p className="text-sm text-ink-2">Completed sessions</p>
                <p className="mb-num mt-2 text-[32px] leading-none">
                  {completedSessions.length}
                </p>
              </div>
              <div className="py-4 pl-4">
                <p className="text-sm text-ink-2">Recorded focus time</p>
                <p className="mb-num mt-2 text-[32px] leading-none">
                  {totalFocusMinutes}
                  <span className="ml-1 text-sm font-normal text-ink-3">min</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-3">
              Recorded time is calculated from backend session timestamps;
              it may include time when you stepped away.
            </p>
          </div>

          <div className="mb-card p-6">
            <h2 className="mb-title">Focus reminders</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-ink-2">
              {[
                ['Choose one clear task before starting.', 'mb-chip--pink'],
                ['Reduce notifications and distractions.', 'mb-chip--olive'],
                ['Take a break when you need one.', 'mb-chip--blue'],
                ['Use your work patterns to plan a balanced day.', 'mb-chip--violet'],
              ].map(([text, tone], index) => (
                <li key={text} className="flex items-start gap-3">
                  <span className={`mb-chip ${tone} h-6 w-6 shrink-0 justify-center !p-0`}>{index + 1}</span>
                  {text}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mb-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-title">Session history</h2>
            <p className="mt-1 text-sm text-ink-2">
              Your saved focus sessions
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mb-btn-ghost mb-btn-sm"
          >
            Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="mt-6 rounded-xl bg-tray-2 px-5 py-10 text-center">
            <p className="font-medium">
              No focus sessions yet
            </p>
            <p className="mt-2 text-sm text-ink-2">
              Start your first session to see your history here.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-dashed border-rule text-ink-3">
                  <th className="px-3 py-3 font-medium">Task</th>
                  <th className="px-3 py-3 font-medium">Started</th>
                  <th className="px-3 py-3 font-medium">Duration</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const task = tasks.find(
                    (item) => item.id === session.task_id,
                  )

                  const elapsedMs = session.ended_at
                    ? new Date(session.ended_at).getTime() -
                      new Date(session.started_at).getTime()
                    : Date.now() - new Date(session.started_at).getTime()

                  const elapsedMinutes = Math.max(
                    0,
                    Math.floor(elapsedMs / 60000),
                  )

                  return (
                    <tr
                      key={session.id}
                      className="border-b border-dashed border-rule last:border-0"
                    >
                      <td className="px-3 py-4 font-medium">
                        {task?.title ?? (session.task_id ? `Task #${session.task_id}` : 'Unassigned session')}
                      </td>
                      <td className="px-3 py-4 text-ink-2">
                        {formatDate(session.started_at)}
                      </td>
                      <td className="mb-num px-3 py-4 text-ink-2">
                        {elapsedMinutes} min
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`mb-chip ${session.status === 'active' ? 'mb-chip--blue' : ''}`}
                        >
                          {session.status === 'active' ? 'Active' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
