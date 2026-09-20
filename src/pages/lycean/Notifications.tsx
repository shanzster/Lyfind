import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, Sparkles, CheckCircle, Flag, Package, Trash2, CheckCheck } from 'lucide-react';
import LyceanSidebar from '@/components/lycean-sidebar';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType } from '@/services/notificationService';
import { toast } from 'sonner';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return <MessageCircle className="w-5 h-5 text-blue-400" />;
    case 'match':
      return <Sparkles className="w-5 h-5 text-purple-400" />;
    case 'approval':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'report':
      return <Flag className="w-5 h-5 text-red-400" />;
    case 'claim':
      return <Package className="w-5 h-5 text-orange-400" />;
    default:
      return <Bell className="w-5 h-5 text-gray-400" />;
  }
};

const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <LyceanSidebar />
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-medium text-white mb-2">
                  Notifications
                </h1>
                <p className="text-white/60">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 rounded-xl bg-[#ff7400] hover:bg-[#ff7400]/90 text-white font-medium transition-all flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'message', label: 'Messages' },
                { value: 'match', label: 'Matches' },
                { value: 'approval', label: 'Approvals' },
                { value: 'report', label: 'Reports' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value as any)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                    filter === tab.value
                      ? 'bg-[#ff7400] text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Bell className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Notifications</h2>
              <p className="text-white/60">
                {filter === 'all'
                  ? "You're all caught up! Check back later for updates."
                  : `No ${filter} notifications yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
                    !notification.read
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                              )}
                            </div>
                            <p className="text-white/70 text-sm mb-2">
                              {notification.message}
                            </p>
                            <p className="text-white/40 text-xs">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.read && notification.id && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id!)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                title="Mark as read"
                              >
                                <CheckCheck className="w-4 h-4 text-white/60" />
                              </button>
                            )}
                            {notification.id && (
                              <button
                                onClick={() => handleDelete(notification.id!)}
                                disabled={deletingId === notification.id}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-white/60" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Match Card: side-by-side comparison for AI matches */}
                        {notification.type === 'match' && notification.metadata?.matchedItemId && (
                          <div className="mb-3 p-3 rounded-xl bg-white/5 border border-[#ff7400]/30">
                            <div className="flex items-center gap-3">
                              {/* My item */}
                              <div className="flex-1 text-center min-w-0">
                                {notification.metadata.myItemImage ? (
                                  <img
                                    src={notification.metadata.myItemImage}
                                    alt={notification.metadata.myItemTitle}
                                    className="w-full h-20 object-cover rounded-lg mb-1"
                                  />
                                ) : (
                                  <div className="w-full h-20 rounded-lg bg-white/10 mb-1" />
                                )}
                                <p className="text-white/60 text-[11px] truncate">
                                  Your item: {notification.metadata.myItemTitle}
                                </p>
                              </div>

                              {/* Confidence */}
                              <div className="flex-shrink-0 text-center px-1">
                                <div className="w-12 h-12 rounded-full bg-[#ff7400]/20 border border-[#ff7400]/40 flex items-center justify-center">
                                  <span className="text-[#ff7400] text-xs font-bold">
                                    {Math.round(notification.metadata.confidence ?? 0)}%
                                  </span>
                                </div>
                                <p className="text-white/40 text-[10px] mt-1">match</p>
                              </div>

                              {/* Matched item */}
                              <div className="flex-1 text-center min-w-0">
                                {notification.metadata.matchedItemImage ? (
                                  <img
                                    src={notification.metadata.matchedItemImage}
                                    alt={notification.metadata.matchedItemTitle}
                                    className="w-full h-20 object-cover rounded-lg mb-1"
                                  />
                                ) : (
                                  <div className="w-full h-20 rounded-lg bg-white/10 mb-1" />
                                )}
                                <p className="text-white/60 text-[11px] truncate">
                                  Possible match: {notification.metadata.matchedItemTitle}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        {notification.actionUrl && (
                          <Link
                            to={notification.actionUrl}
                            onClick={() => notification.id && !notification.read && handleMarkAsRead(notification.id)}
                            className="inline-block px-4 py-2 rounded-lg bg-[#ff7400] hover:bg-[#ff7400]/90 text-white text-sm font-medium transition-all"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
