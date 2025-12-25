import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import ProjectsPage from './ProjectsPage'

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ settings: {} }),
}))

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

const mockProjectService = vi.hoisted(() => ({
  getAllProjects: vi.fn(),
  getProjectStats: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

vi.mock('../../services/projectService', () => ({
  default: mockProjectService,
}))

// Make child components test-friendly.
vi.mock('../../components/projects/ProjectCard', () => ({
  default: ({ project, onClick, onEdit, onDelete }) => (
    <div>
      <button onClick={onClick}>Open {project.name}</button>
      <button onClick={() => onEdit(project)}>Edit {project.name}</button>
      <button onClick={() => onDelete(project)}>Delete {project.name}</button>
    </div>
  ),
}))

vi.mock('../../components/projects/AddProjectModal', () => ({
  default: ({ open, onAdd }) =>
    open ? (
      <button
        onClick={() =>
          onAdd({ name: 'New Project', client: 'Client', startDate: '2025-01-01', endDate: '2025-02-01', budget: 1000, priority: 'medium' })
        }
      >
        Mock Submit Add
      </button>
    ) : null,
}))

vi.mock('../../components/projects/EditProjectModal', () => ({
  default: ({ open, project, onSave }) =>
    open ? (
      <button onClick={() => onSave({ ...project, name: 'Updated Project' })}>
        Mock Submit Edit
      </button>
    ) : null,
}))

vi.mock('../../components/projects/DeleteProjectDialog', () => ({
  default: ({ open, onConfirm }) =>
    open ? (
      <button onClick={() => onConfirm('delete')}>
        Mock Confirm Delete
      </button>
    ) : null,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>
  )
}

describe('ProjectsPage CRUD wiring', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists projects from API', async () => {
    mockProjectService.getAllProjects.mockResolvedValue({ data: [{ _id: 'p1', name: 'Proj1', client: 'C', projectId: 'P001', status: 'pending', priority: 'medium', endDate: '2025-02-01', budget: 1000, progress: 0 }] })
    mockProjectService.getProjectStats.mockResolvedValue({ success: true, data: { overview: { totalProjects: 1, totalBudget: 1000 }, byStatus: [{ _id: 'pending', count: 1 }] } })

    renderPage()
    expect(await screen.findByText('Open Proj1')).toBeInTheDocument()
    expect(mockProjectService.getAllProjects).toHaveBeenCalled()
  })

  it('creates a project and prepends to list', async () => {
    const created = { _id: 'p2', name: 'New Project', client: 'Client', projectId: 'P002', status: 'pending', priority: 'medium', endDate: '2025-02-01', budget: 1000, progress: 0 }
    mockProjectService.getAllProjects
      .mockResolvedValueOnce({ data: [] }) // initial load
      .mockResolvedValueOnce({ data: [created] }) // refresh after create
    mockProjectService.getProjectStats.mockResolvedValue({ success: true, data: { overview: { totalProjects: 0, totalBudget: 0 }, byStatus: [] } })
    mockProjectService.createProject.mockResolvedValue({ data: created })

    renderPage()
    await waitFor(() => expect(mockProjectService.getAllProjects).toHaveBeenCalled())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /new project/i }))
    await user.click(screen.getByRole('button', { name: /mock submit add/i }))

    expect(mockProjectService.createProject).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Open New Project')).toBeInTheDocument()
  })

  it('edits a project and updates the list item', async () => {
    const initial = { _id: 'p1', name: 'Proj1', client: 'C', projectId: 'P001', status: 'pending', priority: 'medium', endDate: '2025-02-01', budget: 1000, progress: 0 }
    const updated = { ...initial, name: 'Updated Project' }
    mockProjectService.getAllProjects
      .mockResolvedValueOnce({ data: [initial] }) // initial load
      .mockResolvedValueOnce({ data: [updated] }) // refresh after edit
    mockProjectService.getProjectStats.mockResolvedValue({ success: true, data: { overview: { totalProjects: 1, totalBudget: 1000 }, byStatus: [{ _id: 'pending', count: 1 }] } })
    mockProjectService.updateProject.mockResolvedValue({ data: updated })

    renderPage()
    expect(await screen.findByText('Open Proj1')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /edit proj1/i }))
    await user.click(screen.getByRole('button', { name: /mock submit edit/i }))

    expect(mockProjectService.updateProject).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Open Updated Project')).toBeInTheDocument()
  })

  it('deletes a project and removes it from list', async () => {
    const initial = { _id: 'p1', name: 'Proj1', client: 'C', projectId: 'P001', status: 'pending', priority: 'medium', endDate: '2025-02-01', budget: 1000, progress: 0 }
    mockProjectService.getAllProjects
      .mockResolvedValueOnce({ data: [initial] }) // initial load
      .mockResolvedValueOnce({ data: [] }) // refresh after delete
    mockProjectService.getProjectStats.mockResolvedValue({ success: true, data: { overview: { totalProjects: 1, totalBudget: 1000 }, byStatus: [{ _id: 'pending', count: 1 }] } })
    mockProjectService.deleteProject.mockResolvedValue({ success: true, message: 'deleted' })

    renderPage()
    expect(await screen.findByText('Open Proj1')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /delete proj1/i }))
    await user.click(screen.getByRole('button', { name: /mock confirm delete/i }))

    expect(mockProjectService.deleteProject).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText('Open Proj1')).not.toBeInTheDocument())
  })
})


