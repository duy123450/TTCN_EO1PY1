const formatCurrency = (amount) =>
  typeof amount === 'number' && Number.isFinite(amount)
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount)
    : 'Unavailable'

const getThresholdLabel = (thresholdReached) => {
  if (thresholdReached == null) return 'Unavailable'
  return thresholdReached ? 'Reached' : 'Not reached'
}

const PayrollKpiOverview = ({ kpi, config }) => (
  <section aria-labelledby='payroll-kpi-heading' className='space-y-3'>
    <div>
      <h2
        id='payroll-kpi-heading'
        className='text-lg font-semibold text-text-primary'
      >
        Monthly revenue and KPI
      </h2>
      <p className='mt-1 text-sm text-text-secondary'>
        Manager preview summary for {kpi.payrollMonth}.
      </p>
    </div>
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
      <KpiCard
        label='Monthly revenue'
        value={formatCurrency(kpi.monthlyRevenue)}
        note={
          kpi.revenueStatus === 'AVAILABLE'
            ? 'Preview record available'
            : 'Required revenue record unavailable'
        }
      />
      <KpiCard
        label='Revenue threshold'
        value={getThresholdLabel(kpi.thresholdReached)}
        note={formatCurrency(config.kpiBonus.minimumMonthlyRevenue)}
      />
      <KpiCard label='KPI pool' value={formatCurrency(kpi.totalPool)} />
      <KpiCard
        label='Equal share'
        value={formatCurrency(kpi.perEmployeeShare)}
        note='Per eligible employee'
      />
      <KpiCard
        label='Eligible employees'
        value={
          kpi.eligibleEmployeeCount == null
            ? 'Unavailable'
            : String(kpi.eligibleEmployeeCount)
        }
        note={`Known: ${kpi.knownEligibleEmployeeCount}`}
      />
    </div>
  </section>
)

const KpiCard = ({ label, value, note }) => (
  <article className='card min-w-0 p-4'>
    <p className='text-xs font-medium text-text-secondary'>{label}</p>
    <p className='mt-2 break-words text-lg font-semibold text-text-primary'>
      {value}
    </p>
    {note && <p className='mt-1 text-xs text-text-secondary'>{note}</p>}
  </article>
)

export default PayrollKpiOverview
