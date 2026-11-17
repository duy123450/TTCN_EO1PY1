import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2Icon } from 'lucide-react'

const EmployeeForm = ({ initData, onSuccess, onCancel }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const isEditMode = !!initData

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const employeeData = {
      ...(initData?.employee_id != null && {
        employee_id: initData.employee_id,
      }),
      ...(initData?.user_id != null && { user_id: initData.user_id }),
      full_name: formData.get('full_name').trim(),
      phone: formData.get('phone').trim() || null,
      date_of_birth: formData.get('date_of_birth') || null,
      employee_type: formData.get('employee_type'),
      start_date: formData.get('start_date'),
      employment_status: formData.get('employment_status').trim() || null,
      probation_status: formData.get('probation_status').trim() || null,
    }

    setLoading(true)
    try {
      await onSuccess?.(employeeData)
    } finally {
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
          <div className='sm:col-span-2'>
            <label className='block mb-2' htmlFor='full_name'>
              Full Name
            </label>
            <input
              id='full_name'
              name='full_name'
              required
              defaultValue={initData?.full_name ?? ''}
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
              defaultValue={initData?.phone ?? ''}
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
              defaultValue={initData?.date_of_birth ?? ''}
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
              required
              defaultValue={initData?.employee_type ?? ''}
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
              defaultValue={initData?.start_date ?? ''}
            />
          </div>
          <div>
            <label className='block mb-2' htmlFor='employment_status'>
              Employment Status
            </label>
            <input
              id='employment_status'
              name='employment_status'
              defaultValue={initData?.employment_status ?? ''}
            />
          </div>
          <div>
            <label className='block mb-2' htmlFor='probation_status'>
              Probation Status
            </label>
            <input
              id='probation_status'
              name='probation_status'
              defaultValue={initData?.probation_status ?? ''}
            />
          </div>
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
