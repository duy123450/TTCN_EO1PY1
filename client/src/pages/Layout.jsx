import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { AttendancePreviewProvider } from '../context/AttendancePreviewContext'
import { useAuth } from '../context/AuthContext'

const Layout = () => {
  const { user } = useAuth()
  const [previewRole, setPreviewRole] = useState('MANAGER')
  const visibleRole = user?.role || previewRole

  return (
    <AttendancePreviewProvider>
      <div className='flex h-screen bg-background'>
        <Sidebar role={visibleRole} />
        <main className='flex-1 overflow-y-auto'>
          <div className='p-4 pt-16 sm:p-6 sm:pt-6 lg:p-8 max-w-400 mx-auto'>
            <div className='mb-4 flex justify-end'>
              <label className='flex items-center gap-2 text-xs text-text-secondary'>
                Preview role
                <select
                  aria-label='Preview role'
                  value={previewRole}
                  onChange={(event) => setPreviewRole(event.target.value)}
                  className='w-auto'
                >
                  <option value='MANAGER'>Manager</option>
                  <option value='EMPLOYEE'>Employee</option>
                </select>
              </label>
            </div>
            <Outlet context={{ role: visibleRole }} />
          </div>
        </main>
      </div>
    </AttendancePreviewProvider>
  )
}

export default Layout
