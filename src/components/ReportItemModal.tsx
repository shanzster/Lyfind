import { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReportItemModalProps {
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onReported: () => void;
}

const reportCategories = [
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Offensive or inappropriate material' },
  { value: 'spam', label: 'Spam', description: 'Repetitive or irrelevant content' },
  { value: 'fraud', label: 'Fraudulent', description: 'Suspicious or fake post' },
  { value: 'duplicate', label: 'Duplicate', description: 'Already posted by someone else' },
  { value: 'other', label: 'Other', description: 'Other reason' }
];

export default function ReportItemModal({ itemId, itemTitle, onClose, onReported }: ReportItemModalProps) {
  const { user, userProfile } = useAuth();
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) {
      toast.error('You must be logged in to report items');
      return;
    }

    if (!category) {
      toast.error('Please select a reason');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setSubmitting(true);

    try {
      // Check if user already reported this item
      const hasReported = await reportService.hasUserReported(itemId, user.uid);
      if (hasReported) {
        toast.error('You have already reported this item');
        setSubmitting(false);
        return;
      }

      // Create report
      await reportService.createReport({
        itemId,
        itemTitle,
        reportedBy: user.uid,
        reporterName: userProfile.displayName || user.displayName || 'Anonymous',
        reporterEmail: user.email!,
        reason: reportCategories.find(c => c.value === category)?.label || category,
        category: category as any,
        description: description.trim()
      });

      toast.success('Report submitted successfully');
      onReported();
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Flag className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Report Item</h3>
              <p className="text-sm text-white/60">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-400/90 text-sm">
            False reports may result in account suspension. Only report items that violate our community guidelines.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="text-white/70 text-sm mb-3 block">Reason for Report *</label>
            <div className="space-y-2">
              {reportCategories.map((cat) => (
                <label
                  key={cat.value}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    category === cat.value
                      ? 'bg-red-500/20 border-red-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{cat.label}</p>
                    <p className="text-white/50 text-xs mt-0.5">{cat.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Additional Details *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about why you're reporting this item..."
              required
              rows={4}
              className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all resize-none"
            />
            <p className="text-white/40 text-xs mt-2">
              Be specific and provide evidence if possible
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 backdrop-blur-xl bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !category || !description.trim()}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
