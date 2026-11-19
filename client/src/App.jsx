import { Toaster } from 'react-hot-toast'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute'
import LoginLanding from './pages/LoginLanding'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Request from './pages/Request'
import Payroll from './pages/Payroll'
import LoginForm from './components/LoginForm'
import Availability from './pages/Availability'
import WorkSchedule from './pages/WorkSchedule'

const workScheduleElement = <WorkSchedule />

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path='/login' element={<PublicRoute><LoginLanding /></PublicRoute>} />

        <Route
          path='/login/employee'
          element={
            <PublicRoute>
              <LoginForm
                role='EMPLOYEE'
                title='Employee Portal'
                subtitle='Sign in to access your account'
              />
            </PublicRoute>
          }
        />
        <Route
          path='/login/manager'
          element={
            <PublicRoute>
              <LoginForm
                role='MANAGER'
                title='Manager Portal'
                subtitle='Review team performance and manage approval requests.'
              />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path='/dashboard' element={<Dashboard />} />
          <Route
            path='/employees'
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route path='/attendance' element={<Attendance />} />
          <Route path='/request' element={<Request />} />
          <Route path='/payroll' element={<Payroll />} />
          <Route
            path='/availability'
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <Availability />
              </ProtectedRoute>
            }
          />
          <Route
            path='/my-availability'
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <Availability />
              </ProtectedRoute>
            }
          />
          <Route
            path='/work-schedule'
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                {workScheduleElement}
              </ProtectedRoute>
            }
          />
          <Route
            path='/my-schedule'
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                {workScheduleElement}
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </>
  )
}

export default App
