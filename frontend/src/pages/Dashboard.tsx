import FatigueSimulator from '../components/Analytics/FatigueSimulator'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../Services/auth'
import { getTasks, createTask, updateTask, deleteTask } from '../Services/tasks'
import type { Task } from '../Services/tasks'
import WorkLogs from '../components/Worklogs'
import PersonalizedRecommendations from '../components/Analytics/PersonalizedRecommendations'
import FeedbackAnalytics from '../components/Analytics/FeedbackAnalytics.tsx'
import FocusSession from './FocusSession'
import MLFatiguePrediction from '../components/Analytics/MLFatiguePrediction'


import {
  getWorkloadAnalytics,
  getFatigueEstimate,
  getDailyActivity,
} from '../Services/analytics'
import type {
  WorkloadAnalytics,
  FatigueEstimate,
  DailyActivity,
} from '../Services/analytics'

const navigation = [
  { icon: '▦', label: 'Overview' },
  { icon: '✓', label: 'My tasks' },
  { icon: '◷', label: 'Focus sessions' },
  { icon: '▥', label: 'Work logs' },
  { icon: '↗', label: 'Analytics' },
]

const week = [
  { day: 'Mon', value: 48 },
  { day: 'Tue', value: 72 },
  { day: 'Wed', value: 55 },
  { day: 'Thu', value: 88 },
  { day: 'Fri', value: 64 },
  { day: 'Sat', value: 36 },
  { day: 'Sun', value: 20 },
]

function Dashboard() {
  const navigate = useNavigate()

  const [activePage, setActivePage] = useState('Overview')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')
  const [updatingTaskIds, setUpdatingTaskIds] = useState<number[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('Medium')
  const [newTaskMinutes, setNewTaskMinutes] = useState('25')
  const [createTaskError, setCreateTaskError] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editTaskError, setEditTaskError] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editMinutes, setEditMinutes] = useState('25')
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [deleteTaskError, setDeleteTaskError] = useState('')
  const [seconds, setSeconds] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [analytics, setAnalytics] = useState<WorkloadAnalytics | null>(null)
  const [fatigueEstimate, setFatigueEstimate] = useState<FatigueEstimate | null>(null)
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      try {
        setTasksLoading(true)
        setTasksError('')
        const data = await getTasks()
        if (!cancelled) setTasks(data)
      } catch (error) {
        if (!cancelled) {
          setTasksError(error instanceof Error ? error.message : 'Unable to load your tasks.')
        }
      } finally {
        if (!cancelled) setTasksLoading(false)
      }
    }

    void loadTasks()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activePage !== 'Analytics') return

    let cancelled = false

    async function loadAnalytics() {
      setAnalyticsLoading(true)
      setAnalyticsError('')

      try {
        const [workloadData, fatigueData, activityData] = await Promise.all([
          getWorkloadAnalytics(),
          getFatigueEstimate(),
          getDailyActivity(),
        ])

        if (!cancelled) {
          setAnalytics(workloadData)
          setFatigueEstimate(fatigueData)
          setDailyActivity(activityData.daily_activity ?? [])
        }
      } catch (error) {
        if (!cancelled) {
          setAnalyticsError(
            error instanceof Error ? error.message : 'Unable to load analytics.',
          )
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false)
      }
    }

    void loadAnalytics()
    return () => { cancelled = true }
  }, [activePage])

  useEffect(() => {
    if (!timerRunning) return

    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setTimerRunning(false)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [timerRunning])

  const completedTasks = tasks.filter((task) => task.status === 'completed').length
  const remaining = tasks.length - completedTasks

  const formatTime = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
      value % 60,
    ).padStart(2, '0')}`

  const resetTimer = () => {
    setTimerRunning(false)
    setSeconds(25 * 60)
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/login', { replace: true })
  }


  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newTaskTitle.trim()
    if (!title) {
      setCreateTaskError('Please enter a task title.')
      return
    }

    try {
      setIsCreatingTask(true)
      setCreateTaskError('')
      const createdTask = await createTask({
        title,
        description: newTaskDescription.trim() || null,
        priority: newTaskPriority.toLowerCase(),
        estimated_minutes: newTaskMinutes ? Number(newTaskMinutes) : null,
      })
      setTasks((current) => [createdTask, ...current])
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority('Medium')
      setNewTaskMinutes('25')
      setIsCreateModalOpen(false)
      setActivePage('My tasks')
    } catch (error) {
      setCreateTaskError(error instanceof Error ? error.message : 'Unable to create the task.')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description ?? '')
    setEditPriority(task.priority.toLowerCase())
    setEditMinutes(task.estimated_minutes == null ? '' : String(task.estimated_minutes))
    setEditTaskError('')
  }

  const handleEditTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTask) return

    const title = editTitle.trim()
    if (!title) {
      setEditTaskError('Please enter a task title.')
      return
    }

    try {
      setIsSavingEdit(true)
      setEditTaskError('')
      const updatedTask = await updateTask(editingTask.id, {
        title,
        description: editDescription.trim() || null,
        priority: editPriority,
        estimated_minutes: editMinutes ? Number(editMinutes) : null,
      })
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task))
      setEditingTask(null)
    } catch (error) {
      setEditTaskError(error instanceof Error ? error.message : 'Unable to save task changes.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      setIsDeletingTask(true)
      setDeleteTaskError('')
      await deleteTask(taskToDelete.id)
      setTasks((current) => current.filter((task) => task.id !== taskToDelete.id))
      setTaskToDelete(null)
    } catch (error) {
      setDeleteTaskError(error instanceof Error ? error.message : 'Unable to delete task.')
    } finally {
      setIsDeletingTask(false)
    }
  }

  const handleToggleTask = async (task: Task) => {
    if (updatingTaskIds.includes(task.id)) return

    const previousStatus = task.status
    const newStatus = previousStatus === 'completed' ? 'pending' : 'completed'
    setTasksError('')
    setUpdatingTaskIds((current) => [...current, task.id])
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: newStatus } : item))

    try {
      const updatedTask = await updateTask(task.id, { status: newStatus })
      setTasks((current) => current.map((item) => item.id === task.id ? updatedTask : item))
    } catch (error) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item))
      setTasksError(error instanceof Error ? error.message : 'Unable to update the task.')
    } finally {
      setUpdatingTaskIds((current) => current.filter((id) => id !== task.id))
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6]/60 text-[#202720]">
      {/* Desktop sidebar */}
      <aside className="glass-nav fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r px-5 py-7 lg:flex">
        <a
          href="#dashboard"
          className="mb-10 flex items-center gap-3"
          onClick={(event) => {
            event.preventDefault()
            setActivePage('Overview')
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#397858] text-xl font-bold text-white shadow-lg shadow-[#397858]/20">
            M
          </div>

          <div>
            <div className="font-[Manrope] text-xl font-extrabold tracking-tight">
              mindblaze
            </div>
            <div className="text-[11px] tracking-wide text-[#858c85]">
              WORK WITH BALANCE
            </div>
          </div>
        </a>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ba29b]">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => (
            <button
              key={item.label}
              onClick={() => setActivePage(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium ${
                activePage === item.label
                  ? 'bg-[#eaf3ec]/90 text-[#2e704c] shadow-sm'
                  : 'text-[#747c75] hover:bg-white/70 hover:text-[#29382d]'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center text-lg">
                {item.icon}
              </span>

              {item.label}

              {item.label === 'My tasks' && (
                <span className="ml-auto rounded-md bg-white/80 px-2 py-0.5 text-xs text-[#6e786f]">
                  {remaining}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="glass-panel mt-auto rounded-2xl !bg-white/55 p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-lg">
            ✳
          </div>

          <p className="text-sm font-semibold">Make room to breathe</p>
          <p className="mt-1 text-xs leading-5 text-[#7c857d]">
            Progress matters. So do the breaks between it.
          </p>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e3eae1]">
            <div className="h-full w-2/3 rounded-full bg-[#72a583]" />
          </div>

          <p className="mt-2 text-[10px] text-[#899189]">
            A little progress every day.
          </p>
        </div>

        {/* Workspace account and logout */}
        <div className="mt-5 flex items-center gap-3 border-t border-[#edf0ec]/80 pt-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7eee5] font-semibold text-[#477454]">
            P
          </div>

          <div>
            <p className="text-sm font-semibold">Your workspace</p>
            <p className="text-xs text-[#858c85]">Personal account</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto rounded-lg px-2 py-2 text-sm text-[#788078] hover:bg-white/80 hover:text-red-600"
            title="Sign out"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:ml-[248px]">
        <header className="glass-nav sticky top-0 z-10 flex h-[72px] items-center justify-between border-b px-5 sm:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#397858] font-bold text-white lg:hidden">
              M
            </div>

            <div>
              <p className="text-sm font-semibold">{activePage}</p>
              <p className="text-xs text-[#8b928b]">
                Your personal workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/80 bg-white/55 px-3 py-2 text-xs text-[#737d73] shadow-sm sm:inline-flex">
              ✦ &nbsp; Your pace, your progress
            </span>

            <button
              onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#397858] px-4 text-sm font-semibold text-white shadow-md shadow-[#397858]/15 hover:bg-[#2c6447] hover:shadow-lg"
            >
              <span className="text-lg">+</span>
              <span className="hidden sm:inline">New task</span>
              <span className="sm:hidden">Task</span>
            </button>
          </div>
        </header>

        <div
          id="dashboard"
          className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-9 xl:px-10"
        >
          
          {activePage === 'Analytics' ? (
            <AnalyticsPage
              analytics={analytics}
              fatigueEstimate={fatigueEstimate}
              dailyActivity={dailyActivity}
              loading={analyticsLoading}
              error={analyticsError}
              onRetry={() => window.location.reload()}
            />
          ) : activePage === 'Focus sessions' ? (
              <FocusSession />
          ) : activePage === 'Work logs' ? (
            <WorkLogs tasks={tasks} />
          ) : activePage === 'My tasks' ? (

            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">TASK WORKSPACE</p>
                  <h1 className="font-[Manrope] text-3xl font-bold tracking-tight sm:text-[34px]">Task management</h1>
                  <p className="mt-2 text-sm leading-6 text-[#7b837b]">Review task details, update progress, and manage priorities in one place.</p>
                </div>
                <button type="button" onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }} className="w-fit rounded-xl bg-[#397858] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#2c6447]">+ Create task</button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard label="All tasks" value={String(tasks.length)} note="Tasks in your workspace" icon="▤" />
                <MetricCard label="Completed" value={String(completedTasks)} note="Successfully finished" icon="✓" />
                <MetricCard label="In progress" value={String(remaining)} note="Still to be completed" icon="◷" />
              </div>

              <div className="glass-panel rounded-2xl p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-[Manrope] text-lg font-bold">All tasks</h2>
                    <p className="mt-1 text-sm text-[#858c85]">Select Edit to change details or Delete to remove a task.</p>
                  </div>
                  <span className="rounded-full border border-white/80 bg-white/60 px-3 py-2 text-xs text-[#617462]">{tasks.length} total</span>
                </div>

                {tasksLoading ? (
                  <p className="py-10 text-center text-sm text-[#858c85]">Loading your tasks...</p>
                ) : tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dce6dc] bg-white/40 px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf5ed] text-xl text-[#397858]">✓</div>
                    <h3 className="mt-4 font-semibold">Your task list is clear</h3>
                    <p className="mt-1 text-sm text-[#858c85]">Create a task to start planning your workload.</p>
                    <button type="button" onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }} className="mt-5 rounded-xl bg-[#397858] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c6447]">Create your first task</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const done = task.status === 'completed'
                      const priority = task.priority.toLowerCase()
                      const updating = updatingTaskIds.includes(task.id)
                      return (
                        <article key={task.id} className="rounded-2xl border border-white/90 bg-white/55 p-4 transition hover:border-[#cbdccb] hover:bg-white/80 sm:p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <input type="checkbox" aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`} checked={done} disabled={updating} onChange={() => void handleToggleTask(task)} className="mt-1 h-[17px] w-[17px] shrink-0 accent-[#397858]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`break-words font-semibold ${done ? 'text-[#a0a69f] line-through' : 'text-[#333b34]'}`}>{task.title}</h3>
                                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${priority === 'high' ? 'bg-[#fceee8]/90 text-[#b65c40]' : priority === 'medium' ? 'bg-[#fbf3df]/90 text-[#9c7a2c]' : 'bg-[#edf3ed]/90 text-[#628067]'}`}>{task.priority} priority</span>
                                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${done ? 'bg-[#edf3ed] text-[#628067]' : 'bg-[#f2f2ed] text-[#737d73]'}`}>{done ? 'Completed' : 'Pending'}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#7b837b]">{task.description || 'No description provided.'}</p>
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#929991]">
                                <span>Task ID: {task.id}</span>
                                {task.estimated_minutes != null && <span>Estimated time: {task.estimated_minutes} min</span>}
                                {task.due_at && <span>Due: {new Date(task.due_at).toLocaleString()}</span>}
                                {updating && <span className="text-[#397858]">Saving status...</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2 sm:justify-end">
                              <button type="button" disabled={updating} onClick={() => openEditModal(task)} className="inline-flex items-center gap-2 rounded-xl border border-[#dce7dc] bg-white/80 px-3.5 py-2 text-sm font-semibold text-[#397858] hover:bg-[#eaf3ec] disabled:opacity-50"><span>✎</span> Edit</button>
                              <button type="button" disabled={updating} onClick={() => { setTaskToDelete(task); setDeleteTaskError('') }} className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white/80 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><span>⌫</span> Delete</button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
                {tasksError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{tasksError}</p>}
              </div>
            </section>
          ) : (
            <>
          {/* Welcome section */}
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">
                YOUR SPACE TO THINK CLEARLY
              </p>

              <h1 className="font-[Manrope] text-3xl font-bold tracking-tight sm:text-[34px]">
                A little progress goes a long way.
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#7b837b]">
                Organise your work, protect your focus, and make time to recharge.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/90 bg-white/55 px-3.5 py-2 text-xs text-[#788078] shadow-sm backdrop-blur-lg">
              LIVE TASKS · SAMPLE ANALYTICS
            </span>
          </section>

          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tasks completed"
              value={`${completedTasks}/${tasks.length}`}
              note="Saved in your workspace"
              icon="✓"
            />

            <MetricCard
              label="Tasks remaining"
              value={String(remaining)}
              note="Tasks not yet completed"
              icon="▤"
            />

            <MetricCard
              label="Focus timer"
              value="25 min"
              note="A fresh focus session"
              icon="◷"
            />

            <MetricCard
              label="Fatigue estimate"
              value="Not calculated"
              note="Connect your work logs to begin"
              icon="✳"
            />
          </section>

          {/* Workload and focus */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[Manrope] text-lg font-bold">
                    Workload overview
                  </h2>
                  <p className="mt-1 text-sm text-[#858c85]">
                    A sample view of your weekly activity
                  </p>
                </div>

                <span className="rounded-lg border border-white/80 bg-white/60 px-3 py-2 text-xs font-medium text-[#617462]">
                  This week
                </span>
              </div>

              <div className="mt-8 flex h-[190px] items-end justify-between gap-3 border-b border-[#edf0eb]/80 px-1 sm:gap-5">
                {week.map((item) => (
                  <div
                    key={item.day}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[38px] rounded-t-lg transition-all duration-500 ${
                          item.day === 'Thu'
                            ? 'bg-[#397858] shadow-md shadow-[#397858]/15'
                            : 'bg-[#dceade]/90 hover:bg-[#b8d4bd]'
                        }`}
                        style={{ height: `${item.value}%` }}
                        title={`${item.value} sample activity units`}
                      />
                    </div>

                    <span className="mb-3 text-xs text-[#8b928b]">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[#929991]">
                Illustrative chart only. Real workload trends will appear after
                analytics API integration.
              </p>
            </div>

            {/* Focus timer */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-[Manrope] text-lg font-bold">
                    Focus room
                  </h2>
                  <p className="mt-1 text-sm text-[#858c85]">
                    One thing at a time.
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-[#edf5ed]/80 text-xl text-[#397858]">
                  ◷
                </div>
              </div>

              <div className="my-7 flex flex-col items-center rounded-2xl border border-white/80 bg-white/35 px-4 py-6">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[7px] border-[#dfecdf]/90 shadow-inner shadow-[#397858]/5">
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#c5d9c6]" />

                  <div className="text-center">
                    <div className="font-[Manrope] text-3xl font-bold tracking-tight">
                      {formatTime(seconds)}
                    </div>

                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b897c]">
                      {seconds === 0
                        ? 'Session complete'
                        : timerRunning
                          ? 'Stay present'
                          : 'Ready when you are'}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-[#818a81]">
                  Suggested focus interval · 25 minutes
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTimerRunning((running) => !running)}
                  disabled={seconds === 0}
                  className="flex-1 rounded-xl bg-[#397858] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#397858]/15 hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {timerRunning ? 'Pause session' : 'Start focusing'}
                </button>

                <button
                  onClick={resetTimer}
                  className="rounded-xl border border-white/90 bg-white/55 px-4 py-3 text-sm font-medium text-[#657065] hover:bg-white/85"
                >
                  Reset
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] text-[#9aa199]">
                Preview timer only · Sessions are not saved yet
              </p>
            </div>
          </section>

          {/* Tasks and wellbeing */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[Manrope] text-lg font-bold">
                    Your tasks
                  </h2>
                  <p className="mt-1 text-sm text-[#858c85]">
                    Small steps make meaningful progress.
                  </p>
                </div>

                <button
                  onClick={() => setActivePage('My tasks')}
                  className="text-sm font-semibold text-[#397858] hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="mt-5 divide-y divide-[#edf0eb]/80">
                {tasksLoading ? (
                  <p className="py-6 text-sm text-[#858c85]">Loading your tasks...</p>
                ) : tasks.length === 0 ? (
                  <div className="py-6">
                    <p className="text-sm text-[#858c85]">No tasks yet. Create your first task to get started.</p>
                    {tasksError && <p role="alert" className="mt-2 text-sm text-red-600">{tasksError}</p>}
                  </div>
                ) : (
                  tasks.map((task) => {
                    const done = task.status === 'completed'
                    const priority = task.priority.toLowerCase()
                    const updating = updatingTaskIds.includes(task.id)
                    return (
                      <div key={task.id} className="flex items-center gap-3 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`}
                          checked={done}
                          disabled={updating}
                          onChange={() => void handleToggleTask(task)}
                          className="h-[17px] w-[17px] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${done ? 'text-[#a0a69f] line-through' : 'text-[#333b34]'}`}>{task.title}</p>
                          <p className="mt-1 text-xs text-[#929991]">{task.description || 'General task'}{updating ? ' · Saving...' : ''}</p>
                        </div>
                        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${priority === 'high' ? 'bg-[#fceee8]/90 text-[#b65c40]' : priority === 'medium' ? 'bg-[#fbf3df]/90 text-[#9c7a2c]' : 'bg-[#edf3ed]/90 text-[#628067]'}`}>{task.priority}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" disabled={updating} onClick={() => openEditModal(task)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#397858] hover:bg-[#eaf3ec] disabled:opacity-50" aria-label={`Edit ${task.title}`}>Edit</button>
                          <button type="button" disabled={updating} onClick={() => { setTaskToDelete(task); setDeleteTaskError('') }} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${task.title}`}>Delete</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {tasksError && tasks.length > 0 && <p role="alert" className="mt-3 text-xs text-red-600">{tasksError}</p>}
              <p className="mt-2 text-[11px] text-[#9aa199]">Tasks are saved to your MindBlaze account.</p>
            </div>

            {/* Wellbeing card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-[#f0f4e8]/80 text-xl">
                ✳
              </div>

              <h2 className="mt-4 font-[Manrope] text-lg font-bold">
                Your wellbeing matters
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#7b837b]">
                A full task list doesn't mean you have to do everything at once.
                Try taking a short break between demanding activities.
              </p>

              <div className="mt-5 rounded-xl border border-white/90 bg-[#f8faf6]/65 p-4">
                <p className="text-sm font-semibold text-[#426b4b]">
                  A gentle reminder
                </p>

                <p className="mt-1 text-xs leading-5 text-[#7c857b]">
                  Check in with yourself, notice interruptions, and make room
                  for rest when you need it.
                </p>
              </div>

              <p className="mt-4 text-[10px] leading-4 text-[#969e95]">
                MindBlaze fatigue estimates are experimental indicators, not
                medical diagnoses.
              </p>
            </div>
          </section>

          <footer className="py-8 text-center text-xs text-[#9aa199]">
            MindBlaze · Work thoughtfully. Rest intentionally.
          </footer>
            </>
          )}
        </div>
      </main>

      {/* Create task modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17251c]/40 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingTask) setIsCreateModalOpen(false)
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="create-task-title" className="glass-panel w-full max-w-lg rounded-3xl border border-white/80 bg-[#f9fbf8] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b8a67]">MAKE A LITTLE PROGRESS</p>
                <h2 id="create-task-title" className="mt-2 font-[Manrope] text-2xl font-bold">Create a task</h2>
                <p className="mt-1 text-sm text-[#858c85]">Add the details and we'll save it to your workspace.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={isCreatingTask} onClick={() => setIsCreateModalOpen(false)} className="rounded-xl px-3 py-2 text-xl text-[#788078] hover:bg-white disabled:opacity-50">×</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-5">
              <div>
                <label htmlFor="task-title" className="mb-2 block text-sm font-semibold text-[#39443b]">Task title <span className="text-red-500">*</span></label>
                <input id="task-title" autoFocus required maxLength={200} value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="e.g. Complete MindBlaze API integration" className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
              </div>

              <div>
                <label htmlFor="task-description" className="mb-2 block text-sm font-semibold text-[#39443b]">Description <span className="font-normal text-[#929991]">(optional)</span></label>
                <textarea id="task-description" rows={3} maxLength={2000} value={newTaskDescription} onChange={(event) => setNewTaskDescription(event.target.value)} placeholder="What needs to be done?" className="w-full resize-y rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-priority" className="mb-2 block text-sm font-semibold text-[#39443b]">Priority</label>
                  <select id="task-priority" value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value)} className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-minutes" className="mb-2 block text-sm font-semibold text-[#39443b]">Estimated minutes</label>
                  <input id="task-minutes" type="number" min="1" max="1440" value={newTaskMinutes} onChange={(event) => setNewTaskMinutes(event.target.value)} placeholder="25" className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
                </div>
              </div>

              {createTaskError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{createTaskError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={isCreatingTask} onClick={() => setIsCreateModalOpen(false)} className="rounded-xl border border-[#e2e9e1] bg-white/70 px-5 py-3 text-sm font-semibold text-[#657065] hover:bg-white disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isCreatingTask || !newTaskTitle.trim()} className="rounded-xl bg-[#397858] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#397858]/15 hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-60">{isCreatingTask ? 'Saving task...' : 'Create task'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Edit task modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17251c]/40 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingEdit) setEditingTask(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-task-title" className="glass-panel max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-white/80 bg-[#f9fbf8] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b8a67]">KEEP MAKING PROGRESS</p>
                <h2 id="edit-task-title" className="mt-2 font-[Manrope] text-2xl font-bold">Edit task</h2>
                <p className="mt-1 text-sm text-[#858c85]">Update the details of this task.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={isSavingEdit} onClick={() => setEditingTask(null)} className="rounded-xl px-3 py-2 text-xl text-[#788078] hover:bg-white disabled:opacity-50">×</button>
            </div>
            <form onSubmit={handleEditTask} className="space-y-5">
              <div>
                <label htmlFor="edit-task-title-input" className="mb-2 block text-sm font-semibold text-[#39443b]">Task title *</label>
                <input id="edit-task-title-input" required maxLength={200} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
              </div>
              <div>
                <label htmlFor="edit-task-description" className="mb-2 block text-sm font-semibold text-[#39443b]">Description</label>
                <textarea id="edit-task-description" rows={3} maxLength={2000} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="w-full resize-y rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-task-priority" className="mb-2 block text-sm font-semibold text-[#39443b]">Priority</label>
                  <select id="edit-task-priority" value={editPriority} onChange={(event) => setEditPriority(event.target.value)} className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-task-minutes" className="mb-2 block text-sm font-semibold text-[#39443b]">Estimated minutes</label>
                  <input id="edit-task-minutes" type="number" min="1" max="1440" value={editMinutes} onChange={(event) => setEditMinutes(event.target.value)} className="w-full rounded-xl border border-[#e2e9e1] bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#72a583] focus:ring-4 focus:ring-[#397858]/10" />
                </div>
              </div>
              {editTaskError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{editTaskError}</p>}
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSavingEdit} onClick={() => setEditingTask(null)} className="rounded-xl border border-[#e2e9e1] bg-white/70 px-5 py-3 text-sm font-semibold text-[#657065] hover:bg-white disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSavingEdit || !editTitle.trim()} className="rounded-xl bg-[#397858] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-60">{isSavingEdit ? 'Saving changes...' : 'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete confirmation modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17251c]/45 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingTask) setTaskToDelete(null) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title" className="glass-panel w-full max-w-md rounded-3xl border border-white/80 bg-[#f9fbf8] p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-600">!</div>
            <h2 id="delete-task-title" className="mt-4 font-[Manrope] text-xl font-bold">Delete this task?</h2>
            <p className="mt-2 text-sm leading-6 text-[#7b837b]">You're about to delete <strong className="text-[#333b34]">{taskToDelete.title}</strong>. This action cannot be undone.</p>
            {deleteTaskError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteTaskError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isDeletingTask} onClick={() => setTaskToDelete(null)} className="rounded-xl border border-[#e2e9e1] bg-white/70 px-5 py-3 text-sm font-semibold text-[#657065] hover:bg-white disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isDeletingTask} onClick={() => void handleDeleteTask()} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isDeletingTask ? 'Deleting...' : 'Delete task'}</button>
            </div>
          </section>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="glass-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t px-1 py-2 lg:hidden">
        {navigation.map((item) => (
          <button
            key={item.label}
            onClick={() => setActivePage(item.label)}
            className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${
              activePage === item.label
                ? 'font-semibold text-[#397858]'
                : 'text-[#818981]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>

            <span>
              {item.label === 'Focus sessions'
                ? 'Focus'
                : item.label === 'Overview'
                  ? 'Home'
                  : item.label === 'My tasks'
                    ? 'Tasks'
                    : item.label === 'Work logs'
                      ? 'Logs'
                      : 'Stats'}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function AnalyticsPage({
  analytics,
  fatigueEstimate,
  dailyActivity,
  loading,
  error,
  onRetry,
}: {
  analytics: WorkloadAnalytics | null
  fatigueEstimate: FatigueEstimate | null
  dailyActivity: DailyActivity[]
  loading: boolean
  error: string
  onRetry: () => void
}) {
  const maxWorkMinutes = Math.max(1, ...dailyActivity.map((day) => day.work_minutes))

  const displayValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
    if (typeof value === 'string' || typeof value === 'boolean') return String(value)
    return JSON.stringify(value)
  }

  const fatigueEntries = fatigueEstimate
    ? Object.entries(fatigueEstimate).filter(([, value]) =>
        ['string', 'number', 'boolean'].includes(typeof value) || value == null,
      )
    : []

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#5b8a67]">
            YOUR WORK PATTERNS
          </p>
          <h1 className="font-[Manrope] text-3xl font-bold tracking-tight sm:text-[34px]">
            Analytics overview
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#7b837b]">
            Understand your workload, focus time, breaks, and interruptions.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/90 bg-white/55 px-3.5 py-2 text-xs text-[#788078] shadow-sm">
          Live data · Your account
        </span>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-sm text-[#858c85]">
          Loading your analytics...
        </div>
      ) : error ? (
        <div className="glass-panel rounded-2xl p-6">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <p className="mt-2 text-xs text-[#858c85]">
            Check that the backend is running and that you are logged in.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[#397858] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c6447]"
          >
            Reload analytics
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total tasks" value={String(analytics?.total_tasks ?? 0)} note="Tasks in your workspace" icon="▤" />
            <MetricCard label="Completed" value={String(analytics?.completed_tasks ?? 0)} note="Successfully finished" icon="✓" />
            <MetricCard label="Pending tasks" value={String(analytics?.pending_tasks ?? 0)} note={`${analytics?.estimated_pending_minutes ?? 0} estimated minutes remaining`} icon="◷" />
            <MetricCard label="Completion rate" value={`${analytics?.completion_rate_percent ?? 0}%`} note="Completed tasks out of all tasks" icon="↗" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <div>
                <h2 className="font-[Manrope] text-lg font-bold">Daily work activity</h2>
                <p className="mt-1 text-sm text-[#858c85]">Work minutes over the last seven days</p>
              </div>

              {dailyActivity.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#858c85]">No daily activity data is available yet.</p>
              ) : (
                <div className="mt-8 flex h-[220px] items-end justify-between gap-2 border-b border-[#edf0eb]/80 px-1 sm:gap-4">
                  {dailyActivity.map((day) => {
                    const height = day.work_minutes > 0
                      ? Math.max(5, (day.work_minutes / maxWorkMinutes) * 100)
                      : 2
                    return (
                      <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                        <span className="text-[10px] text-[#7b837b] sm:text-xs">
                          {day.work_minutes}
                        </span>
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className="w-full max-w-[38px] rounded-t-lg bg-[#72a583] transition-all hover:bg-[#397858]"
                            style={{ height: `${height}%` }}
                            title={`${day.work_minutes} work minutes`}
                          />
                        </div>
                        <span className="mb-3 text-[10px] text-[#8b928b] sm:text-xs">
                          {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-[#929991]">Bars show completed work time after subtracting recorded breaks.</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <h2 className="font-[Manrope] text-lg font-bold">Focus & recovery</h2>
              <p className="mt-1 text-sm text-[#858c85]">Totals from your saved work logs</p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/55 p-4">
                  <span className="text-sm text-[#7b837b]">Actual focus time</span>
                  <strong className="text-sm">{analytics?.actual_focus_minutes ?? 0} min</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/55 p-4">
                  <span className="text-sm text-[#7b837b]">Break minutes (7 days)</span>
                  <strong className="text-sm">{dailyActivity.reduce((sum, day) => sum + day.break_minutes, 0)} min</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/55 p-4">
                  <span className="text-sm text-[#7b837b]">Interruptions (7 days)</span>
                  <strong className="text-sm">{dailyActivity.reduce((sum, day) => sum + day.interruptions, 0)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/55 p-4">
                  <span className="text-sm text-[#7b837b]">Completed sessions (7 days)</span>
                  <strong className="text-sm">{dailyActivity.reduce((sum, day) => sum + day.sessions, 0)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf5ed] text-xl text-[#397858]">✳</div>
              <div>
                <h2 className="font-[Manrope] text-lg font-bold">Mental fatigue estimate</h2>
                <p className="mt-1 text-sm leading-6 text-[#858c85]">
                  Experimental estimate based on your current workload and recorded work patterns. It is not a medical diagnosis.
                </p>
              </div>
            </div>

            {!fatigueEstimate || fatigueEntries.length === 0 ? (
              <p className="mt-5 rounded-xl bg-white/55 p-4 text-sm text-[#858c85]">
                No fatigue estimate details were returned. Add tasks and complete work-log sessions, then refresh this page.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fatigueEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-white/80 bg-white/55 p-4">
                    <p className="text-xs capitalize text-[#858c85]">{key.replace(/_/g, ' ')}</p>
                    <p className="mt-2 break-words font-[Manrope] text-xl font-bold text-[#315d3d]">
                      {displayValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <MLFatiguePrediction />
          <FatigueSimulator />
          <PersonalizedRecommendations />
          <FeedbackAnalytics />
          
        </>

      )}
    </section>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string
  note: string
  icon: string
}) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#7e877e]">{label}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-[#edf5ed]/80 text-lg text-[#397858]">
          {icon}
        </span>
      </div>

      <p className="mt-5 break-words font-[Manrope] text-2xl font-bold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#929991]">{note}</p>
    </div>
  )
}

export default Dashboard
