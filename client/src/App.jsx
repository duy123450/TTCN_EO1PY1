import { Toaster } from 'react-hot-toast'
import { Routes, Route, Navigate } from 'react-router-dom'
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
        <Route path='/login' element={<LoginLanding />} />

        <Route
          path='/login/employee'
          element={
            <LoginForm
              role='EMPLOYEE'
              title='Employee Portal'
              subtitle='Sign in to access your account'
            />
          }
        />
        <Route
          path='/login/manager'
          element={
            <LoginForm
              role='MANAGER'
              title='Manager Portal'
              subtitle='Review team performance and manage approval requests.'
            />
          }
        />

        <Route element={<Layout />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/employees' element={<Employees />} />
          <Route path='/attendance' element={<Attendance />} />
          <Route path='/request' element={<Request />} />
          <Route path='/payroll' element={<Payroll />} />
          <Route path='/availability' element={<Availability />} />
          <Route path='/my-availability' element={<Availability />} />
          <Route path='/work-schedule' element={workScheduleElement} />
          <Route path='/my-schedule' element={workScheduleElement} />
        </Route>

        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </>
  )
}

export default App
