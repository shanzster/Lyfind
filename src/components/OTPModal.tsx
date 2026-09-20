import { useState, useEffect } from 'react'
import { X, Mail, Loader2, CheckCircle2 } from 'lucide-react'

interface OTPModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onVerify: (otp: string) => Promise<boolean>
  onResend: () => Promise<void>
}

export default function OTPModal({ isOpen, onClose, email, onVerify, onResend }: OTPModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', ''])
      setError('')
      setCountdown(60)
      setCanResend(false)
    }
  }, [isOpen])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtp(newOtp)

    // Auto-verify if complete
    if (newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('')
    if (code.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const success = await onVerify(code)
      if (!success) {
        setError('Invalid OTP. Please try again.')
        setOtp(['', '', '', '', '', ''])
        document.getElementById('otp-0')?.focus()
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed')
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    
    try {
      await onResend()
      setCountdown(60)
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } catch (error: any) {
      setError(error.message || 'Failed to resend OTP')
    } finally {
      setIsResending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#ff7400]/10 border border-[#ff7400]/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-[#ff7400]" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Verify Your Email</h3>
              <p className="text-white/50 text-sm">Enter the 6-digit code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Email Display */}
        <div className="mb-6 p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
          <p className="text-white/60 text-sm mb-1">Code sent to:</p>
          <p className="text-white font-medium">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <div className="flex gap-2 lg:gap-3 justify-center mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isVerifying}
                className="w-12 h-14 lg:w-14 lg:h-16 text-center text-2xl font-bold bg-white/5 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-[#ff7400] focus:bg-white/10 transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={isVerifying || otp.some(digit => !digit)}
          className="w-full py-3 lg:py-4 bg-[#ff7400] text-white font-medium rounded-xl transition-all shadow-lg shadow-[#ff7400]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Verify Email
            </>
          )}
        </button>

        {/* Resend */}
        <div className="text-center">
          <p className="text-white/50 text-sm mb-2">
            Didn't receive the code?
          </p>
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-[#ff7400] hover:text-[#ff8500] font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          ) : (
            <p className="text-white/40 text-sm">
              Resend in {countdown}s
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
          <p className="text-white/50 text-xs text-center leading-relaxed">
            🔐 This code will expire in 10 minutes. Never share your verification code with anyone.
          </p>
        </div>
      </div>
    </div>
  )
}
