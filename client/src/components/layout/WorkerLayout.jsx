import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

const WorkerLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const location = useLocation()

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/worker/dashboard',
      icon: DashboardIcon,
    },
    {
      name: 'My Profile',
      path: '/worker/profile',
      icon: PersonIcon,
    },
    {
      name: 'My Tasks',
      path: '/worker/tasks',
      icon: AssignmentIcon,
    },
    {
      name: 'Attendance',
      path: '/worker/attendance',
      icon: EventAvailableIcon,
    },
  ]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
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
            className="fixed left-0 top-0 h-full w-72 bg-light-card dark:bg-dark-card z-50 flex flex-col"
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
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path

                  return (
                    <li key={item.path}>
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
                    {user?.name?.charAt(0) || 'W'}
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

      {/* Top Header */}
      <header className="h-16 bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 sticky top-0 z-30">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <MenuIcon className="text-neutral-600 dark:text-neutral-300" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="font-bold text-light-text dark:text-dark-text">
            Worker Portal
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDarkMode ? (
              <LightModeIcon className="text-yellow-500" />
            ) : (
              <DarkModeIcon className="text-neutral-600" />
            )}
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'W'}
            </span>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border flex items-center justify-around z-30 md:hidden">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <Icon fontSize="small" />
              <span className="text-xs font-medium">{item.name.split(' ')[0]}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border flex-col">
        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <Icon fontSize="small" />
                    <span className="font-medium">{item.name}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-light-border dark:border-dark-border">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-danger hover:bg-danger/10 transition-colors"
          >
            <LogoutIcon fontSize="small" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Page Content */}
      <main className="md:ml-64 pb-20 md:pb-6 p-4 md:p-6 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  )
}

export default WorkerLayout
