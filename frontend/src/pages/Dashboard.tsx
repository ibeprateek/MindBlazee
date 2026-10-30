import FatigueSimulator from '../components/Analytics/FatigueSimulator'
import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../Services/auth'
import { getTasks, createTask, updateTask, deleteTask } from '../Services/tasks'
import type { Task } from '../Services/tasks'
import WorkLogs from '../components/Worklogs'
import PersonalizedRecommendations from '../components/Analytics/PersonalizedRecommendations'
import FeedbackAnalytics from '../components/Analytics/FeedbackAnalytics.tsx'
import FocusSession from './FocusSession'
import MLFatiguePrediction from '../components/Analytics/MLFatiguePrediction'
import Icon, { Wordmark, type IconName } from '../components/Icon'
import peaksArt from '../assets/art/peaks.webp'
import readingArt from '../assets/art/reading.webp'
import niesenCutout from '../assets/art/niesen-cutout.webp'
import ProfileAvatar from '../components/ProfileAvatar'
import lakeRangeArt from '../assets/art/lake-range.webp'


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

const navigation: { icon: IconName; label: string }[] = [
  { icon: 'overview', label: 'Overview' },
  { icon: 'tasks', label: 'My tasks' },
  { icon: 'focus', label: 'Focus sessions' },
  { icon: 'logs', label: 'Work logs' },
  { icon: 'analytics', label: 'Analytics' },
]

const priorityChip = (priority: string) =>
  priority === 'high' ? 'mb-chip--pink' : priority === 'medium' ? 'mb-chip--amber' : 'mb-chip--olive'

const tagStyle = (color: string) => ({ '--tag': color }) as CSSProperties

// Divider grid for metric cells: dashed rules between cells, two columns on small screens.
const metricStrip4 =
  'mb-card grid grid-cols-2 xl:grid-cols-4 [&>*]:border-dashed [&>*]:border-rule [&>*:nth-child(-n+2)]:border-b xl:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r xl:[&>*:not(:last-child)]:border-r'
const metricStrip3 =
  'mb-card grid grid-cols-1 sm:grid-cols-3 [&>*]:border-dashed [&>*]:border-rule [&>*:not(:last-child)]:border-b sm:[&>*:not(:last-child)]:border-b-0 sm:[&>*:not(:last-child)]:border-r'

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
    <div className="min-h-screen bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-dashed border-rule bg-canvas px-4 py-6 lg:flex">
        <a
          href="#dashboard"
          className="mb-10 w-fit px-2"
          onClick={(event) => {
            event.preventDefault()
            setActivePage('Overview')
          }}
        >
          <Wordmark />
        </a>

        <nav className="space-y-0.5">
          {navigation.map((item) => (
            <button
              key={item.label}
              onClick={() => setActivePage(item.label)}
              className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[15px] ${
                activePage === item.label
                  ? 'bg-wash text-ink'
                  : 'text-ink-2 hover:bg-tray-2 hover:text-ink'
              }`}
            >
              <Icon name={item.icon} className={activePage === item.label ? 'text-blue-ink' : 'text-ink-3'} />

              {item.label}

              {item.label === 'My tasks' && (
                <span className="mb-mono ml-auto text-ink-3">
                  {remaining}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="rounded-xl bg-tray-2 p-4">
            <p className="text-sm font-medium">Make room to breathe</p>
            <p className="mt-1 text-xs leading-5 text-ink-2">
              Progress matters. So do the breaks between it.
            </p>
            <p className="mt-2 text-xs text-ink-3">
              A little progress every day.
            </p>
          </div>
        </div>

        {/* Workspace account and logout */}
        <div className="mb-rule relative z-10 mt-5 flex items-center gap-3 px-1 pt-5">
          <ProfileAvatar initial="P" />

          <div>
            <p className="text-sm font-medium">Your workspace</p>
            <p className="text-xs text-ink-3">Personal account</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="ml-auto rounded-full p-2 text-ink-3 hover:bg-tray hover:text-danger"
            title="Sign out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>

        {/* Painted Niesen sitting on the bottom edge of the panel */}
        <img
          src={niesenCutout}
          alt=""
          className="pointer-events-none absolute -bottom-5 left-1/2 w-4/5 -translate-x-1/2 select-none opacity-50 [@media(max-height:640px)]:hidden"
        />
      </aside>

      {/* Main content */}
      <main className="min-h-screen pb-20 lg:ml-[248px] lg:pb-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-dashed border-rule bg-canvas px-5 sm:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <span className="lg:hidden">
              <Wordmark compact />
            </span>

            <div>
              <p className="text-[15px] font-medium">{activePage}</p>
              <p className="text-xs text-ink-3">
                Your personal workspace
              </p>
            </div>
          </div>

          <button
            onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }}
            className={`mb-btn ${activePage === 'My tasks' ? 'invisible' : ''}`}
          >
            <Icon name="plus" size={16} />
            <span className="hidden sm:inline">New task</span>
            <span className="sm:hidden">Task</span>
          </button>
        </header>

        <div
          id="dashboard"
          className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 xl:px-10"
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

            <section className="space-y-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="mb-display">Task management. <span className="mb-quiet">One list.</span></h1>
                  <p className="mt-2 text-base text-ink-2">Review task details, update progress, and manage priorities in one place.</p>
                </div>
                <button type="button" onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }} className="mb-btn w-fit"><Icon name="plus" size={16} />Create task</button>
              </div>

              <div className={metricStrip3}>
                <MetricCard label="All tasks" value={String(tasks.length)} note="Tasks in your workspace" icon="tasks" />
                <MetricCard label="Completed" value={String(completedTasks)} note="Successfully finished" icon="check" />
                <MetricCard label="In progress" value={String(remaining)} note="Still to be completed" icon="focus" />
              </div>

              <div className="mb-card p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="mb-title">All tasks</h2>
                    <p className="mt-1 text-sm text-ink-2">Select Edit to change details or Delete to remove a task.</p>
                  </div>
                  <span className="mb-chip mb-num">{tasks.length} total</span>
                </div>

                {tasksLoading ? (
                  <p className="py-10 text-center text-sm text-ink-3">Loading your tasks...</p>
                ) : tasks.length === 0 ? (
                  <div className="grid items-center gap-6 rounded-xl bg-tray-2 p-5 sm:grid-cols-[220px_1fr] sm:p-6">
                    <img src={readingArt} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                    <div>
                      <h3 className="mb-title">Your task list is clear</h3>
                      <p className="mt-1 text-sm text-ink-2">Create a task to start planning your workload.</p>
                      <button type="button" onClick={() => { setCreateTaskError(''); setIsCreateModalOpen(true) }} className="mb-btn mt-5">Create your first task</button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-dashed divide-rule border-t border-dashed border-rule">
                    {tasks.map((task) => {
                      const done = task.status === 'completed'
                      const priority = task.priority.toLowerCase()
                      const updating = updatingTaskIds.includes(task.id)
                      return (
                        <article key={task.id} className="py-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <input type="checkbox" aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`} checked={done} disabled={updating} onChange={() => void handleToggleTask(task)} className="mt-1 h-[17px] w-[17px] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`break-words text-base font-medium ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</h3>
                                <span className={`mb-chip ${priorityChip(priority)}`}>{task.priority} priority</span>
                                <span className={`mb-chip ${done ? 'mb-chip--blue' : ''}`}>{done ? 'Completed' : 'Pending'}</span>
                              </div>
                              <p className="mt-1.5 max-w-[70ch] whitespace-pre-wrap break-words text-sm leading-6 text-ink-2">{task.description || 'No description provided.'}</p>
                              <div className="mb-mono mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-ink-3">
                                <span>Task ID: {task.id}</span>
                                {task.estimated_minutes != null && <span>Estimated time: {task.estimated_minutes} min</span>}
                                {task.due_at && <span>Due: {new Date(task.due_at).toLocaleString()}</span>}
                                {updating && <span className="text-blue-ink">Saving status...</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2 sm:justify-end">
                              <button type="button" disabled={updating} onClick={() => openEditModal(task)} className="mb-btn-ghost mb-btn-sm"><Icon name="edit" size={15} /> Edit</button>
                              <button type="button" disabled={updating} onClick={() => { setTaskToDelete(task); setDeleteTaskError('') }} className="mb-btn-ghost mb-btn-sm mb-btn-danger"><Icon name="trash" size={15} /> Delete</button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
                {tasksError && <p role="alert" className="mb-alert mt-4">{tasksError}</p>}
              </div>
            </section>
          ) : (
            <>
          {/* Welcome section */}
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="mb-display">
                A little progress <span className="mb-quiet">goes a long way.</span>
              </h1>

              <p className="mt-2 text-base text-ink-2">
                Organise your work, protect your focus, and make time to recharge.
              </p>
            </div>

            <span className="mb-chip w-fit">
              Live tasks · Sample analytics
            </span>
          </section>

          {/* Landscape band with live task tags */}
          <section className="relative mb-6 h-[200px] overflow-hidden rounded-2xl bg-wash sm:h-[260px]">
            <img src={peaksArt} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_22%]" />
            <div aria-hidden="true">
              <span className="mb-tag left-[11%] top-[27%]" style={tagStyle('var(--color-blue-ink)')}>
                Completed <span className="mb-num">{completedTasks}/{tasks.length}</span>
              </span>
              <span className="mb-tag left-[76%] top-[30%] hidden sm:inline-flex" style={tagStyle('var(--color-violet-ink)')}>
                Remaining <span className="mb-num">{remaining}</span>
              </span>
              <span className="mb-tag left-[41%] top-[30%]" style={tagStyle('var(--color-pink-ink)')}>
                Focus <span className="mb-num">{formatTime(seconds)}</span>
              </span>
            </div>
            <p className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-2">
              Ferdinand Hodler, <i>Eiger, Mönch and Jungfrau</i>, 1908
            </p>
          </section>

          {/* Summary cards */}
          <section className={metricStrip4}>
            <MetricCard
              label="Tasks completed"
              value={`${completedTasks}/${tasks.length}`}
              note="Saved in your workspace"
              icon="check"
            />

            <MetricCard
              label="Tasks remaining"
              value={String(remaining)}
              note="Tasks not yet completed"
              icon="tasks"
            />

            <MetricCard
              label="Focus timer"
              value="25 min"
              note="A fresh focus session"
              icon="focus"
            />

            <MetricCard
              label="Fatigue estimate"
              value="Not calculated"
              note="See Analytics for your estimate"
              icon="spark"
            />
          </section>

          {/* Workload and focus */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="mb-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="mb-title">
                    Workload overview
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">
                    A sample view of your weekly activity
                  </p>
                </div>

                <span className="mb-chip">
                  This week
                </span>
              </div>

              <div className="mt-8 flex h-[190px] items-end justify-between gap-3 border-b border-dashed border-rule px-1 sm:gap-5">
                {week.map((item) => (
                  <div
                    key={item.day}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[38px] rounded-t-md transition-colors duration-200 ${
                          item.day === 'Thu'
                            ? 'bg-blue'
                            : 'bg-tray hover:bg-[#e2e2e2]'
                        }`}
                        style={{ height: `${item.value}%` }}
                        title={`${item.value} sample activity units`}
                      />
                    </div>

                    <span className="mb-mono mb-3 text-ink-3">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-ink-3">
                Illustrative chart only. Real workload trends will appear after
                analytics API integration.
              </p>
            </div>

            {/* Focus timer */}
            <div className="mb-card flex flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="mb-title">
                    Focus room
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">
                    One thing at a time.
                  </p>
                </div>

                <Icon name="focus" size={20} className="text-ink-3" />
              </div>

              <div className="my-6 flex flex-1 flex-col items-center justify-center rounded-xl bg-tray-2 px-4 py-7">
                <div className="mb-num text-[64px] leading-none">
                  {formatTime(seconds)}
                </div>

                <div className="mt-3 text-sm text-ink-2">
                  {seconds === 0
                    ? 'Session complete'
                    : timerRunning
                      ? 'Stay present'
                      : 'Ready when you are'}
                </div>

                <p className="mt-4 text-center text-xs text-ink-3">
                  Suggested focus interval · 25 minutes
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTimerRunning((running) => !running)}
                  disabled={seconds === 0}
                  className="mb-btn flex-1"
                >
                  {timerRunning ? 'Pause session' : 'Start focusing'}
                </button>

                <button
                  onClick={resetTimer}
                  className="mb-btn-ghost"
                >
                  Reset
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-ink-3">
                Preview timer only · Sessions are not saved yet
              </p>
            </div>
          </section>

          {/* Tasks and wellbeing */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="mb-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="mb-title">
                    Your tasks
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">
                    Small steps make meaningful progress.
                  </p>
                </div>

                <button
                  onClick={() => setActivePage('My tasks')}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink hover:text-blue-ink"
                >
                  View all <Icon name="arrow" size={15} />
                </button>
              </div>

              <div className="mt-5 divide-y divide-dashed divide-rule">
                {tasksLoading ? (
                  <p className="py-6 text-sm text-ink-3">Loading your tasks...</p>
                ) : tasks.length === 0 ? (
                  <div className="py-6">
                    <p className="text-sm text-ink-2">No tasks yet. Create your first task to get started.</p>
                    {tasksError && <p role="alert" className="mb-alert mt-3">{tasksError}</p>}
                  </div>
                ) : (
                  tasks.map((task) => {
                    const done = task.status === 'completed'
                    const priority = task.priority.toLowerCase()
                    const updating = updatingTaskIds.includes(task.id)
                    return (
                      <div key={task.id} className="flex items-center gap-3 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`}
                          checked={done}
                          disabled={updating}
                          onChange={() => void handleToggleTask(task)}
                          className="h-[17px] w-[17px] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[15px] font-medium ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</p>
                          <p className="mt-0.5 truncate text-xs text-ink-3">{task.description || 'General task'}{updating ? ' · Saving...' : ''}</p>
                        </div>
                        <span className={`mb-chip ${priorityChip(priority)}`}>{task.priority}</span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button type="button" disabled={updating} onClick={() => openEditModal(task)} className="rounded-full p-2 text-ink-3 hover:bg-tray hover:text-ink disabled:opacity-40" aria-label={`Edit ${task.title}`}><Icon name="edit" size={16} /></button>
                          <button type="button" disabled={updating} onClick={() => { setTaskToDelete(task); setDeleteTaskError('') }} className="rounded-full p-2 text-ink-3 hover:bg-tray hover:text-danger disabled:opacity-40" aria-label={`Delete ${task.title}`}><Icon name="trash" size={16} /></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {tasksError && tasks.length > 0 && <p role="alert" className="mb-alert mt-3">{tasksError}</p>}
              <p className="mt-3 text-xs text-ink-3">Tasks are saved to your MindBlaze account.</p>
            </div>

            {/* Wellbeing card */}
            <div className="mb-card overflow-hidden">
              <img src={readingArt} alt="" className="h-40 w-full object-cover object-[50%_35%]" />

              <div className="p-5 sm:p-6">
                <h2 className="mb-title">
                  Your wellbeing matters
                </h2>

                <p className="mt-2 text-sm leading-6 text-ink-2">
                  A full task list doesn't mean you have to do everything at once.
                  Try taking a short break between demanding activities.
                </p>

                <div className="mb-note mt-5">
                  <p className="font-medium">
                    A gentle reminder
                  </p>

                  <p className="mt-1 text-xs leading-5 text-ink-2">
                    Check in with yourself, notice interruptions, and make room
                    for rest when you need it.
                  </p>
                </div>

                <p className="mt-4 text-xs leading-5 text-ink-3">
                  MindBlaze fatigue estimates are experimental indicators, not
                  medical diagnoses.
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  Art: Carl Larsson, <i>Holiday Reading</i>, 1916
                </p>
              </div>
            </div>
          </section>

          <footer className="mb-rule mt-10 py-8 text-center text-xs text-ink-3">
            MindBlaze · Work thoughtfully. Rest intentionally.
          </footer>
            </>
          )}
        </div>
      </main>

      {/* Create task modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingTask) setIsCreateModalOpen(false)
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="create-task-title" className="w-full max-w-lg rounded-2xl bg-canvas p-6 shadow-[var(--shadow-dialog)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="create-task-title" className="mb-title !text-2xl">Create a task</h2>
                <p className="mt-1 text-sm text-ink-2">Add the details and we'll save it to your workspace.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={isCreatingTask} onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-ink-3 hover:bg-tray hover:text-ink disabled:opacity-40"><Icon name="close" /></button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-5">
              <div>
                <label htmlFor="task-title" className="mb-label">Task title <span className="text-danger">*</span></label>
                <input id="task-title" autoFocus required maxLength={200} value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="e.g. Complete MindBlaze API integration" className="mb-input" />
              </div>

              <div>
                <label htmlFor="task-description" className="mb-label">Description <span className="font-normal text-ink-3">(optional)</span></label>
                <textarea id="task-description" rows={3} maxLength={2000} value={newTaskDescription} onChange={(event) => setNewTaskDescription(event.target.value)} placeholder="What needs to be done?" className="mb-input resize-y" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-priority" className="mb-label">Priority</label>
                  <select id="task-priority" value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value)} className="mb-input">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-minutes" className="mb-label">Estimated minutes</label>
                  <input id="task-minutes" type="number" min="1" max="1440" value={newTaskMinutes} onChange={(event) => setNewTaskMinutes(event.target.value)} placeholder="25" className="mb-input mb-num" />
                </div>
              </div>

              {createTaskError && <p role="alert" className="mb-alert">{createTaskError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={isCreatingTask} onClick={() => setIsCreateModalOpen(false)} className="mb-btn-ghost">Cancel</button>
                <button type="submit" disabled={isCreatingTask || !newTaskTitle.trim()} className="mb-btn">{isCreatingTask ? 'Saving task...' : 'Create task'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Edit task modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingEdit) setEditingTask(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-task-title" className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-canvas p-6 shadow-[var(--shadow-dialog)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-task-title" className="mb-title !text-2xl">Edit task</h2>
                <p className="mt-1 text-sm text-ink-2">Update the details of this task.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={isSavingEdit} onClick={() => setEditingTask(null)} className="rounded-full p-2 text-ink-3 hover:bg-tray hover:text-ink disabled:opacity-40"><Icon name="close" /></button>
            </div>
            <form onSubmit={handleEditTask} className="space-y-5">
              <div>
                <label htmlFor="edit-task-title-input" className="mb-label">Task title *</label>
                <input id="edit-task-title-input" required maxLength={200} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mb-input" />
              </div>
              <div>
                <label htmlFor="edit-task-description" className="mb-label">Description</label>
                <textarea id="edit-task-description" rows={3} maxLength={2000} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mb-input resize-y" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-task-priority" className="mb-label">Priority</label>
                  <select id="edit-task-priority" value={editPriority} onChange={(event) => setEditPriority(event.target.value)} className="mb-input">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-task-minutes" className="mb-label">Estimated minutes</label>
                  <input id="edit-task-minutes" type="number" min="1" max="1440" value={editMinutes} onChange={(event) => setEditMinutes(event.target.value)} className="mb-input mb-num" />
                </div>
              </div>
              {editTaskError && <p role="alert" className="mb-alert">{editTaskError}</p>}
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSavingEdit} onClick={() => setEditingTask(null)} className="mb-btn-ghost">Cancel</button>
                <button type="submit" disabled={isSavingEdit || !editTitle.trim()} className="mb-btn">{isSavingEdit ? 'Saving changes...' : 'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete confirmation modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 px-4 py-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingTask) setTaskToDelete(null) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title" className="w-full max-w-md rounded-2xl bg-canvas p-6 shadow-[var(--shadow-dialog)] sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(196_47_58/0.08)] text-danger"><Icon name="trash" size={20} /></div>
            <h2 id="delete-task-title" className="mb-title mt-4">Delete this task?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-2">You're about to delete <strong className="font-medium text-ink">{taskToDelete.title}</strong>. This action cannot be undone.</p>
            {deleteTaskError && <p role="alert" className="mb-alert mt-4">{deleteTaskError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isDeletingTask} onClick={() => setTaskToDelete(null)} className="mb-btn-ghost">Cancel</button>
              <button type="button" disabled={isDeletingTask} onClick={() => void handleDeleteTask()} className="mb-btn !bg-danger hover:!bg-[#a5252f]">{isDeletingTask ? 'Deleting...' : 'Delete task'}</button>
            </div>
          </section>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-dashed border-rule bg-canvas px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        {navigation.map((item) => (
          <button
            key={item.label}
            onClick={() => setActivePage(item.label)}
            className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] ${
              activePage === item.label
                ? 'font-medium text-ink'
                : 'text-ink-3'
            }`}
          >
            <Icon name={item.icon} size={20} className={activePage === item.label ? 'text-blue-ink' : ''} />

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

  // Display-only: the factor scores the estimate already returned, drawn as tags over the band.
  const factorTags = Object.entries(
    (fatigueEstimate?.factors ?? {}) as Record<string, number>,
  ).slice(0, 4)
  const tagSpots = [
    { color: 'var(--color-blue-ink)', spot: 'left-[12%] top-[46%]' },
    { color: 'var(--color-violet-ink)', spot: 'left-[64%] top-[44%]' },
    { color: 'var(--color-pink-ink)', spot: 'left-[36%] top-[36%]' },
    { color: 'var(--color-amber-ink)', spot: 'left-[84%] top-[52%]' },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-display">Analytics overview. <span className="mb-quiet">Your patterns.</span></h1>
          <p className="mt-2 text-base text-ink-2">
            Understand your workload, focus time, breaks, and interruptions.
          </p>
        </div>
        <span className="mb-chip mb-chip--blue w-fit">
          Live data · Your account
        </span>
      </div>

      {loading ? (
        <div className="mb-card p-8 text-center text-sm text-ink-3">
          Loading your analytics...
        </div>
      ) : error ? (
        <div className="mb-card p-6">
          <p role="alert" className="mb-alert">{error}</p>
          <p className="mt-3 text-sm text-ink-2">
            Check that the backend is running and that you are logged in.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mb-btn mt-4"
          >
            Reload analytics
          </button>
        </div>
      ) : (
        <>
          <div className="relative h-[180px] overflow-hidden rounded-2xl bg-wash sm:h-[220px]">
            <img src={lakeRangeArt} alt="" className="absolute inset-0 h-full w-full object-cover object-[30%_60%]" />
            <div aria-hidden="true">
              {factorTags.map(([factor, score], index) => (
                <span
                  key={factor}
                  className={`mb-tag ${tagSpots[index].spot} ${index > 1 ? 'hidden sm:inline-flex' : ''}`}
                  style={tagStyle(tagSpots[index].color)}
                >
                  <span className="first-letter:uppercase">{factor.replace(/_/g, ' ')}</span>
                  <span className="mb-num">{displayValue(score)}</span>
                </span>
              ))}
            </div>
            <p className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-2">
              Ferdinand Hodler, <i>Lake Thun with the Stockhorn Range</i>, 1910
            </p>
          </div>

          <div className={metricStrip4}>
            <MetricCard label="Total tasks" value={String(analytics?.total_tasks ?? 0)} note="Tasks in your workspace" icon="tasks" />
            <MetricCard label="Completed" value={String(analytics?.completed_tasks ?? 0)} note="Successfully finished" icon="check" />
            <MetricCard label="Pending tasks" value={String(analytics?.pending_tasks ?? 0)} note={`${analytics?.estimated_pending_minutes ?? 0} estimated minutes remaining`} icon="focus" />
            <MetricCard label="Completion rate" value={`${analytics?.completion_rate_percent ?? 0}%`} note="Completed tasks out of all tasks" icon="analytics" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="mb-card p-5 sm:p-6">
              <div>
                <h2 className="mb-title">Daily work activity</h2>
                <p className="mt-1 text-sm text-ink-2">Work minutes over the last seven days</p>
              </div>

              {dailyActivity.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-3">No daily activity data is available yet.</p>
              ) : (
                <div className="mt-8 flex h-[220px] items-end justify-between gap-2 border-b border-dashed border-rule px-1 sm:gap-4">
                  {dailyActivity.map((day) => {
                    const height = day.work_minutes > 0
                      ? Math.max(5, (day.work_minutes / maxWorkMinutes) * 100)
                      : 2
                    return (
                      <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                        <span className="mb-num text-[11px] text-ink-2 sm:text-xs">
                          {day.work_minutes}
                        </span>
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className="w-full max-w-[38px] rounded-t-md bg-blue transition-colors hover:bg-blue-ink"
                            style={{ height: `${height}%` }}
                            title={`${day.work_minutes} work minutes`}
                          />
                        </div>
                        <span className="mb-mono mb-3 text-ink-3">
                          {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-ink-3">Bars show completed work time after subtracting recorded breaks.</p>
            </div>

            <div className="mb-card p-5 sm:p-6">
              <h2 className="mb-title">Focus & recovery</h2>
              <p className="mt-1 text-sm text-ink-2">Totals from your saved work logs</p>
              <dl className="mt-5 divide-y divide-dashed divide-rule border-y border-dashed border-rule">
                <div className="flex items-center justify-between py-3.5">
                  <dt className="text-sm text-ink-2">Actual focus time</dt>
                  <dd className="mb-num text-sm">{analytics?.actual_focus_minutes ?? 0} min</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="text-sm text-ink-2">Break minutes (7 days)</dt>
                  <dd className="mb-num text-sm">{dailyActivity.reduce((sum, day) => sum + day.break_minutes, 0)} min</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="text-sm text-ink-2">Interruptions (7 days)</dt>
                  <dd className="mb-num text-sm">{dailyActivity.reduce((sum, day) => sum + day.interruptions, 0)}</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="text-sm text-ink-2">Completed sessions (7 days)</dt>
                  <dd className="mb-num text-sm">{dailyActivity.reduce((sum, day) => sum + day.sessions, 0)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mb-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Icon name="spark" size={20} className="mt-1 shrink-0 text-violet-ink" />
              <div>
                <h2 className="mb-title">Mental fatigue estimate</h2>
                <p className="mt-1 max-w-[70ch] text-sm leading-6 text-ink-2">
                  Experimental estimate based on your current workload and recorded work patterns. It is not a medical diagnosis.
                </p>
              </div>
            </div>

            {!fatigueEstimate || fatigueEntries.length === 0 ? (
              <p className="mt-5 rounded-xl bg-tray-2 p-4 text-sm text-ink-2">
                No fatigue estimate details were returned. Add tasks and complete work-log sessions, then refresh this page.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fatigueEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-tray-2 p-4">
                    <p className="text-xs capitalize text-ink-3">{key.replace(/_/g, ' ')}</p>
                    <p className={`mt-2 break-words ${displayValue(value).length > 24 ? 'text-sm leading-6 text-ink-2' : 'mb-num text-xl capitalize'}`}>
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
  icon: IconName
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">{label}</p>
        <Icon name={icon} size={17} className="text-ink-3" />
      </div>

      <p className="mb-num mt-4 break-words text-[22px] leading-tight sm:mt-5 sm:text-[28px]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-ink-3">{note}</p>
    </div>
  )
}

export default Dashboard
