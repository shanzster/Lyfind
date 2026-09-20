import { useState, useEffect } from 'react';
import { pwaDebug } from '@/utils/pwaDebug';

export function DebugOverlay() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Load logs from localStorage
    const loadLogs = () => {
      setLogs(pwaDebug.getLogs());
    };

    loadLogs();
    const interval = setInterval(loadLogs, 1000); // Refresh every second

    return () => clearInterval(interval);
  }, []);

  // Always show for debugging (comment out to only show in PWA)
  // const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
  //               (window.navigator as any).standalone === true;
  // if (!isPWA) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-[9999] w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-all"
      >
        {isVisible ? '✕' : '🐛'}
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed inset-0 z-[9998] bg-black/95 backdrop-blur-sm overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Debug Logs (Persistent)</h2>
                  <p className="text-xs text-gray-400">Logs survive page reloads</p>
                </div>
                <button
                  onClick={() => {
                    pwaDebug.clear();
                    setLogs([]);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded text-sm">
                <p className="text-blue-200">
                  <strong>How to use:</strong> Try signing in with Google. These logs will persist even after the redirect!
                </p>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No logs yet. Try signing in with Google.</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-auto">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-xs font-mono break-all ${
                        log.includes('✅') 
                          ? 'bg-green-900/30 text-green-200'
                          : log.includes('❌') || log.includes('ERROR')
                          ? 'bg-red-900/30 text-red-200'
                          : log.includes('===')
                          ? 'bg-blue-900/30 text-blue-200 font-bold'
                          : 'bg-gray-800 text-gray-200'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500 text-center">
                Total logs: {logs.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
