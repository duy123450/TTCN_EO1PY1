const PayrollWarnings = ({ warnings, employees, title }) => {
  if (!warnings || warnings.length === 0) return null

  return (
    <section
      aria-label={title}
      className='rounded-xl border border-amber-300 bg-amber-50 p-4'
    >
      <h2 className='font-semibold text-amber-950'>{title}</h2>
      <ul className='mt-2 space-y-2 text-sm text-amber-900'>
        {warnings.map((warning, index) => {
          const employeeName =
            warning.employeeId == null
              ? null
              : employees?.get(warning.employeeId)?.full_name

          return (
            <li
              key={`${warning.code}-${warning.employeeId ?? 'all'}-${index}`}
            >
              {employeeName && (
                <span className='font-medium'>{employeeName}: </span>
              )}
              {warning.message}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default PayrollWarnings
