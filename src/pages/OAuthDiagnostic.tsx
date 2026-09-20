import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getRedirectResult } from 'firebase/auth';

export default function OAuthDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const logs: string[] = [];

      // 1. Check URL
      logs.push('=== URL DIAGNOSTICS ===');
      logs.push(`Current URL: ${window.location.href}`);
      logs.push(`Origin: ${window.location.origin}`);
      logs.push(`Pathname: ${window.location.pathname}`);
      logs.push(`Search: ${window.location.search}`);
      logs.push(`Hash: ${window.location.hash}`);

      // 2. Check Firebase Config
      logs.push('\n=== FIREBASE CONFIG ===');
      logs.push(`Auth Domain: ${auth.app.options.authDomain}`);
      logs.push(`Project ID: ${auth.app.options.projectId}`);
      logs.push(`API Key: ${auth.app.options.apiKey?.substring(0, 10)}...`);

      // 3. Check Auth State
      logs.push('\n=== AUTH STATE ===');
      logs.push(`Current User: ${auth.currentUser?.email || 'null'}`);
      logs.push(`Current User UID: ${auth.currentUser?.uid || 'null'}`);

      // 4. Check localStorage
      logs.push('\n=== LOCAL STORAGE ===');
      const googlePending = localStorage.getItem('googleSignInPending');
      logs.push(`googleSignInPending: ${googlePending}`);
      
      const authKeys = Object.keys(localStorage).filter(k => 
        k.includes('firebase') || k.includes('auth')
      );
      logs.push(`Firebase keys in localStorage: ${authKeys.length}`);
      authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        logs.push(`  ${key}: ${value?.substring(0, 50)}...`);
      });

      // 5. Check redirect result
      logs.push('\n=== REDIRECT RESULT ===');
      try {
        logs.push('Calling getRedirectResult()...');
        const result = await getRedirectResult(auth);
        
        if (result) {
          logs.push('✅ REDIRECT RESULT FOUND!');
          logs.push(`User: ${result.user.email}`);
          logs.push(`UID: ${result.user.uid}`);
          logs.push(`Display Name: ${result.user.displayName}`);
          logs.push(`Provider: ${result.providerId}`);
        } else {
          logs.push('❌ No redirect result (null)');
        }
      } catch (error: any) {
        logs.push('❌ ERROR getting redirect result:');
        logs.push(`Message: ${error.message}`);
        logs.push(`Code: ${error.code}`);
        logs.push(`Stack: ${error.stack}`);
      }

      // 6. Check browser info
      logs.push('\n=== BROWSER INFO ===');
      logs.push(`User Agent: ${navigator.userAgent}`);
      logs.push(`Platform: ${navigator.platform}`);
      logs.push(`Language: ${navigator.language}`);
      logs.push(`Online: ${navigator.onLine}`);
      logs.push(`Cookies Enabled: ${navigator.cookieEnabled}`);

      // 7. Check PWA mode
      logs.push('\n=== PWA DETECTION ===');
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      logs.push(`matchMedia standalone: ${isPWA}`);
      logs.push(`navigator.standalone: ${isStandalone}`);
      logs.push(`Android app referrer: ${isAndroidApp}`);
      logs.push(`Final isPWA: ${isPWA || isStandalone || isAndroidApp}`);

      // 8. Check network
      logs.push('\n=== NETWORK ===');
      try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
        logs.push('✅ Network connection OK');
      } catch (error) {
        logs.push('❌ Network connection FAILED');
      }

      setDiagnostics(logs);
      setChecking(false);
    };

    runDiagnostics();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(diagnostics.join('\n'));
    alert('Diagnostics copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            OAuth Diagnostic Tool
          </h1>

          {checking ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Running diagnostics...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[70vh]">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {diagnostics.join('\n')}
                </pre>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What to do with this:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click "Copy to Clipboard"</li>
                  <li>Send the diagnostics to your developer</li>
                  <li>Check if "REDIRECT RESULT FOUND" appears</li>
                  <li>If you see errors, note the error code</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
