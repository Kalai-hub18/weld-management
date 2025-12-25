import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import WorkersPage from './WorkersPage'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockWorkerService = vi.hoisted(() => ({
  getAllWorkers: vi.fn(),
  createWorker: vi.fn(),
  updateWorker: vi.fn(),
  deleteWorker: vi.fn(),
}))

vi.mock('../../services/workerService', () => ({
  default: mockWorkerService,
}))

// Make the modal components test-friendly: expose a single button when open=true.
vi.mock('../../components/workers/AddWorkerModal', () => ({
  default: ({ open, onAdd }) =>
    open ? (
      <button onClick={() => onAdd({ name: 'New Worker', email: 'new@example.com', department: 'Field Operations', position: 'Welder' })}>
        Mock Submit Add
      </button>
    ) : null,
}))

vi.mock('../../components/workers/EditWorkerDialog', () => ({
  default: ({ open, worker, onSave }) =>
    open ? (
      <button onClick={() => onSave({ ...worker, name: 'Updated Worker' })}>
        Mock Submit Edit
      </button>
    ) : null,
}))

vi.mock('../../components/workers/DeleteWorkerDialog', () => ({
  default: ({ open, onConfirm }) =>
    open ? (
      <button onClick={() => onConfirm({ action: 'delete' })}>
        Mock Confirm Delete
      </button>
    ) : null,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkersPage />
    </MemoryRouter>
  )
}

describe('WorkersPage CRUD wiring', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists workers from API', async () => {
    mockWorkerService.getAllWorkers.mockResolvedValue({
      success: true,
      data: [
        { _id: 'w1', name: 'Ravi', department: 'Field Operations', position: 'Welder', status: 'active', skills: [] },
      ],
    })

    renderPage()

    expect(await screen.findByText('Ravi')).toBeInTheDocument()
    expect(mockWorkerService.getAllWorkers).toHaveBeenCalledTimes(1)
  })

  it('creates a worker and prepends to list', async () => {
    mockWorkerService.getAllWorkers.mockResolvedValue({
      success: true,
      data: [],
    })
    mockWorkerService.createWorker.mockResolvedValue({
      success: true,
      data: { _id: 'w2', name: 'New Worker', department: 'Field Operations', position: 'Welder', status: 'active' },
    })

    renderPage()
    await waitFor(() => expect(mockWorkerService.getAllWorkers).toHaveBeenCalledTimes(1))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /add worker/i }))
    await user.click(screen.getByRole('button', { name: /mock submit add/i }))

    expect(mockWorkerService.createWorker).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('New Worker')).toBeInTheDocument()
  })

  it('edits a worker and updates the list item', async () => {
    mockWorkerService.getAllWorkers.mockResolvedValue({
      success: true,
      data: [
        { _id: 'w1', name: 'Ravi', department: 'Field Operations', position: 'Welder', status: 'active', skills: [] },
      ],
    })
    mockWorkerService.updateWorker.mockResolvedValue({
      success: true,
      data: { _id: 'w1', name: 'Updated Worker', department: 'Field Operations', position: 'Welder', status: 'active', skills: [] },
    })

    renderPage()
    expect(await screen.findByText('Ravi')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Worker actions for Ravi'))
    await user.click(await screen.findByRole('menuitem', { name: /edit worker/i }))
    await user.click(screen.getByRole('button', { name: /mock submit edit/i }))

    expect(mockWorkerService.updateWorker).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Updated Worker')).toBeInTheDocument()
  })

  it('deletes a worker and removes it from list', async () => {
    mockWorkerService.getAllWorkers.mockResolvedValue({
      success: true,
      data: [
        { _id: 'w1', name: 'Ravi', department: 'Field Operations', position: 'Welder', status: 'active', skills: [] },
      ],
    })
    mockWorkerService.deleteWorker.mockResolvedValue({
      success: true,
      message: 'Worker deleted successfully',
    })

    renderPage()
    expect(await screen.findByText('Ravi')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Worker actions for Ravi'))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))
    await user.click(screen.getByRole('button', { name: /mock confirm delete/i }))

    expect(mockWorkerService.deleteWorker).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText('Ravi')).not.toBeInTheDocument())
  })
})


