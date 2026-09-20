import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, School, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { emailService } from '@/services/emailService'
import { toast } from 'sonner'
import TermsModal from '@/components/TermsModal'
import PrivacyModal from '@/components/PrivacyModal'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signup, loginWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isSendingOTP, setIsSendingOTP] = useState(false)
  
  // OTP verification state
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', ''])
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' }
    if (strength <= 3) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' }
    if (strength <= 4) return { strength: 3, label: 'Good', color: 'bg-blue-500' }
    return { strength: 4, label: 'Strong', color: 'bg-green-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // Check if email is valid LSB email
  // const isValidEmail = formData.email === '' || formData.email.toLowerCase().endsWith('@lsb.edu.ph')
  // const showEmailError = formData.email !== '' && !isValidEmail

  // Shared by both the OTP flow and the direct (no-OTP) flow
  const registerAccount = async () => {
    setIsLoading(true)
    try {
      console.log('Creating account for:', formData.email)
      const fullName = `${formData.firstName} ${formData.lastName}`
      await signup(formData.email, formData.password, fullName, formData.studentId.trim() || undefined)

      console.log('Account created successfully')
      toast.success('Account created successfully! Welcome to LyFind!')
      setShowOTPModal(false)
      navigate('/browse')
      return true
    } catch (error: any) {
      console.error('Registration error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)

      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered')
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password')
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/password sign-up is disabled. An administrator must enable the Email/Password provider in Firebase.')
      } else if (error.message && error.message.includes('Database')) {
        toast.error('Database not configured. Please contact administrator.')
        console.error('FIREBASE SETUP REQUIRED: Please create Firestore database in Firebase Console')
      } else if (error.message) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create account. Please try again')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate email domain
    if (!formData.email.toLowerCase().endsWith('@lsb.edu.ph')) {
      toast.error('Please use your @lsb.edu.ph email address')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    // No email service configured — skip OTP and register directly
    if (!emailService.isConfigured()) {
      await registerAccount()
      return
    }

    setIsSendingOTP(true)

    try {
      // Send OTP via email service
      const result = await emailService.sendOTP(formData.email)

      if (result.success) {
        setShowOTPModal(true)
        toast.success('OTP sent to your email!')
      } else {
        // Don't block registration on a broken email service
        toast.info('Email verification is unavailable right now — creating your account directly')
        setIsSendingOTP(false)
        await registerAccount()
        return
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      toast.info('Email verification is unavailable right now — creating your account directly')
      setIsSendingOTP(false)
      await registerAccount()
      return
    } finally {
      setIsSendingOTP(false)
    }
  }

  const handleOTPInput = (index: number, value: string) => {
    if (value.length > 1) return // Only allow single digit
    
    const newInputs = [...otpInputs]
    newInputs[index] = value
    setOtpInputs(newInputs)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
    
    // Check if all inputs are filled
    if (newInputs.every(input => input !== '')) {
      const enteredOTP = newInputs.join('')
      verifyOTPAndRegister(enteredOTP)
    }
  }

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const verifyOTPAndRegister = async (enteredOTP: string) => {
    console.log('Verifying OTP:', enteredOTP, 'for email:', formData.email)

    // Verify OTP using email service (synchronous)
    const result = emailService.verifyOTP(formData.email, enteredOTP)

    console.log('OTP verification result:', result)

    if (!result.success) {
      toast.error(result.message)
      setOtpInputs(['', '', '', '', '', ''])
      return
    }

    const registered = await registerAccount()
    if (!registered) {
      setOtpInputs(['', '', '', '', '', ''])
    }
  }

  const handleResendOTP = async () => {
    setIsSendingOTP(true)
    try {
      const result = await emailService.resendOTP(formData.email)
      
      if (result.success) {
        setOtpInputs(['', '', '', '', '', ''])
        toast.success('New OTP sent to your email!')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to resend OTP. Please try again.')
    } finally {
      setIsSendingOTP(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle()
      // Don't navigate here - AuthContext will handle it after redirect
      // For popup flow (desktop), this will navigate immediately
      // For redirect flow (mobile/PWA), the redirect happens and AuthContext navigates after return
      if (!(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))) {
        // Only navigate on desktop (popup flow)
        navigate('/browse')
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setIsGoogleLoading(false)
      // Error handling is done in the loginWithGoogle function
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-12 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="relative inline-block mb-4">
              {/* Orange gradient circle behind */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-[#ff7400]/30 via-[#ff7400]/20 to-transparent rounded-full blur-2xl animate-pulse"></div>
              </div>
              
              {/* Logo with float animation */}
              <div className="relative animate-[float_3s_ease-in-out_infinite]">
                <img 
                  src="/Untitled design (3).png" 
                  alt="LyFind" 
                  className="w-20 h-20"
                />
              </div>
            </div>
          </Link>
          <h1 className="text-4xl font-normal text-white mb-2">Join LyFind</h1>
          <p className="text-white/60 text-sm">Create your account with your LSB email</p>
        </div>

        {/* Register Form */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#2f1632] text-white/40">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSendOTP} className="space-y-5">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                    placeholder="Juan"
                    required
                    disabled={isLoading || isSendingOTP}
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  placeholder="Dela Cruz"
                  required
                  disabled={isLoading || isSendingOTP}
                />
              </div>
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Student ID (Optional)</label>
              <div className="relative">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  placeholder="2024-12345"
                  disabled={isLoading || isSendingOTP}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/70 text-sm mb-2">LSB Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  formData.email && !formData.email.toLowerCase().endsWith('@lsb.edu.ph')
                    ? 'text-red-400'
                    : 'text-white/40'
                }`} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder:text-white/40 focus:outline-none transition-all ${
                    formData.email && !formData.email.toLowerCase().endsWith('@lsb.edu.ph')
                      ? 'border-red-500 focus:border-red-500 focus:bg-red-500/10'
                      : 'border-white/10 focus:border-[#ff7400]/50 focus:bg-white/10'
                  }`}
                  placeholder="your.email@lsb.edu.ph"
                  required
                  disabled={isLoading || isSendingOTP}
                />
                {formData.email && !formData.email.toLowerCase().endsWith('@lsb.edu.ph') && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              {formData.email && !formData.email.toLowerCase().endsWith('@lsb.edu.ph') ? (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Only @lsb.edu.ph emails are accepted
                </p>
              ) : (
                <p className="text-white/40 text-xs mt-1">⚠️ Only @lsb.edu.ph emails are accepted</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                  disabled={isLoading || isSendingOTP}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  disabled={isLoading || isSendingOTP}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength === 1 ? 'text-red-400' :
                      passwordStrength.strength === 2 ? 'text-yellow-400' :
                      passwordStrength.strength === 3 ? 'text-blue-400' :
                      'text-green-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">
                    Use 8+ characters with uppercase, lowercase, numbers & symbols
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  disabled={isLoading || isSendingOTP}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  disabled={isLoading || isSendingOTP}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 text-[#ff7400] focus:ring-[#ff7400] focus:ring-offset-0"
                  required
                  disabled={isLoading || isSendingOTP}
                />
                <span className="text-white/60 text-sm">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-[#ff7400] hover:text-[#ff8500] transition-colors underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    className="text-[#ff7400] hover:text-[#ff8500] transition-colors underline"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSendingOTP || (!!formData.email && !formData.email.toLowerCase().endsWith('@lsb.edu.ph'))}
              className="w-full py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all shadow-lg shadow-[#ff7400]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : isSendingOTP ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  {emailService.isConfigured() ? 'Send Verification Code' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#ff7400] hover:text-[#ff8500] font-medium transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-white/50 hover:text-white/70 text-sm transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#ff7400]/10 border border-[#ff7400]/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">Verify Your Email</h3>
              <p className="text-white/60 text-sm">
                We've sent a 6-digit code to<br />
                <span className="text-white font-medium">{formData.email}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex gap-2 justify-center mb-6">
              {otpInputs.map((value, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOTPInput(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  disabled={isLoading}
                  className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all disabled:opacity-50"
                />
              ))}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-white/60 text-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </div>
            )}

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-white/40 text-sm mb-2">Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isSendingOTP}
                className="text-[#ff7400] hover:text-[#ff8500] text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSendingOTP ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={() => {
                setShowOTPModal(false)
                setOtpInputs(['', '', '', '', '', ''])
              }}
              disabled={isLoading}
              className="w-full mt-6 px-6 py-3 backdrop-blur-xl bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </main>
  )
}
