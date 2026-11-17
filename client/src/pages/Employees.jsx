import { useEffect, useRef, useState } from 'react'
import { dummyEmployeeData } from '../assets/mockup-data'
import { Plus, Search, X } from 'lucide-react'
import EmployeeCard from '../components/EmployeeCard'
import EmployeeForm from '../components/EmployeeForm'

const Employees = () => {
  const [employees, setEmployees] = useState(dummyEmployeeData)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [editEmp, setEditEmp] = useState(null)
  const [showCreateModel, setShowCreateModel] = useState(false)
  const localEmployeeId = useRef(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timeoutId)
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

  const handleCreateEmployee = (employeeData) => {
    localEmployeeId.current += 1
    setEmployees((currentEmployees) => [
      ...currentEmployees,
      {
        ...employeeData,
        local_id: `local-${localEmployeeId.current}`,
      },
    ])
    setShowCreateModel(false)
  }

  const handleUpdateEmployee = (employeeData) => {
    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) => {
        const matchesEmployee =
          editEmp.employee_id != null
            ? employee.employee_id === editEmp.employee_id
            : employee.local_id === editEmp.local_id

        return matchesEmployee
          ? { ...employee, ...employeeData }
          : employee
      }),
    )
    setEditEmp(null)
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
              />
            ))
          )}
          {/* Create employee modal */}
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
                    onCancel={() => {
                      setShowCreateModel(false)
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Edit employee modal */}
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
                    onCancel={() => {
                      setEditEmp(null)
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Employees
