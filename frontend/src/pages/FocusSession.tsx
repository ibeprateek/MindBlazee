
import { useEffect, useState } from 'react'
import { getTasks } from '../Services/tasks'
import { apiRequest } from '../Services/api'
import type { Task } from '../Services/tasks'

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
      <div className="flex min-h-96 items-center justify-center text-slate-500">
        Loading your focus sessions...
      </div>
    )
  }

  return (
    <main className="space-y-6 text-slate-800">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          MindBlaze / Productivity
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Focus Session
        </h1>
        <p className="mt-2 text-slate-500">
          Work on one task at a time. Give your attention room to breathe.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your focus timer</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeSession ? 'Session in progress' : 'Choose your focus duration'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeSession
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeSession ? 'Active' : 'Ready'}
            </span>
          </div>

          <div className="my-8 flex flex-wrap justify-center gap-3">
            {durations.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={Boolean(activeSession)}
                onClick={() => selectDuration(minutes)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                  duration === minutes
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                }`}
              >
                {minutes} minutes
              </button>
            ))}
          </div>

          <div
            className="mx-auto flex h-56 w-56 items-center justify-center rounded-full border-[10px] border-emerald-100 bg-emerald-50 sm:h-64 sm:w-64"
            aria-live="off"
          >
            <div className="text-center">
              <p className="font-mono text-5xl font-bold tracking-tight text-emerald-800 sm:text-6xl">
                {formatTime(remainingSeconds)}
              </p>
              <p className="mt-3 text-sm text-emerald-700">
                {activeSession ? 'Keep going' : 'Ready when you are'}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <label
              htmlFor="focus-task"
              className="mb-2 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
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
              <p className="mt-2 text-sm text-slate-500">
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
                className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Starting...' : 'Start focus'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishSession()}
                disabled={busy}
                className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Saving...' : 'Finish session'}
              </button>
            )}
          </div>

          {activeSession && remainingSeconds === 0 && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              Your selected timer duration has ended. Finish the session when you are ready.
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-slate-400">
            The timer is a focus-duration guide. Your session start and finish
            times are recorded by the backend.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Your focus summary</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Completed sessions</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {completedSessions.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Recorded focus time</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {totalFocusMinutes}
                  <span className="ml-1 text-sm font-medium">min</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Recorded time is calculated from backend session timestamps;
              it may include time when you stepped away.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Focus reminders</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>• Choose one clear task before starting.</li>
              <li>• Reduce notifications and distractions.</li>
              <li>• Take a break when you need one.</li>
              <li>• Use your work patterns to plan a balanced day.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Session history</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your saved focus sessions
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-10 text-center">
            <p className="font-medium text-slate-700">
              No focus sessions yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Start your first session to see your history here.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
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
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-3 py-4 font-medium text-slate-800">
                        {task?.title ?? (session.task_id ? `Task #${session.task_id}` : 'Unassigned session')}
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {formatDate(session.started_at)}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {elapsedMinutes} min
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            session.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
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
    </main>
  )
}
