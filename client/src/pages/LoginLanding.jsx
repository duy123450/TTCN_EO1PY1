import { Link } from 'react-router-dom'
import LoginLeftSide from '../components/LoginLeftSide'
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  UserIcon,
} from 'lucide-react'

const LoginLanding = () => {
  const portalOptions = [
    {
      to: '/login/manager',
      title: 'Manager Portal',
      description:
        'Manage employee information, create work schedules, monitor attendance, handle employee requests, and manage payroll.',
      icon: BriefcaseBusinessIcon,
    },
    {
      to: '/login/employee',
      title: 'Employee Portal',
      description:
        'View your weekly schedule, register your availability, check in and out, submit requests, and view your personal payslip.',
      icon: UserIcon,
    },
  ]

  return (
    <div className='min-h-screen flex flex-col md:flex-row'>
      <LoginLeftSide />

      <div className='w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative overflow-y-auto min-h-screen'>
        <div className='w-full max-w-md animate-fade-in relative z-10'>
          {/* Header */}
          <div className='mb-10 text-center md:text-left'>
            <h2 className='text-3xl font-medium text-text-primary tracking-tight mb-3'>
              Welcome Back
            </h2>
            <p className='text-text-secondary'>
              Select your portal to securely access the system.
            </p>
          </div>

          {/* Portal List */}
          <div className='space-y-4'>
            {portalOptions.map((portal) => {
              return (
                <Link
                  key={portal.to}
                  to={portal.to}
                  className='group block rounded-lg border border-border bg-surface p-5 transition-all duration-300 hover:border-gold hover:bg-gold-light sm:p-6'
                >
                  <div className='flex items-center gap-4'>
                    <div className='min-w-0 flex-1'>
                      <h3 className='mb-1 text-lg text-text-primary transition-colors group-hover:text-brand'>
                        {portal.title}
                      </h3>
                    </div>
                    <ArrowRightIcon
                      className='h-4 w-4 shrink-0 text-text-secondary transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand'
                      aria-hidden='true'
                    />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Footer */}
          <div className='mt-12 text-center md:text-left text-sm text-text-secondary'>
            <p>© {new Date().getFullYear()} nerfIori. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginLanding
