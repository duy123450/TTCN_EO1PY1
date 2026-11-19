import { LoaderCircle, Pencil, Trash2 } from 'lucide-react'

const EmployeeCard = ({
  employee,
  onEdit,
  onDelete,
  isDeleting,
  deleteDisabled,
}) => {
  return (
    <article className='group relative card card-hover overflow-hidden'>
      <div className='flex aspect-4/3 items-center justify-center bg-background'>
        <div className='flex size-20 items-center justify-center rounded-full bg-gold-light text-2xl font-medium text-brand'>
          {employee.full_name?.trim().charAt(0) || '—'}
        </div>
      </div>
      <div className='absolute right-3 top-3 flex gap-2'>
        <button
          type='button'
          onClick={() => onEdit(employee)}
          aria-label={`Edit ${employee.full_name || 'employee'}`}
          className='rounded-lg bg-surface/90 p-2.5 text-text-secondary shadow-sm transition-colors hover:text-brand'
        >
          <Pencil className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => onDelete(employee)}
          aria-label={`Delete ${employee.full_name || 'employee'}`}
          disabled={deleteDisabled}
          className='rounded-lg bg-surface/90 p-2.5 text-text-secondary shadow-sm transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isDeleting ? (
            <LoaderCircle className='h-4 w-4 animate-spin' />
          ) : (
            <Trash2 className='h-4 w-4' />
          )}
        </button>
      </div>
      <div className='p-5'>
        <h3 className='font-medium text-text-primary'>
          {employee.full_name || 'Name unavailable'}
        </h3>
        <p className='mt-1 text-xs text-text-secondary'>
          {employee.employee_type?.replaceAll('_', ' ') ?? 'Type unavailable'}
        </p>
      </div>
    </article>
  )
}

export default EmployeeCard
