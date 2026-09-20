import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  teacherVerificationService,
  TeacherVerificationRequest,
} from '@/services/teacherVerificationService';
import { storageService } from '@/services/storageService';
import { toast } from 'sonner';

export default function TeacherVerificationPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<TeacherVerificationRequest | null>(null);
  const [department, setDepartment] = useState('');
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const unsubscribe = teacherVerificationService.subscribeToRequest(user.uid, req => {
      setRequest(req);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, navigate]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIdPhotoFile(file);
    setIdPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !idPhotoFile || !acknowledged) return;

    setSubmitting(true);
    try {
      const compressed = await storageService.compressImage(idPhotoFile);
      const idPhotoURL = await storageService.uploadToCloudinary(compressed);
      await teacherVerificationService.submitRequest(
        user,
        idPhotoURL,
        department.trim() || undefined
      );
      toast.success('Verification request submitted! An admin will review your ID.');
    } catch (error: any) {
      console.error('[TeacherVerification] Submit failed:', error);
      toast.error(error?.message || 'Failed to submit verification request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isVerified =
    userProfile?.role === 'faculty' || request?.status === 'approved';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <GraduationCap className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Teacher Account</h1>
            <p className="text-foreground/60">
              Verify your faculty ID to unlock teacher privileges
            </p>
          </div>
        </div>

        {isVerified ? (
          <Card className="border-green-500/30 bg-green-500/5 p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">You're Verified!</h2>
            <p className="text-foreground/60">
              Your account has faculty privileges. Your posts go live immediately without
              waiting for admin approval, and a "Verified Teacher" badge is shown on your items.
            </p>
          </Card>
        ) : request?.status === 'rejected' ? (
          <Card className="border-red-500/30 bg-red-500/5 p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Verification Rejected</h2>
            <p className="text-foreground/80 mb-4">
              Your teacher ID verification was rejected and your account has been banned.
            </p>
            {request.rejectionReason && (
              <p className="text-foreground/60 mb-4">
                Reason: {request.rejectionReason}
              </p>
            )}
            <p className="text-sm text-foreground/60">
              If you believe this was a mistake, contact an administrator to appeal.
            </p>
          </Card>
        ) : request?.status === 'pending' ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5 p-8">
            <div className="text-center mb-6">
              <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Under Review</h2>
              <p className="text-foreground/60">
                Your faculty ID has been submitted and is waiting for admin review. You'll get a
                notification once it has been processed.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden border border-border max-w-sm mx-auto">
              <img
                src={request.idPhotoURL}
                alt="Submitted faculty ID"
                className="w-full object-contain"
              />
            </div>
            <p className="text-center text-sm text-foreground/50 mt-4">
              Submitted {formatDate(request.submittedAt)}
            </p>
          </Card>
        ) : (
          <>
            {/* Disclaimer */}
            <Card className="border-red-500/40 bg-red-500/5 p-6 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-600 mb-2">
                    Read Before Submitting
                  </h3>
                  <p className="text-sm text-foreground/80">
                    Teacher verification is strictly for genuine faculty members. Your uploaded
                    faculty ID will be reviewed by an administrator.{' '}
                    <strong>
                      If an admin rejects your ID, your account will be permanently banned.
                    </strong>{' '}
                    Submitting a fake, edited, or someone else's ID is treated as a serious
                    violation. Only proceed if you are a faculty member with a valid ID.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-card p-6">
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground/60">
                    Department (optional)
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g., College of Computer Studies"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground/60">
                    Faculty ID Photo *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  {idPhotoPreview ? (
                    <div className="mt-2">
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img
                          src={idPhotoPreview}
                          alt="Faculty ID preview"
                          className="w-full object-contain max-h-80"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 w-full border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary transition-colors"
                    >
                      <Upload className="h-8 w-8 text-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-foreground/60">
                        Click to upload a clear photo of your faculty ID
                      </p>
                      <p className="text-xs text-foreground/40 mt-1">Max 5MB</p>
                    </button>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={e => setAcknowledged(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground/80">
                    I confirm that I am a faculty member and the ID I am submitting is my own,
                    valid faculty ID. I understand that{' '}
                    <strong>my account will be permanently banned</strong> if this verification
                    is rejected.
                  </span>
                </label>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!idPhotoFile || !acknowledged || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for Verification'
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
