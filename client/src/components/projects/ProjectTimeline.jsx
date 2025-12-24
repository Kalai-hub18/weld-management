import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'

// MUI Icons (used for empty state)
import AssignmentIcon from '@mui/icons-material/Assignment'

const STATUS_UI = {
  pending: { label: 'Pending', bg: '#F59E0B', light: '#FEF3C7', text: '#92400E' },
  'in-progress': { label: 'In Progress', bg: '#FF6A00', light: '#FFF5EB', text: '#CC5500' },
  'on-hold': { label: 'On Hold', bg: '#0EA5E9', light: '#E0F2FE', text: '#0369A1' },
  completed: { label: 'Completed', bg: '#22C55E', light: '#DCFCE7', text: '#166534' },
  cancelled: { label: 'Cancelled', bg: '#EF4444', light: '#FEE2E2', text: '#991B1B' },
}

const toDateKey = (task) => {
  const d = task?.date || task?.dueDate
  if (!d) return ''
  const iso = new Date(d)
  if (Number.isNaN(iso.getTime())) return ''
  return iso.toISOString().split('T')[0]
}

const formatDateHeader = (key) => {
  if (!key) return 'No Date'
  const dt = new Date(key)
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatCreated = (createdAt) => {
  if (!createdAt) return '-'
  const dt = new Date(createdAt)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EmptyIllustration = () => (
  <div className="relative mx-auto w-32 h-32">
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 blur-[1px]" />
    <div className="absolute inset-2 rounded-2xl bg-white/60 dark:bg-neutral-900/40 border border-light-border dark:border-dark-border flex items-center justify-center">
      <AssignmentIcon sx={{ fontSize: 56 }} className="text-primary" />
    </div>
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-neutral-200/70 dark:bg-neutral-800/60 blur-[1px]" />
  </div>
)

const ProjectTimeline = ({ tasks = [], onTaskClick }) => {
  const groups = useMemo(() => {
    const map = new Map()
    for (const t of tasks || []) {
      const key = toDateKey(t) || 'no-date'
      const arr = map.get(key) || []
      arr.push(t)
      map.set(key, arr)
    }

    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'no-date') return 1
      if (b === 'no-date') return -1
      return b.localeCompare(a) // newest date first
    })

    return keys.map((k) => ({
      key: k,
      label: k === 'no-date' ? 'No Date' : formatDateHeader(k),
      tasks: (map.get(k) || []).sort((a, b) => {
        const ca = new Date(a?.createdAt || 0).getTime()
        const cb = new Date(b?.createdAt || 0).getTime()
        return cb - ca
      }),
    }))
  }, [tasks])

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-10">
        <EmptyIllustration />
        <p className="mt-4 text-lg font-semibold text-light-text dark:text-dark-text">
          No tasks created for this project yet
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Once tasks are created, you’ll see them here grouped by date.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group, groupIdx) => (
        <div key={group.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-500 uppercase">
              {group.label}
            </h4>
            <span className="text-xs text-neutral-400">{group.tasks.length} task(s)</span>
          </div>

          <div className="space-y-3">
            {group.tasks.map((task, idx) => {
              const status = STATUS_UI[task.status] || STATUS_UI.pending
              const workers = task.workers || task.assignedWorkers || []
              const shown = workers.slice(0, 3)
              const extra = Math.max(0, workers.length - shown.length)

              return (
                <motion.button
                  key={task.id || task._id || `${group.key}-${idx}`}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.35, (groupIdx * 0.04) + (idx * 0.02)) }}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full text-left p-4 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-light-text dark:text-dark-text truncate">
                        {task.title || 'Untitled Task'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Created: {formatCreated(task.createdAt)}
                      </p>
                    </div>

                    <Chip
                      size="small"
                      label={status.label}
                      sx={{
                        backgroundColor: status.light,
                        color: status.text,
                        fontWeight: 700,
                        fontSize: '11px',
                        height: '22px',
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {workers.length === 0 ? (
                        <span className="text-sm text-neutral-400">Unassigned</span>
                      ) : (
                        <div className="flex items-center">
                          {shown.map((w, wi) => (
                            <Tooltip key={w._id || w.id || wi} title={w.name || 'Worker'} arrow>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 12,
                                  ml: wi === 0 ? 0 : -0.75,
                                  border: '2px solid white',
                                  background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                                }}
                              >
                                {(w.name || '?').charAt(0)}
                              </Avatar>
                            </Tooltip>
                          ))}
                          {extra > 0 && (
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: 11,
                                ml: -0.75,
                                border: '2px solid white',
                                backgroundColor: 'rgba(17, 24, 39, 0.12)',
                                color: 'rgba(17, 24, 39, 0.8)',
                              }}
                            >
                              +{extra}
                            </Avatar>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-neutral-400">
                      {task.taskId || (task.id || task._id || '').toString().slice(-6)}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProjectTimeline
