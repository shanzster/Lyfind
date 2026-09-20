import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface PushNotificationPromptProps {
  onClose?: () => void;
  compact?: boolean;
}

export function PushNotificationPrompt({ onClose, compact = false }: PushNotificationPromptProps) {
  const { isSupported, permission, isEnabled, loading, enableNotifications, disableNotifications } = usePushNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleEnable = async () => {
    setIsProcessing(true);
    try {
      const success = await enableNotifications();
      if (success) {
        toast.success('Push notifications enabled!');
        onClose?.();
      } else {
        toast.error('Failed to enable notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Enable notifications error:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async () => {
    setIsProcessing(true);
    try {
      await disableNotifications();
      toast.success('Push notifications disabled');
      onClose?.();
    } catch (error) {
      console.error('Disable notifications error:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsProcessing(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Push Notifications</p>
            <p className="text-sm text-foreground/60">
              {isEnabled ? 'Enabled' : 'Get notified about messages and matches'}
            </p>
          </div>
        </div>
        <Button
          onClick={isEnabled ? handleDisable : handleEnable}
          disabled={loading || isProcessing}
          variant={isEnabled ? 'outline' : 'default'}
          size="sm"
        >
          {loading || isProcessing ? (
            'Loading...'
          ) : isEnabled ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Disable
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Enable
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-border bg-card p-6 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground/40 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">
            {isEnabled ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
          </h3>
          <p className="text-sm text-foreground/60 mb-4">
            {isEnabled
              ? 'You will receive notifications even when the app is closed'
              : 'Get instant notifications about new messages, matches, and updates'}
          </p>

          {permission === 'denied' && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {isEnabled ? (
              <Button
                onClick={handleDisable}
                disabled={loading || isProcessing}
                variant="outline"
              >
                <BellOff className="h-4 w-4 mr-2" />
                Disable Notifications
              </Button>
            ) : (
              <Button
                onClick={handleEnable}
                disabled={loading || isProcessing || permission === 'denied'}
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
