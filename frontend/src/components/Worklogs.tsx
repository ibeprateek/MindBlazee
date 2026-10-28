
import { useCallback, useEffect, useState } from 'react'
import {
  finishWorkLog,
  getWorkLogs,
  startWorkLog,
} from '../Services/worklogs'
import type { WorkLog } from '../Services/worklogs'
import type { Task } from '../Services/tasks'

interface WorkLogsProps {
  tasks: Task[]
}

const panel =
  'rounded-2xl border border-white/80 bg-white/65 p-5 shadow-sm backdrop-blur-xl'

const field =
  'w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-3.5 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10'

function formatDuration(minutes: number | null) {
  if (minutes === null) return 'In progress'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins}m` : `${mins}m`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function WorkLogs({ tasks }: WorkLogsProps) {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [selectedTask, setSelectedTask] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [interruptions, setInterruptions] = useState('0')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeLog = logs.find((log) => log.status === 'active') ?? null

  const loadLogs = useCallback(async () => {
    try {
      setError('')
      const data = await getWorkLogs()
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load work logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  async function handleStart() {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const log = await startWorkLog({
        task_id: selectedTask ? Number(selectedTask) : null,
        notes: notes.trim() || null,
      })

      setLogs((current) => [log, ...current])
      setBreakMinutes('0')
      setInterruptions('0')
      setNotes('')
      setSuccess('Work session started. You can finish it whenever you are done.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinish() {
    if (!activeLog) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const updated = await finishWorkLog(activeLog.id, {
        break_minutes: Math.max(0, Number(breakMinutes) || 0),
        interruption_count: Math.max(0, Number(interruptions) || 0),
        notes: notes.trim() || null,
      })

      setLogs((current) =>
        current.map((log) => (log.id === updated.id ? updated : log)),
      )
      setNotes('')
      setSuccess('Session finished and saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish the session.')
    } finally {
      setSaving(false)
    }
  }

  const totalMinutes = logs.reduce(
    (total, log) => total + (log.actual_work_minutes ?? 0),
    0,
  )
  const completedSessions = logs.filter(
    (log) => log.status !== 'active',
  ).length
  const totalInterruptions = logs.reduce(
    (total, log) => total + log.interruption_count,
    0,
  )

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">
          WORK WITH AWARENESS
        </p>
        <h1 className="font-[Manrope] text-3xl font-bold tracking-tight sm:text-[34px]">
          Work logs
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#7b837b]">
          Record your work sessions, breaks and interruptions to understand
          your workload over time.
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-[#d5e8d8] bg-[#edf7ee] px-4 py-3 text-sm text-[#2e704c]">
          {success}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={panel}>
          <p className="text-sm text-[#7e877e]">Recorded work time</p>
          <p className="mt-3 font-[Manrope] text-2xl font-bold">
            {formatDuration(totalMinutes)}
          </p>
          <p className="mt-1 text-xs text-[#929991]">Completed sessions only</p>
        </div>

        <div className={panel}>
          <p className="text-sm text-[#7e877e]">Completed sessions</p>
          <p className="mt-3 font-[Manrope] text-2xl font-bold">
            {completedSessions}
          </p>
          <p className="mt-1 text-xs text-[#929991]">Saved in your account</p>
        </div>

        <div className={panel}>
          <p className="text-sm text-[#7e877e]">Recorded interruptions</p>
          <p className="mt-3 font-[Manrope] text-2xl font-bold">
            {totalInterruptions}
          </p>
          <p className="mt-1 text-xs text-[#929991]">Across your sessions</p>
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-[Manrope] text-lg font-bold">
              {activeLog ? 'Your session is active' : 'Start a work session'}
            </h2>
            <p className="mt-1 text-sm text-[#858c85]">
              {activeLog
                ? `Started ${formatDate(activeLog.started_at)}`
                : 'Choose a task if you want to link this session to your work.'}
            </p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
            activeLog
              ? 'bg-[#eaf3ec] text-[#2e704c]'
              : 'bg-[#f0f2ed] text-[#6f786e]'
          }`}>
            {activeLog ? '● In progress' : '○ Not started'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="work-task" className="mb-2 block text-sm font-semibold text-[#39443b]">
              Related task
            </label>
            <select
              id="work-task"
              className={field}
              value={selectedTask}
              onChange={(event) => setSelectedTask(event.target.value)}
              disabled={saving || Boolean(activeLog)}
            >
              <option value="">No specific task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="work-notes" className="mb-2 block text-sm font-semibold text-[#39443b]">
              Session notes
            </label>
            <input
              id="work-notes"
              className={field}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What are you working on?"
              maxLength={2000}
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="break-minutes" className="mb-2 block text-sm font-semibold text-[#39443b]">
              Break time (minutes)
            </label>
            <input
              id="break-minutes"
              className={field}
              type="number"
              min="0"
              max="1440"
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(event.target.value)}
              disabled={saving || !activeLog}
            />
          </div>

          <div>
            <label htmlFor="interruptions" className="mb-2 block text-sm font-semibold text-[#39443b]">
              Number of interruptions
            </label>
            <input
              id="interruptions"
              className={field}
              type="number"
              min="0"
              max="10000"
              value={interruptions}
              onChange={(event) => setInterruptions(event.target.value)}
              disabled={saving || !activeLog}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!activeLog ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={saving || loading}
              className="rounded-xl bg-[#397858] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Starting...' : '▶ Start session'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={saving}
              className="rounded-xl bg-[#397858] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : '■ Finish session'}
            </button>
          )}
        </div>

        {activeLog && (
          <p className="mt-3 text-xs leading-5 text-[#858c85]">
            Enter your total break time and interruptions before finishing.
            These values are saved when you finish the session.
          </p>
        )}
      </section>

      <section className={panel}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[Manrope] text-lg font-bold">Session history</h2>
            <p className="mt-1 text-sm text-[#858c85]">
              Your recorded work sessions and activity details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={loading}
            className="rounded-lg border border-[#e2e9e1] bg-white/70 px-3 py-2 text-sm font-medium text-[#477454] hover:bg-white disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[#858c85]">Loading sessions...</p>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dce5da] px-5 py-10 text-center">
            <p className="font-semibold text-[#39443b]">No work sessions yet</p>
            <p className="mt-2 text-sm text-[#858c85]">
              Start your first session above. Your real activity will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const task = tasks.find((item) => item.id === log.task_id)

              return (
                <article
                  key={log.id}
                  className="rounded-xl border border-[#e8ede6] bg-white/50 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#39443b]">
                        {task?.title ?? (log.task_id ? `Task #${log.task_id}` : 'General work session')}
                      </p>
                      <p className="mt-1 text-xs text-[#858c85]">
                        Started {formatDate(log.started_at)}
                      </p>
                      {log.ended_at && (
                        <p className="mt-1 text-xs text-[#858c85]">
                          Finished {formatDate(log.ended_at)}
                        </p>
                      )}
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === 'active'
                        ? 'bg-[#eaf3ec] text-[#2e704c]'
                        : 'bg-[#f0f2ed] text-[#6f786e]'
                    }`}>
                      {log.status === 'active' ? 'In progress' : 'Completed'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-[#929991]">Work duration</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDuration(log.actual_work_minutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#929991]">Break minutes</p>
                      <p className="mt-1 text-sm font-semibold">{log.break_minutes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#929991]">Interruptions</p>
                      <p className="mt-1 text-sm font-semibold">{log.interruption_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#929991]">Session ID</p>
                      <p className="mt-1 text-sm font-semibold">#{log.id}</p>
                    </div>
                  </div>

                  {log.notes && (
                    <p className="mt-4 rounded-lg bg-[#f5f8f3] px-3 py-2 text-sm text-[#657065]">
                      {log.notes}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
