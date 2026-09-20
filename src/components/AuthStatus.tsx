import { useState, useEffect } from 'react';

export function AuthStatus() {
  const [status, setStatus] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for auth status updates
    const handleStatus = (event: CustomEvent) => {
      setStatus(event.detail);
      setVisible(true);
      
      // Auto-hide after 3 seconds unless it's an error
      if (!event.detail.includes('Error') && !event.detail.includes('Failed') && !event.detail.includes('❌')) {
        setTimeout(() => setVisible(false), 3000);
      }
    };

    window.addEventListener('auth-status' as any, handleStatus);
    return () => window.removeEventListener('auth-status' as any, handleStatus);
  }, []);

  if (!visible) return null;

  const isError = status.includes('Error') || status.includes('Failed') || status.includes('❌');

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4">
      <div className={`backdrop-blur-xl border rounded-xl p-4 shadow-2xl ${
        isError 
          ? 'bg-red-500/90 border-red-300/50' 
          : 'bg-black/90 border-white/20'
      }`}>
        <p className="text-white text-sm text-center font-medium">{status}</p>
      </div>
    </div>
  );
}

// Helper to emit status
export function emitAuthStatus(message: string) {
  console.log('[AuthStatus]', message);
  window.dispatchEvent(new CustomEvent('auth-status', { detail: message }));
}
