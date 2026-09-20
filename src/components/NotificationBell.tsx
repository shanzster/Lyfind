import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, Sparkles, CheckCircle, Flag, Package, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/services/notificationService';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return <MessageCircle className="w-4 h-4 text-blue-400" />;
    case 'match':
      return <Sparkles className="w-4 h-4 text-purple-400" />;
    case 'approval':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'report':
      return <Flag className="w-4 h-4 text-red-400" />;
    case 'claim':
      return <Package className="w-4 h-4 text-orange-400" />;
    default:
      return <Bell className="w-4 h-4 text-gray-400" />;
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {recentNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={notification.actionUrl || '/notifications'}
                      onClick={() => handleNotificationClick(notification)}
                      className={`block p-4 hover:bg-white/5 transition-all ${
                        !notification.read ? 'bg-white/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-white text-sm font-medium">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-white/60 text-xs line-clamp-2 mb-1">
                            {notification.message}
                          </p>
                          <p className="text-white/40 text-xs">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {recentNotifications.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-[#ff7400] text-sm font-medium hover:text-[#ff7400]/80 transition-colors"
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
