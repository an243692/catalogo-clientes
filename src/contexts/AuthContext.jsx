import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from '../config/firebase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (user) {
        // Load user profile from localStorage or database
        try {
          const profileData = localStorage.getItem('userProfile')
          const profile = profileData ? JSON.parse(profileData) : {}
          setUserProfile(profile)
        } catch (error) {
          console.error('Error loading user profile:', error)
          setUserProfile({})
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result
    } catch (error) {
      throw error
    }
  }

  const register = async (email, password, userData) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      // Store additional user data
      const profile = {
        uid: result.user.uid,
        email: result.user.email,
        ...userData
      }
      localStorage.setItem('userProfile', JSON.stringify(profile))
      setUserProfile(profile)
      return result
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem('userProfile')
      setUserProfile(null)
    } catch (error) {
      throw error
    }
  }

  const value = {
    currentUser,
    userProfile,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
