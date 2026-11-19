import { Link, useNavigate } from 'react-router-dom'
import LoginLeftSide from './LoginLeftSide'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { validateLoginInput } from '../utils/validation'

const LoginForm = ({ role, title, subtitle }) => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateLoginInput({ username, password })
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    try {
      setError('')
      setLoading(true)
      await login(username, password, role)
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex flex-col md:flex-row'>
      <LoginLeftSide />
      <div className='flex-1 flex items-center justify-center p-6 sm:p-12 bg-surface'>
        <div className='w-full max-w-md animate-fade-in'>
          <Link
            to='/login'
            className='inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-10 transition-colors'
          >
            <ArrowLeftIcon size={16} /> Back to portals
          </Link>
          <div className='mb-8'>
            <h1 className='text-2xl sm:text-3xl font-medium text-text-primary'>
              {title}
            </h1>
            <p className='text-text-secondary text-sm sm:text-base mt-2'>
              {subtitle}
            </p>
          </div>

          {error && (
            <div className='mb-6 p-4 bg-gold-light/50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-3'>
              <div className='w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0' />
              {error}
            </div>
          )}

          <form className='space-y-5' onSubmit={handleSubmit}>
            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>
                Username
              </label>
              <input
                type='text'
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                placeholder='Enter your username'
                autoComplete='username'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>
                Password
              </label>
              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className='pr-11'
                  placeholder='••••••••'
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon size={18} />
                  ) : (
                    <EyeIcon size={18} />
                  )}
                </button>
              </div>
            </div>
            <button
              type='submit'
              disabled={loading}
              className='w-full py-3 bg-linear-to-r from-brand-dark to-brand text-white rounded-md text-sm font-semibold hover:from-brand hover:to-brand-dark disabled:opacity-50 transition-all duration-200 shadow-lg shadow-brand/25 active:scale-[0.98] flex items-center justify-center'
            >
              {loading && <Loader2Icon className='animate-spin h-4 w-4 mr-2' />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
