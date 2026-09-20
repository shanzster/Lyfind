import { useState, useEffect } from 'react';
import { FileText, Activity } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminService } from '@/services/adminService';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await adminService.getAdminLogs({ limit: 50 });
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: any = {
      'approve_post': 'Approved Post',
      'reject_post': 'Rejected Post',
      'suspend_user': 'Suspended User',
      'ban_user': 'Banned User',
      'delete_item': 'Deleted Item',
      'request_info': 'Requested Info'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('approve')) return 'text-green-400 bg-green-500/20';
    if (action.includes('reject') || action.includes('delete')) return 'text-red-400 bg-red-500/20';
    if (action.includes('suspend') || action.includes('ban')) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-blue-400 bg-blue-500/20';
  };

  if (loading) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminSidebar />
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Activity Logs
            </h1>
            <p className="text-white/60">
              {logs.length} admin action{logs.length !== 1 ? 's' : ''} logged
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Activity Logs</h2>
              <p className="text-white/60">Admin actions will be logged here</p>
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/10">
                {logs.map((log) => (
                  <div key={log.id} className="p-6 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="text-sm text-white/60">
                            {log.timestamp?.toDate().toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm mb-2">
                          Target ID: <span className="font-mono text-white/60">{log.targetId}</span>
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                            <pre className="text-xs text-white/70 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
