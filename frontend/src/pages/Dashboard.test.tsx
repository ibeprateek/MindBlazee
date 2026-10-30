
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { Task } from '../Services/tasks'

const mocks = vi.hoisted(() => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  logoutUser: vi.fn(),
  getWorkloadAnalytics: vi.fn(),
  getFatigueEstimate: vi.fn(),
  getDailyActivity: vi.fn(),
}))

vi.mock('../Services/tasks', () => ({
  getTasks: mocks.getTasks,
  createTask: mocks.createTask,
  updateTask: mocks.updateTask,
  deleteTask: mocks.deleteTask,
}))

vi.mock('../Services/auth', () => ({
  logoutUser: mocks.logoutUser,
  getAccessToken: () => null,
}))

vi.mock('../Services/analytics', () => ({
  getWorkloadAnalytics: mocks.getWorkloadAnalytics,
  getFatigueEstimate: mocks.getFatigueEstimate,
  getDailyActivity: mocks.getDailyActivity,
}))

vi.mock('../components/Worklogs', () => ({
  default: () => <div>Work logs component</div>,
}))

vi.mock('../components/Analytics/FatigueSimulator', () => ({
  default: () => <div>Fatigue simulator</div>,
}))

vi.mock('../components/Analytics/PersonalizedRecommendations', () => ({
  default: () => <div>Personalized recommendations</div>,
}))

vi.mock('../components/Analytics/FeedbackAnalytics.tsx', () => ({
  default: () => <div>Feedback analytics</div>,
}))

const sampleTask: Task = {
  id: 1,
  user_id: 1,
  title: 'Complete project report',
  description: 'Finish the report',
  priority: 'medium',
  status: 'pending',
  estimated_minutes: 30,
  due_at: null,
  completed_at: null,
  created_at: '2026-10-28T10:00:00',
  updated_at: '2026-10-28T10:00:00',
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard task management', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getTasks.mockResolvedValue([{ ...sampleTask }])

    mocks.createTask.mockResolvedValue({
      ...sampleTask,
      id: 2,
      title: 'New test task',
      estimated_minutes: 25,
    })

    mocks.updateTask.mockImplementation(
      async (id: number, changes: Partial<Task>) => ({
        ...sampleTask,
        id,
        ...changes,
      }),
    )

    mocks.deleteTask.mockResolvedValue(undefined)
  })

  it('loads and displays tasks', async () => {
    renderDashboard()

    expect(
      await screen.findByText('Complete project report'),
    ).toBeInTheDocument()

    expect(mocks.getTasks).toHaveBeenCalledOnce()
  })

  it('opens the create-task dialog', async () => {
    renderDashboard()

    await screen.findByText('Complete project report')

    fireEvent.click(
      screen.getByRole('button', { name: /new task/i }),
    )

    expect(
      screen.getByRole('dialog', { name: /create a task/i }),
    ).toBeInTheDocument()
  })

  it('creates a task and displays it', async () => {
    renderDashboard()

    await screen.findByText('Complete project report')

    fireEvent.click(
      screen.getByRole('button', { name: /new task/i }),
    )

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'New test task' },
    })

    fireEvent.click(
      screen.getByRole('button', { name: /^create task$/i }),
    )

    await waitFor(() => {
      expect(mocks.createTask).toHaveBeenCalledWith({
        title: 'New test task',
        description: null,
        priority: 'medium',
        estimated_minutes: 25,
      })
    })

    expect(
      await screen.findByText('New test task'),
    ).toBeInTheDocument()
  })

  it('shows an error when task loading fails', async () => {
    mocks.getTasks.mockRejectedValue(
      new Error('Unable to load tasks'),
    )

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load tasks',
    )
  })

  it('opens the edit dialog with the selected task details', async () => {
    renderDashboard()

    await screen.findByText('Complete project report')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit Complete project report',
      }),
    )

    expect(
      screen.getByRole('dialog', { name: /edit task/i }),
    ).toBeInTheDocument()

    expect(screen.getByLabelText(/task title/i)).toHaveValue(
      'Complete project report',
    )
  })

  it('deletes a task after confirmation', async () => {
    renderDashboard()

    await screen.findByText('Complete project report')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Delete Complete project report',
      }),
    )

    expect(
      screen.getByRole('alertdialog', {
        name: /delete this task/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /^delete task$/i }),
    )

    await waitFor(() => {
      expect(mocks.deleteTask).toHaveBeenCalledWith(1)
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Complete project report'),
      ).not.toBeInTheDocument()
    })
  })
})
