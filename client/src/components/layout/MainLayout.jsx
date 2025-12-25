import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import FolderIcon from '@mui/icons-material/Folder'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import PaymentsIcon from '@mui/icons-material/Payments'
import ReceiptIcon from '@mui/icons-material/Receipt'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import NotificationsIcon from '@mui/icons-material/Notifications'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  const { user, logout, hasPermission } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const location = useLocation()

  const toggleSubmenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }))
  }

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: DashboardIcon,
      permission: 'canViewDashboard',
    },
    {
      name: 'Workers',
      path: '/workers',
      icon: PeopleIcon,
      permission: 'canManageWorkers',
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: FolderIcon,
      permission: 'canViewProjects',
    },
    {
      name: 'Tasks',
      path: '/tasks',
      icon: AssignmentIcon,
      permission: 'canManageTasks',
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: EventAvailableIcon,
      permission: 'canManageAttendance',
    },
    {
      name: 'Salary',
      path: '/salary',
      icon: PaymentsIcon,
      permission: 'canManageSalary',
    },
    {
      name: 'Invoices',
      icon: ReceiptIcon,
      permission: 'canManageSalary',
      submenu: [
        {
          name: 'Project Invoices',
          path: '/invoices/project',
        },
        {
          name: 'Salary Invoices',
          path: '/invoices/salary',
        },
      ],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: SettingsIcon,
      permission: 'canManageSettings',
    },
  ]

  const filteredMenuItems = menuItems.filter(
    item => hasPermission(item.permission) || 
    (item.permission === 'canViewProjects' && hasPermission('canManageProjects')) ||
    (item.permission === 'canManageSalary' && hasPermission('canViewSalary'))
  )

  const sidebarVariants = {
    open: { width: '280px' },
    closed: { width: '80px' },
  }

  return (
    <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border z-40"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-light-border dark:border-dark-border">
          <motion.div
            animate={{ opacity: sidebarOpen ? 1 : 0 }}
            className="flex items-center gap-3"
          >
            {sidebarOpen && (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <span className="font-bold text-lg text-light-text dark:text-dark-text">
                  WeldMS
                </span>
              </>
            )}
          </motion.div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {sidebarOpen ? (
              <CloseIcon className="text-neutral-500" />
            ) : (
              <MenuIcon className="text-neutral-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = item.path && location.pathname === item.path
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isExpanded = expandedMenus[item.name]
              const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location.pathname.startsWith(sub.path))

              return (
                <li key={item.path || item.name}>
                  {hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isSubmenuActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon fontSize="small" />
                          {sidebarOpen && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="font-medium"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </div>
                        {sidebarOpen && (
                          isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />
                        )}
                      </button>
                      {sidebarOpen && isExpanded && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 ml-4 space-y-1"
                        >
                          {item.submenu.map((subItem) => {
                            const isSubActive = location.pathname === subItem.path
                            return (
                              <li key={subItem.path}>
                                <NavLink
                                  to={subItem.path}
                                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                                    isSubActive
                                      ? 'bg-primary text-white shadow-md'
                                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  {subItem.name}
                                </NavLink>
                              </li>
                            )
                          })}
                        </motion.ul>
                      )}
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      <Icon fontSize="small" />
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="font-medium"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </NavLink>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-light-border dark:border-dark-border">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="font-semibold text-light-text dark:text-dark-text truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user?.role}</p>
              </motion.div>
            )}
          </div>
          {sidebarOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={logout}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-danger hover:bg-danger/10 transition-colors"
            >
              <LogoutIcon fontSize="small" />
              <span className="font-medium">Logout</span>
            </motion.button>
          )}
        </div>
      </motion.aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 h-full w-72 bg-light-card dark:bg-dark-card z-50 flex flex-col"
          >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <span className="font-bold text-lg text-light-text dark:text-dark-text">
                  WeldMS
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <CloseIcon className="text-neutral-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
              <ul className="space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.path && location.pathname === item.path
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedMenus[item.name]
                  const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location.pathname.startsWith(sub.path))

                  return (
                    <li key={item.path || item.name}>
                      {hasSubmenu ? (
                        <div>
                          <button
                            onClick={() => toggleSubmenu(item.name)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                              isSubmenuActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon fontSize="small" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </button>
                          {isExpanded && (
                            <ul className="mt-2 ml-4 space-y-1">
                              {item.submenu.map((subItem) => {
                                const isSubActive = location.pathname === subItem.path
                                return (
                                  <li key={subItem.path}>
                                    <NavLink
                                      to={subItem.path}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                                        isSubActive
                                          ? 'bg-primary text-white shadow-md'
                                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                                      }`}
                                    >
                                      {subItem.name}
                                    </NavLink>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <NavLink
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-primary text-white shadow-lg shadow-primary/30'
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                          }`}
                        >
                          <Icon fontSize="small" />
                          <span className="font-medium">{item.name}</span>
                        </NavLink>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-light-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-500">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-danger hover:bg-danger/10 transition-colors"
              >
                <LogoutIcon fontSize="small" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[80px]'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <MenuIcon className="text-neutral-600 dark:text-neutral-300" />
          </button>

          {/* Page Title - Desktop */}
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-light-text dark:text-dark-text">
              {filteredMenuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <LightModeIcon className="text-yellow-500" />
              ) : (
                <DarkModeIcon className="text-neutral-600" />
              )}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative">
              <NotificationsIcon className="text-neutral-600 dark:text-neutral-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            </button>

            {/* Profile */}
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <AccountCircleIcon className="text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
