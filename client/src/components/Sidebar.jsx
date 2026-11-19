import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { dummyProfileData } from '../assets/mockup-data'
import {
  BarChart3Icon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClipboardListIcon,
  ChevronRightIcon,
  DollarSignIcon,
  FileTextIcon,
  LayoutGridIcon,
  LogOutIcon,
  MenuIcon,
  UserRoundIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ role = 'EMPLOYEE' }) => {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const username = user?.username || dummyProfileData.full_name || dummyProfileData.username
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const managerNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGridIcon },
    { name: 'Employees', href: '/employees', icon: UsersIcon },
    { name: 'Availability', href: '/availability', icon: CalendarDaysIcon },
    { name: 'Work Schedule', href: '/work-schedule', icon: CalendarIcon },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheckIcon },
    { name: 'Requests', href: '/request', icon: ClipboardListIcon },
    { name: 'Payroll', href: '/payroll', icon: DollarSignIcon },
    { name: 'Reports', href: '/reports', icon: BarChart3Icon },
  ]
  const employeeNavItems = [
    { name: 'My Schedule', href: '/my-schedule', icon: CalendarIcon },
    { name: 'My Availability', href: '/my-availability', icon: CalendarDaysIcon },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheckIcon },
    { name: 'My Requests', href: '/request', icon: FileTextIcon },
    { name: 'My Payroll', href: '/payroll', icon: DollarSignIcon },
    { name: 'My Profile', href: '/profile', icon: UserRoundIcon },
  ]
  const navItems =
    role === 'MANAGER'
      ? managerNavItems
      : role === 'EMPLOYEE'
        ? employeeNavItems
        : []
  const roleLabel =
    role === 'MANAGER' ? 'Store Manager' : role === 'EMPLOYEE' ? 'Employee' : ''

  const handleLogout = async () => {
    await logout()
  }

  const sidebarContent = (
    <>
      {/* Brand header */}
      <div className='px-5 pt-6 pb-5 border-b border-white/6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <UserIcon className='text-white size-7' />
            <div>
              <p className='font-semibold text-[13px] text-white tracking-wide'>
                Crane Tea
              </p>
              <p className='text-[11px] text-white/60 font-medium'>
                Management System
              </p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className='lg:hidden text-white/60 hover:text-white p-1'
          >
            <XIcon size={20} />
          </button>
        </div>
      </div>

      {/* User profile card */}
      {username && (
        <div className='mx-3 mt-4 mb-1 p-3 rounded-lg bg-white/5 border border-white/10'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-brand flex items-center justify-center ring-1 ring-white/10 shrink-0'>
              <span className='text-gold-light text-xs font-semibold'>
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className='min-w-0'>
              <p className='text-[13px] font-medium text-white/90 truncate'>
                {username}
              </p>
              <p className='text-[11px] text-white/60 truncate'>
                {roleLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <div className='px-5 pt-5 pb-2'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50'>
          Navigation
        </p>
      </div>

      {/* Navigation List */}
      <div className='flex-1 px-3 space-y-0.5 overflow-y-auto'>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 relative ${isActive ? 'bg-gold/10 text-gold-light' : 'text-white/75 hover:text-white hover:bg-white/5'}`}
            >
              {isActive && (
                <div className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold' />
              )}
              <item.icon
                className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-gold-light' : 'text-white/60 group-hover:text-white/80'}`}
              />
              <span className='flex-1'>{item.name}</span>
              {isActive && (
                <ChevronRightIcon className='w-3.5 h-3.5 text-gold/70' />
              )}
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      <div className='p-3 border-t border-white/10'>
        <button
          onClick={handleLogout}
          className='flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[13px] font-medium text-white/60 hover:text-gold-light hover:bg-white/5 transition-all duration-150'
        >
          <LogOutIcon className='w-[17px] h-[17px]' />
          <span>Log out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className='lg:hidden fixed top-4 left-4 z-50 p-2 bg-brand-dark text-white rounded-lg shadow-lg border border-white/10'
      >
        <MenuIcon size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40'
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className='hidden lg:flex flex-col h-full w-[260px] bg-linear-to-b from-brand-dark via-brand-dark to-brand text-white shrink-0 border-r border-white/10'>
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-linear-to-b from-brand-dark via-brand-dark to-brand text-white z-50 flex flex-col transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export default Sidebar
