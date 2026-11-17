const LoginLeftSide = () => {
  return (
    <div className='relative hidden w-1/2 overflow-hidden border-r border-white/10 bg-linear-to-br from-brand-dark to-brand md:flex'>
      <div
        aria-hidden='true'
        className='absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl'
      />
      <div
        aria-hidden='true'
        className='absolute -right-36 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-3xl'
      />
      <div
        aria-hidden='true'
        className='absolute right-16 bottom-16 h-40 w-40 rounded-full border border-gold-light/10'
      />

      <div className='relative z-10 flex h-full w-full flex-col items-start justify-center p-12 lg:p-20'>
        <div className='mb-16 flex items-center gap-3'>
          <span className='text-xs font-medium uppercase tracking-[0.3em] text-gold-light'>
            Crane Tea
          </span>
        </div>

        <div className='mb-5 flex items-center gap-3'>
          <span className='h-px w-10 bg-gold' />
          <span className='text-xs font-medium uppercase tracking-[0.22em] text-white/70'>
            People &amp; Operations
          </span>
        </div>
        <h1 className='mb-6 text-4xl font-medium leading-tight tracking-tight text-white lg:text-5xl'>
          <span className='text-gold'>HR</span>
          <br />
          Management System
        </h1>
        <p className='max-w-md text-lg leading-relaxed text-white/70'>
          Manage employee information, work schedules, attendance, employee
          requests, and payroll in one centralized system.
        </p>
      </div>
    </div>
  )
}

export default LoginLeftSide
