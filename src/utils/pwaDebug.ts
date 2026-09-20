// Persistent debug logger for PWA
class PWADebugger {
  private logs: string[] = [];
  private maxLogs = 100;

  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('pwa_debug_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save debug logs');
    }
    
    // Also log to console
    console.log(logEntry);
  }

  getLogs(): string[] {
    try {
      const saved = localStorage.getItem('pwa_debug_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load debug logs');
    }
    return this.logs;
  }

  clear() {
    this.logs = [];
    localStorage.removeItem('pwa_debug_logs');
  }
}

export const pwaDebug = new PWADebugger();
