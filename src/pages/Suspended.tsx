import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appealService, Appeal } from '@/services/appealService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, FileText, ShieldAlert } from 'lucide-react';

export default function SuspendedPage() {
  const { userProfile, logout } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appeal, setAppeal] = useState<Appeal | null>(null);

  const until = userProfile?.suspendedUntil ?? null;
  const untilText = until
    ? `${until.toDate().toLocaleDateString()} ${until.toDate().toLocaleTimeString()}`
    : 'Indefinite';

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userProfile?.uid) return;
      try {
        const existing = await appealService.getLatestAppealForUser(userProfile.uid);
        if (active) setAppeal(existing);
      } catch (e) {
        console.error('Failed to load appeal:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userProfile?.uid]);

  const handleSubmit = async () => {
    if (!userProfile) return;
    if (reason.trim().length < 20) {
      toast.error('Please explain your appeal in a bit more detail (at least 20 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await appealService.submitAppeal({
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.email,
        userEmail: userProfile.email,
        reason: reason.trim(),
        suspensionReason: userProfile.suspensionReason,
      });
      toast.success('Appeal submitted. An administrator will review it.');
      const updated = await appealService.getLatestAppealForUser(userProfile.uid);
      setAppeal(updated);
      setReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: Appeal['status']) => {
    if (status === 'approved') return <Badge className="bg-green-600">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-amber-500">Pending review</Badge>;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Your account is suspended</h1>
            <p className="text-sm text-muted-foreground">
              Suspended until: <span className="font-medium">{untilText}</span>
            </p>
            {userProfile?.suspensionReason && (
              <p className="mt-1 text-sm text-muted-foreground">
                Reason: {userProfile.suspensionReason}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          To have your suspension reviewed, submit an appeal below. An administrator can only lift
          your suspension after you have submitted an appeal.
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : appeal ? (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your appeal</span>
              {statusBadge(appeal.status)}
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{appeal.reason}</p>
            <a
              href={appeal.pdfDataUrl}
              download="suspension-appeal.pdf"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="h-4 w-4" /> Download appeal PDF
            </a>
            {appeal.decisionNote && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Admin note:</span> {appeal.decisionNote}
              </p>
            )}
            {appeal.status === 'rejected' && (
              <p className="text-xs text-muted-foreground">
                Your appeal was not approved. You may submit a new appeal with more details.
              </p>
            )}
            {appeal.status === 'rejected' && (
              <Button variant="outline" size="sm" onClick={() => setAppeal(null)}>
                Submit a new appeal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="appeal-reason">Your appeal</Label>
              <Textarea
                id="appeal-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your suspension should be lifted…"
                rows={6}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                A PDF of your appeal is generated and sent to the administrators for review.
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit appeal'
              )}
            </Button>
          </div>
        )}

        <div className="border-t pt-4 text-center">
          <button
            onClick={() => logout()}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
