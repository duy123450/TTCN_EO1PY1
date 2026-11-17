import { useEffect, useState } from 'react'
import {
  dummyEmployeeDashboardData,
  dummyManagerDashboardData,
} from '../assets/mockup-data'
import Loading from '../components/Loading'
import EmployeeDashboard from '../components/EmployeeDashboard'
import ManagerDashboard from '../components/ManagerDashboard'

const PREVIEW_ROLE = 'MANAGER'
const previewDataByRole = {
  [dummyManagerDashboardData.role]: dummyManagerDashboardData,
  [dummyEmployeeDashboardData.role]: dummyEmployeeDashboardData,
}

const Dashboard = () => {
  const data = previewDataByRole[PREVIEW_ROLE]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) return <Loading />
  if (!data)
    return (
      <p className='text-center text-slate-500 py-12'>
        Failed to load dashboard
      </p>
    )

  if (data.role === 'MANAGER') return <ManagerDashboard />
  if (data.role === 'EMPLOYEE') {
    return <EmployeeDashboard data={data} />
  }

  return (
    <p className='py-12 text-center text-text-secondary'>
      Dashboard unavailable for this role.
    </p>
  )
}

export default Dashboard
