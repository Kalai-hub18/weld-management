import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// MUI Components
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'

// MUI Icons
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import FolderIcon from '@mui/icons-material/Folder'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import AssignmentIcon from '@mui/icons-material/Assignment'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

// Components
import ProjectCard from '../../components/projects/ProjectCard'
import AddProjectModal from '../../components/projects/AddProjectModal'
import EditProjectModal from '../../components/projects/EditProjectModal'
import DeleteProjectDialog from '../../components/projects/DeleteProjectDialog'

import { STATUS_COLORS } from '../../constants/projects'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

// Data
import projectService from '../../services/projectService'

const ProjectsPage = () => {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [projectsList, setProjectsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    totalBudget: 0
  })

  const getId = (p) => p?.id || p?._id

  const normalizeStatusFilter = (value) => {
    // UI label "planned" maps to backend enum "pending"
    if (value === 'planned') return 'pending'
    return value
  }

  const fetchProjectsData = async () => {
    try {
      setLoading(true)
      const [projectsRes, statsRes] = await Promise.all([
        projectService.getAllProjects({ limit: 1000 }),
        projectService.getProjectStats()
      ])

      setProjectsList(projectsRes.data || [])

      if (statsRes.success) {
        const overview = statsRes.data.overview
        const byStatus = statsRes.data.byStatus || []

        const inProgressCount = byStatus.find(s => s._id === 'in-progress')?.count || 0
        const completedCount = byStatus.find(s => s._id === 'completed')?.count || 0

        setStats({
          total: overview.totalProjects || 0,
          inProgress: inProgressCount,
          completed: completedCount,
          totalBudget: overview.totalBudget || 0
        })
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectsData()
  }, [])

  // Filter projects
  const filteredProjects = useMemo(() => {
    const normalizedStatus = normalizeStatusFilter(statusFilter)
    return projectsList.filter(project => {
      const matchesSearch =
        (project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.projectId || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = normalizedStatus === 'all' || project.status === normalizedStatus
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [projectsList, searchTerm, statusFilter, priorityFilter])

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`)
  }

  // Menu handlers for list view
  const handleMenuOpen = (event, project) => {
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
    setSelectedProject(project)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setSelectedProject(null)
  }

  // Edit handlers
  const handleEditClick = (project) => {
    setProjectToEdit(project)
    setEditModalOpen(true)
    handleMenuClose()
  }

  const handleEditSave = async (updatedProject) => {
    try {
      const id = getId(updatedProject)
      if (!id) throw new Error('Missing project id')
      const response = await projectService.updateProject(id, {
        ...updatedProject,
        status: normalizeStatusFilter(updatedProject.status),
      })
      setProjectsList(prev =>
        prev.map(p => getId(p) === id ? response.data : p)
      )
      // Refresh stats if status/budget changed
      fetchProjectsData()
      setEditModalOpen(false)
      setProjectToEdit(null)
      toast.success(`${updatedProject.name} updated successfully!`)
    } catch (error) {
      console.error('Error updating project:', error)
      const details = error.response?.data?.errors?.[0]?.message
      toast.error(details || error.response?.data?.message || 'Failed to update project')
    }
  }

  // Delete handlers
  const handleDeleteClick = (project) => {
    setProjectToDelete(project)
    setDeleteModalOpen(true)
    handleMenuClose()
  }

  const handleDeleteConfirm = async (action) => {
    try {
      const id = getId(projectToDelete)
      if (!id) throw new Error('Missing project id')
      if (action === 'archive') {
        const response = await projectService.updateProject(id, { status: 'cancelled' })
        setProjectsList(prev =>
          prev.map(p => getId(p) === id ? response.data : p)
        )
        toast.success(`${projectToDelete.name} has been archived`)
      } else {
        await projectService.deleteProject(id)
        setProjectsList(prev => prev.filter(p => getId(p) !== id))
        toast.success(`${projectToDelete.name} has been deleted`)
      }
      fetchProjectsData() // Refresh stats
      setDeleteModalOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('Error deleting project:', error)
      const details = error.response?.data?.errors?.[0]?.message
      toast.error(details || error.response?.data?.message || 'Failed to delete project')
    }
  }

  // Add project handler
  // Add project handler
  const handleAddProject = async (newProjectData) => {
    try {
      const response = await projectService.createProject({
        ...newProjectData,
        status: normalizeStatusFilter(newProjectData.status),
      })
      setProjectsList(prev => [response.data, ...prev])
      fetchProjectsData() // Refresh stats
      toast.success(`${response.data.name} created successfully!`)
    } catch (error) {
      console.error('Error creating project:', error)
      const details = error.response?.data?.errors?.[0]?.message
      toast.error(details || error.response?.data?.message || 'Failed to create project')
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Projects
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage and track all welding projects
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start lg:self-auto"
        >
          <AddIcon fontSize="small" />
          New Project
        </button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FolderIcon}
          label="Total Projects"
          value={stats.total}
          color="primary"
        />
        <StatCard
          icon={TrendingUpIcon}
          label="In Progress"
          value={stats.inProgress}
          color="warning"
        />
        <StatCard
          icon={AssignmentIcon}
          label="Completed"
          value={stats.completed}
          color="success"
        />
        <StatCard
          icon={AttachMoneyIcon}
          label="Total Budget"
          value={formatCurrency(stats.totalBudget, settings)}
          color="info"
        />
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <TextField
          placeholder="Search projects..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-neutral-400" />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px' },
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${showFilters
                ? 'bg-primary text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
          >
            <FilterListIcon fontSize="small" />
            Filters
          </button>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <IconButton
              size="small"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <GridViewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </motion.div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="premium-card p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="Priority"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Active Filters */}
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
              <span className="text-sm text-neutral-500">Active:</span>
              {statusFilter !== 'all' && (
                <Chip
                  size="small"
                  label={STATUS_COLORS[statusFilter]?.label || statusFilter}
                  onDelete={() => setStatusFilter('all')}
                  sx={{
                    backgroundColor: STATUS_COLORS[statusFilter]?.light,
                    color: STATUS_COLORS[statusFilter]?.text,
                  }}
                />
              )}
              {priorityFilter !== 'all' && (
                <Chip
                  size="small"
                  label={priorityFilter}
                  onDelete={() => setPriorityFilter('all')}
                  color="secondary"
                  variant="outlined"
                  className="capitalize"
                />
              )}
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setPriorityFilter('all')
                }}
                className="text-sm text-primary hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Projects Grid/List */}
      {viewMode === 'grid' ? (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={getId(project)}
              variants={itemVariants}
              transition={{ delay: index * 0.05 }}
            >
              <ProjectCard
                project={project}
                onClick={() => handleProjectClick(getId(project))}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="premium-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Project</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Client</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Progress</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Deadline</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Budget</th>
                <th className="text-center p-4 text-sm font-semibold text-neutral-500 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={getId(project)}
                  onClick={() => handleProjectClick(getId(project))}
                  className="border-b border-light-border dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-light-text dark:text-dark-text">{project.name}</p>
                      <p className="text-xs text-neutral-500">{project.projectId}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{project.client}</td>
                  <td className="p-4">
                    <Chip
                      size="small"
                      label={STATUS_COLORS[project.status]?.label}
                      sx={{
                        backgroundColor: STATUS_COLORS[project.status]?.light,
                        color: STATUS_COLORS[project.status]?.text,
                        fontWeight: 600,
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor: STATUS_COLORS[project.status]?.bg,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">
                    {formatDate(project.endDate, settings)}
                  </td>
                  <td className="p-4 text-sm font-medium text-light-text dark:text-dark-text">
                    {formatCurrency(project.budget, settings)}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      aria-label={`Project actions for ${project.name}`}
                      onClick={(e) => handleMenuOpen(e, project)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* List View Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 160 },
        }}
      >
        <MenuItem onClick={() => {
          handleProjectClick(getId(selectedProject))
          handleMenuClose()
        }}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleEditClick(selectedProject)}>
          <EditIcon fontSize="small" className="mr-2 text-info" />
          Edit Project
        </MenuItem>
        <MenuItem onClick={() => handleDeleteClick(selectedProject)} className="!text-danger">
          <DeleteIcon fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="premium-card p-12 text-center"
        >
          <FolderIcon className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" sx={{ fontSize: 64 }} />
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            No projects found
          </h3>
          <p className="text-neutral-500 mb-4">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setPriorityFilter('all')
            }}
            className="text-primary hover:underline"
          >
            Clear all filters
          </button>
        </motion.div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddProject}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setProjectToEdit(null)
        }}
        project={projectToEdit}
        onSave={handleEditSave}
      />

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setProjectToDelete(null)
        }}
        project={projectToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </motion.div>
  )
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
    success: 'from-success/10 to-success/5 border-success/20 text-success',
    warning: 'from-warning/10 to-warning/5 border-warning/20 text-warning',
    info: 'from-info/10 to-info/5 border-info/20 text-info',
  }

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon fontSize="small" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default ProjectsPage
