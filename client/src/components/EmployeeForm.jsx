import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2Icon } from 'lucide-react'

const vietnamDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatDateForInput = (value) => {
  if (value == null) {
    return ''
  }

  const rawValue = value instanceof Date ? value : String(value).trim()
  if (!rawValue) {
    return ''
  }

  if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue
  }

  const date = rawValue instanceof Date ? rawValue : new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = Object.fromEntries(
    vietnamDateFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

const getInitialFormValues = (employee) => ({
  full_name: employee?.full_name ?? '',
  phone: employee?.phone ?? '',
  date_of_birth: formatDateForInput(employee?.date_of_birth),
  employee_type: employee?.employee_type ?? '',
  start_date: formatDateForInput(employee?.start_date),
  employment_status: employee?.employment_status ?? '',
  probation_status: employee?.probation_status ?? '',
})

const EmployeeForm = ({ initData, onSuccess, onCancel }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formState, setFormState] = useState(() => ({
    employee: initData,
    values: getInitialFormValues(initData),
  }))
  const formValues =
    formState.employee === initData
      ? formState.values
      : getInitialFormValues(initData)
  const submittingRef = useRef(false)
  const isEditMode = !!initData

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormState({
      employee: initData,
      values: { ...formValues, [name]: value },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submittingRef.current) {
      return
    }

    const formData = new FormData(e.currentTarget)
    const employeeData = isEditMode
      ? {
          full_name: formValues.full_name.trim(),
          phone: formValues.phone.trim(),
          date_of_birth: formValues.date_of_birth || null,
          employee_type: formValues.employee_type,
          start_date: formValues.start_date,
          ...(formValues.employment_status && {
            employment_status: formValues.employment_status,
          }),
          ...(formValues.probation_status && {
            probation_status: formValues.probation_status,
          }),
        }
      : {
          username: formData.get('username').trim(),
          password: formData.get('password'),
          full_name: formValues.full_name.trim(),
          phone: formValues.phone.trim(),
          date_of_birth: formValues.date_of_birth || null,
          employee_type: formValues.employee_type,
          start_date: formValues.start_date,
        }

    submittingRef.current = true
    setLoading(true)
    try {
      await onSuccess?.(employeeData)
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-6 max-w-3xl animate-fade-in'
    >
      <div className='card p-5 sm:p-6'>
        <h3 className='font-medium mb-6 pb-4 border-b border-border'>
          Personal Information
        </h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-text-secondary'>
          {!isEditMode && (
            <>
              <div>
                <label className='block mb-2' htmlFor='username'>
                  Username
                </label>
                <input
                  id='username'
                  name='username'
                  required
                  maxLength={50}
                  autoComplete='username'
                />
              </div>
              <div>
                <label className='block mb-2' htmlFor='password'>
                  Password
                </label>
                <input
                  id='password'
                  name='password'
                  type='password'
                  required
                  autoComplete='new-password'
                />
              </div>
            </>
          )}
          <div className='sm:col-span-2'>
            <label className='block mb-2' htmlFor='full_name'>
              Full Name
            </label>
            <input
              id='full_name'
              name='full_name'
              required
              maxLength={100}
              value={formValues.full_name}
              onChange={handleFieldChange}
            />
          </div>
          <div>
            <label className='block mb-2' htmlFor='phone'>
              Phone Number
            </label>
            <input
              id='phone'
              name='phone'
              type='tel'
              required
              maxLength={15}
              value={formValues.phone}
              onChange={handleFieldChange}
            />
          </div>
          <div>
            <label className='block mb-2' htmlFor='date_of_birth'>
              Date of Birth
            </label>
            <input
              id='date_of_birth'
              name='date_of_birth'
              type='date'
              value={formValues.date_of_birth}
              onChange={handleFieldChange}
            />
          </div>
        </div>
      </div>

      <div className='card p-5 sm:p-6'>
        <h3 className='text-base font-medium text-text-primary mb-6 pb-4 border-b border-border'>
          Employment Details
        </h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-text-secondary'>
          <div>
            <label className='block mb-2' htmlFor='employee_type'>
              Employee Type
            </label>
            <select
              id='employee_type'
              name='employee_type'
              value={formValues.employee_type}
              onChange={handleFieldChange}
              required
            >
              <option value='' disabled>
                Select employee type
              </option>
              <option value='PART_TIME'>Part time</option>
              <option value='FULL_TIME'>Full time</option>
            </select>
          </div>
          <div>
            <label className='block mb-2' htmlFor='start_date'>
              Start Date
            </label>
            <input
              id='start_date'
              name='start_date'
              type='date'
              required
              value={formValues.start_date}
              onChange={handleFieldChange}
            />
          </div>
          {isEditMode && (
            <>
              <div>
                <label className='block mb-2' htmlFor='employment_status'>
                  Employment Status
                </label>
                <select
                  id='employment_status'
                  name='employment_status'
                  value={formValues.employment_status}
                  onChange={handleFieldChange}
                >
                  <option value=''>No change</option>
                  <option value='ACTIVE'>Active</option>
                  <option value='ON_LEAVE'>On leave</option>
                  <option value='RESIGNED'>Resigned</option>
                </select>
              </div>
              <div>
                <label className='block mb-2' htmlFor='probation_status'>
                  Probation Status
                </label>
                <select
                  id='probation_status'
                  name='probation_status'
                  value={formValues.probation_status}
                  onChange={handleFieldChange}
                >
                  <option value=''>No change</option>
                  <option value='NOT_STARTED'>Not started</option>
                  <option value='IN_PROGRESS'>In progress</option>
                  <option value='PASSED'>Passed</option>
                  <option value='FAILED'>Failed</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className='flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2'>
        <button
          type='button'
          className='btn-secondary'
          onClick={() => (onCancel ? onCancel() : navigate(-1))}
        >
          Cancel
        </button>
        <button
          type='submit'
          disabled={loading}
          className='btn-primary flex items-center justify-center'
        >
          {loading && <Loader2Icon className='w-4 h-4 mr-2 animate-spin' />}
          {isEditMode ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  )
}

export default EmployeeForm
