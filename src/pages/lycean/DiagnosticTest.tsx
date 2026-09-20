import { useState } from 'react'
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function DiagnosticTest() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message])
    console.log('[Diagnostic]', message)
  }

  const runDiagnostics = async () => {
    setTestResults([])
    setLoading(true)

    try {
      // Test 1: Check authentication
      addResult('✓ Test 1: Checking authentication...')
      if (!user) {
        addResult('✗ FAILED: User not authenticated')
        return
      }
      addResult(`✓ PASSED: User authenticated as ${user.email}`)

      // Test 2: Check Firestore connection
      addResult('✓ Test 2: Checking Firestore connection...')
      try {
        const testCollection = collection(db, 'items')
        addResult('✓ PASSED: Firestore connection established')

        // Test 3: Try to read items
        addResult('✓ Test 3: Attempting to read items collection...')
        const snapshot = await getDocs(testCollection)
        addResult(`✓ PASSED: Read ${snapshot.docs.length} items from Firestore`)

        // Test 4: Try to create a test item
        addResult('✓ Test 4: Attempting to create a test item...')
        const testItem = {
          type: 'lost',
          title: 'Diagnostic Test Item',
          description: 'This is a test item created by the diagnostic tool',
          category: 'Other',
          location: {
            lat: 14.8167,
            lng: 120.2833,
            address: 'Test Location'
          },
          photos: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
          userId: user.uid,
          userName: user.displayName || 'Test User',
          userEmail: user.email || 'test@lsb.edu.ph',
          status: 'active',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        const docRef = await addDoc(testCollection, testItem)
        addResult(`✓ PASSED: Created test item with ID: ${docRef.id}`)
        addResult('✓ ALL TESTS PASSED! Your Firestore is configured correctly.')
        toast.success('All diagnostic tests passed!')

      } catch (error: any) {
        if (error.code === 'permission-denied') {
          addResult('✗ FAILED: Permission denied')
          addResult('→ Solution: Configure Firestore security rules in Firebase Console')
          addResult('→ Go to: https://console.firebase.google.com/project/lyfind-72845/firestore/rules')
          toast.error('Permission denied. Check Firestore security rules.')
        } else if (error.message?.includes('not found')) {
          addResult('✗ FAILED: Database not found')
          addResult('→ Solution: Create Firestore database in Firebase Console')
          addResult('→ Go to: https://console.firebase.google.com/project/lyfind-72845/firestore')
          toast.error('Database not found. Create Firestore database.')
        } else {
          addResult(`✗ FAILED: ${error.message}`)
          addResult(`→ Error code: ${error.code}`)
          toast.error(`Test failed: ${error.message}`)
        }
      }

    } catch (error: any) {
      addResult(`✗ UNEXPECTED ERROR: ${error.message}`)
      toast.error('Unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2f1632] via-[#1a0d1c] to-[#0a0508] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-4xl font-medium text-white mb-4">Firestore Diagnostic Test</h1>
          <p className="text-white/60 mb-8">
            This tool will test your Firestore configuration and identify any issues.
          </p>

          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-8 py-4 bg-[#ff7400] text-white rounded-2xl font-medium hover:bg-[#ff7400]/90 transition-all shadow-lg shadow-[#ff7400]/30 disabled:opacity-50 disabled:cursor-not-allowed mb-8"
          >
            {loading ? 'Running Tests...' : 'Run Diagnostic Tests'}
          </button>

          {testResults.length > 0 && (
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-medium text-white mb-4">Test Results:</h2>
              <div className="space-y-2 font-mono text-sm">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`${
                      result.startsWith('✓')
                        ? 'text-green-400'
                        : result.startsWith('✗')
                        ? 'text-red-400'
                        : result.startsWith('→')
                        ? 'text-yellow-400 pl-4'
                        : 'text-white/70'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-3">Quick Fixes:</h3>
            <div className="space-y-3 text-white/70 text-sm">
              <div>
                <strong className="text-white">If you see "Permission denied":</strong>
                <p className="ml-4 mt-1">
                  1. Go to{' '}
                  <a
                    href="https://console.firebase.google.com/project/lyfind-72845/firestore/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff7400] hover:underline"
                  >
                    Firestore Rules
                  </a>
                </p>
                <p className="ml-4">2. Set rules to allow authenticated users to read/write</p>
                <p className="ml-4">3. See FIRESTORE_SETUP.md for detailed instructions</p>
              </div>
              <div>
                <strong className="text-white">If you see "Database not found":</strong>
                <p className="ml-4 mt-1">
                  1. Go to{' '}
                  <a
                    href="https://console.firebase.google.com/project/lyfind-72845/firestore"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff7400] hover:underline"
                  >
                    Firestore Database
                  </a>
                </p>
                <p className="ml-4">2. Click "Create database"</p>
                <p className="ml-4">3. Choose production mode and select a location</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
