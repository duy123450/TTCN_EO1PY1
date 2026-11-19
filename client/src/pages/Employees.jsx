import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Plus, Search, X } from 'lucide-react'
import EmployeeCard from '../components/EmployeeCard'
import EmployeeForm from '../components/EmployeeForm'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [editEmp, setEditEmp] = useState(null)
  const [showCreateModel, setShowCreateModel] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null)
  const deleteInProgressRef = useRef(false)

  useEffect(() => {
    let active = true

    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees')
        const employeeList = response?.data?.data

        if (!Array.isArray(employeeList)) {
          throw new Error('The server returned an invalid employee list.')
        }

        if (active) {
          setEmployees(employeeList)
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error?.response?.data?.message ||
              error.message ||
              'Unable to load employees. Please try again.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchEmployees()
    return () => {
      active = false
    }
  }, [])

  const filtered = employees.filter((emp) => {
    const matchesType = !selectedType || emp.employee_type === selectedType
    const matchesSearch = [
      emp.full_name,
      emp.phone,
      emp.employee_type,
      emp.start_date,
      emp.employment_status,
      emp.probation_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())

    return matchesType && matchesSearch
  })

  const handleCreateEmployee = async (employeeData) => {
    try {
      const response = await api.post('/employees', employeeData)
      const createdEmployee = response?.data?.data

      if (!createdEmployee) {
        throw new Error('The server did not return the created employee.')
      }

      setEmployees((currentEmployees) => [...currentEmployees, createdEmployee])
      setLoadError('')
      setShowCreateModel(false)
      toast.success('Employee created successfully.')
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          'Unable to create employee. Please try again.',
      )
    }
  }

  const handleUpdateEmployee = async (employeeData) => {
    try {
      const response = await api.put(
        `/employees/${editEmp.employee_id}`,
        employeeData,
      )
      const updatedEmployee = response?.data?.data

      if (!updatedEmployee) {
        throw new Error('The server did not return the updated employee.')
      }

      setEmployees((currentEmployees) =>
        currentEmployees.map((employee) =>
          employee.employee_id === updatedEmployee.employee_id
            ? updatedEmployee
            : employee,
        ),
      )
      setEditEmp(null)
      toast.success('Employee updated successfully.')
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          'Unable to update employee. Please try again.',
      )
    }
  }

  const handleDeleteEmployee = async (employee) => {
    if (deleteInProgressRef.current) {
      return
    }

    const employeeName = employee.full_name || 'this employee'
    const confirmed = window.confirm(
      `Delete ${employeeName}? This will deactivate the employee account and mark the employee as RESIGNED. The employee record will not be physically deleted.`,
    )
    if (!confirmed) {
      return
    }

    deleteInProgressRef.current = true
    setDeletingEmployeeId(employee.employee_id)

    try {
      const response = await api.delete(`/employees/${employee.employee_id}`)
      const deletedEmployee = response?.data?.data

      if (!deletedEmployee) {
        throw new Error('The server did not return the updated employee.')
      }

      setEmployees((currentEmployees) =>
        currentEmployees.map((currentEmployee) =>
          currentEmployee.employee_id === deletedEmployee.employee_id
            ? deletedEmployee
            : currentEmployee,
        ),
      )
      toast.success('Employee marked as resigned.')
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          'Unable to delete employee. Please try again.',
      )
    } finally {
      deleteInProgressRef.current = false
      setDeletingEmployeeId(null)
    }
  }

  return (
    <div className='animate-fade-in'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='page-title'>Employees</h1>
          <p className='page-subtitle'>Manage your team members</p>
        </div>
        <button
          onClick={() => setShowCreateModel(true)}
          className='btn-primary flex items-center gap-2 w-full sm:w-auto justify-center'
        >
          <Plus size={16} /> Add employee
        </button>
      </div>
      {/* Search bar */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <div className='relative flex-1'>
          <Search className='absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4' />
          <input
            placeholder='Search employees...'
            className='w-full pl-10!'
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className='max-w-40'
        >
          <option value=''>All employee types</option>
          <option value='PART_TIME'>Part time</option>
          <option value='FULL_TIME'>Full time</option>
        </select>
      </div>
      {/* Employee cards */}
      {loading ? (
        <div className='flex justify-center p-12'>
          <div className='animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full' />
        </div>
      ) : loadError ? (
        <p role='alert' className='py-8 text-center text-rose-700'>
          Unable to load employees: {loadError}
        </p>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5'>
          {filtered.length === 0 ? (
            <p className='col-span-full text-center py-16 text-text-secondary bg-surface rounded-2xl border border-dashed border-border'>
              No Employees Found
            </p>
          ) : (
            filtered.map((emp) => (
              <EmployeeCard
                key={emp.employee_id ?? emp.local_id}
                employee={emp}
                onEdit={setEditEmp}
                onDelete={handleDeleteEmployee}
                isDeleting={deletingEmployeeId === emp.employee_id}
                deleteDisabled={deletingEmployeeId !== null}
              />
            ))
          )}
        </div>
      )}

      {showCreateModel && (
        <div
          className='fixed bg-black/40 backdrop-blur-sm inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto'
          onClick={() => setShowCreateModel(false)}
        >
          <div className='fixed inset-0' />
          <div
            className='relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-fade-in'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between p-6 pb-0'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>
                  Add New Employee
                </h2>
                <p className='text-sm text-slate-500 mt-0.5'>
                  Create a user account and employee profile
                </p>
              </div>
              <button
                onClick={() => setShowCreateModel(false)}
                className='p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6'>
              <EmployeeForm
                onSuccess={handleCreateEmployee}
                onCancel={() => setShowCreateModel(false)}
              />
            </div>
          </div>
        </div>
      )}

      {editEmp && (
        <div
          className='fixed bg-black/40 backdrop-blur-sm inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto'
          onClick={() => setEditEmp(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className='relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-fade-in'
          >
            <div className='flex items-center justify-between p-6 pb-0'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>
                  Edit Employee
                </h2>
                <p className='text-sm text-slate-500 mt-0.5'>
                  Update employee details
                </p>
              </div>
              <button
                onClick={() => setEditEmp(null)}
                className='p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6'>
              <EmployeeForm
                initData={editEmp}
                onSuccess={handleUpdateEmployee}
                onCancel={() => setEditEmp(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
