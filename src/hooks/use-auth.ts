'use client'

import { useEffect, useState } from 'react'
import { User } from '@/lib/mock-data'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('lyfind_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        setIsLoggedIn(true)
      } catch (e) {
        localStorage.removeItem('lyfind_user')
      }
    }
    setLoading(false)
  }, [])

  const login = (userData: User) => {
    localStorage.setItem('lyfind_user', JSON.stringify(userData))
    setUser(userData)
    setIsLoggedIn(true)
  }

  const logout = () => {
    localStorage.removeItem('lyfind_user')
    setUser(null)
    setIsLoggedIn(false)
  }

  const signup = (userData: User) => {
    localStorage.setItem('lyfind_user', JSON.stringify(userData))
    setUser(userData)
    setIsLoggedIn(true)
  }

  return {
    user,
    isLoggedIn,
    loading,
    login,
    logout,
    signup,
  }
}
