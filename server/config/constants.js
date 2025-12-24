// User Roles
export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  WORKER: 'Worker',
}

// Role Permissions
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    canManageWorkers: true,
    canDeleteWorkers: true,
    canManageProjects: true,
    canManageTasks: true,
    canManageSalary: true,
    canManageAttendance: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSettings: true,
    canViewAllData: true,
  },
  [ROLES.MANAGER]: {
    canManageWorkers: true,
    canDeleteWorkers: false,
    canManageProjects: false,
    canManageTasks: true,
    canManageSalary: false,
    canManageAttendance: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSettings: false,
    canViewAllData: false,
    canViewSalary: true,
    canViewProjects: true,
  },
  [ROLES.WORKER]: {
    canManageWorkers: false,
    canDeleteWorkers: false,
    canManageProjects: false,
    canManageTasks: false,
    canManageSalary: false,
    canManageAttendance: false,
    canViewDashboard: false,
    canViewReports: false,
    canManageSettings: false,
    canViewAllData: false,
    canViewOwnProfile: true,
    canViewOwnTasks: true,
    canMarkOwnAttendance: true,
  },
}

// Status Constants
export const PROJECT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold',
  CANCELLED: 'cancelled',
}

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half-day',
  ON_LEAVE: 'on-leave',
}

export const SALARY_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
}

export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ON_LEAVE: 'on-leave',
}
