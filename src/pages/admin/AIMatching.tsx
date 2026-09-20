import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Zap, BarChart3, Trash2, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { aiMatchingService, AIMatchResult } from '@/services/aiMatchingService';
import { toast } from 'sonner';

export default function AIMatching() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<AIMatchResult[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    dismissed: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<AIMatchResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadMatchData();
  }, [statusFilter]);

  const loadMatchData = async () => {
    setLoading(true);
    try {
      const [matchesData, statsData] = await Promise.all([
        aiMatchingService.getAllMatches({ status: statusFilter }),
        aiMatchingService.getMatchStats()
      ]);

      setMatches(matchesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading match data:', error);
      toast.error('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      await aiMatchingService.deleteMatch(matchId);
      toast.success('Match deleted successfully');
      loadMatchData();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const handleUpdateStatus = async (matchId: string, status: 'confirmed' | 'dismissed', note?: string) => {
    try {
      await aiMatchingService.updateMatchStatus(matchId, status, 'admin', note);
      toast.success(`Match ${status} successfully`);
      loadMatchData();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error updating match status:', error);
      toast.error('Failed to update match status');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 55) return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (score >= 45) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
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
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                AI Photo Matching
              </h1>
              <p className="text-white/60">Monitor AI matching performance and statistics</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                How It Works
              </button>
              <button
                onClick={loadMatchData}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.total}</h3>
              <p className="text-sm text-white/60">Total Matches</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.avgScore}%</h3>
              <p className="text-sm text-white/60">Avg Match Score</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.pending}</h3>
              <p className="text-sm text-white/60">Pending Review</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.confirmed}</h3>
              <p className="text-sm text-white/60">Confirmed</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {['all', 'pending', 'confirmed', 'dismissed'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  statusFilter === filter
                    ? 'bg-[#ff7400] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* How It Works Section */}
          <div className="backdrop-blur-xl bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Matching</h3>
                <p className="text-purple-200/80 text-sm mb-3">
                  LyFind uses TensorFlow.js and MobileNet to automatically match lost and found items based on visual similarity.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-purple-300 font-medium mb-1">1. Feature Extraction</p>
                    <p className="text-white/60 text-xs">MobileNet extracts 1024 features from each photo</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-purple-300 font-medium mb-1">2. Similarity Comparison</p>
                    <p className="text-white/60 text-xs">Cosine similarity computed between feature vectors</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-purple-300 font-medium mb-1">3. Match Scoring</p>
                    <p className="text-white/60 text-xs">Scores 45%+ are considered potential matches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Matches */}
          {matches.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No AI Matches Yet</h2>
              <p className="text-white/60 mb-6">Photo matching data will appear here once users start using the LyFind Assistant</p>
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Photo Match Results</h3>
                <p className="text-white/60 text-sm">AI-generated matches from user photo uploads</p>
              </div>
              <div className="divide-y divide-white/10">
                {matches.map((match) => (
                  <div key={match.id} className="p-6 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex gap-3">
                        <img 
                          src={match.queryImageUrl} 
                          alt="Query" 
                          className="w-20 h-20 rounded-xl object-cover border border-white/10"
                        />
                        <div className="text-white/40 flex items-center">→</div>
                        <img 
                          src={match.matchedImageUrl} 
                          alt="Match" 
                          className="w-20 h-20 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getScoreColor(match.similarityScore)}`}>
                            {match.similarityScore}% Match
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            match.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            match.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-white font-medium mb-1">{match.matchedItemTitle}</p>
                        <p className="text-white/50 text-sm">
                          Matched by: {match.matchedByName} • {match.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowDetailModal(true);
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(match.id!)}
                          className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Match Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Images */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-2">Query Image</p>
                  <img 
                    src={selectedMatch.queryImageUrl} 
                    alt="Query" 
                    className="w-full h-64 rounded-xl object-cover border border-white/10"
                  />
                  <p className="text-white text-sm mt-2">{selectedMatch.queryItemTitle}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Matched Item</p>
                  <img 
                    src={selectedMatch.matchedImageUrl} 
                    alt="Match" 
                    className="w-full h-64 rounded-xl object-cover border border-white/10"
                  />
                  <p className="text-white text-sm mt-2">{selectedMatch.matchedItemTitle}</p>
                </div>
              </div>

              {/* Match Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-white/60 text-sm mb-1">Similarity Score</p>
                  <p className="text-2xl font-bold text-white">{selectedMatch.similarityScore}%</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-white/60 text-sm mb-1">Status</p>
                  <p className="text-2xl font-bold text-white capitalize">{selectedMatch.status}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-white/60 text-sm mb-1">Matched By</p>
                  <p className="text-white">{selectedMatch.matchedByName}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-white/60 text-sm mb-1">Created At</p>
                  <p className="text-white text-sm">{selectedMatch.createdAt?.toDate().toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              {selectedMatch.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedMatch.id!, 'confirmed', 'Confirmed by admin')}
                    className="flex-1 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all"
                  >
                    Confirm Match
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedMatch.id!, 'dismissed', 'Dismissed by admin')}
                    className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
                  >
                    Dismiss Match
                  </button>
                </div>
              )}

              <button
                onClick={() => navigate(`/admin/items/${selectedMatch.matchedItemId}`)}
                className="w-full px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
              >
                View Matched Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">How AI Matching Works</h3>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Technology Stack */}
              <div>
                <h4 className="text-white font-semibold mb-3">Technology Stack</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-purple-400 font-medium mb-1">TensorFlow.js</p>
                    <p className="text-white/60 text-sm">Machine learning framework</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-purple-400 font-medium mb-1">MobileNet</p>
                    <p className="text-white/60 text-sm">Pre-trained image model</p>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div>
                <h4 className="text-white font-semibold mb-3">Matching Process</h4>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Feature Extraction</p>
                      <p className="text-white/60 text-sm">MobileNet analyzes the image and extracts 1024 numerical features representing visual characteristics (colors, shapes, textures, objects).</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Candidate Selection</p>
                      <p className="text-white/60 text-sm">System fetches opposite type items (lost items match with found, found with lost) that are currently active.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Similarity Computation</p>
                      <p className="text-white/60 text-sm">Cosine similarity is calculated between feature vectors. This measures how similar two images are on a scale of 0-100%.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold">
                      4
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Match Filtering</p>
                      <p className="text-white/60 text-sm">Only matches with 70% or higher similarity are stored and shown to users as potential matches.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold">
                      5
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">User Notification</p>
                      <p className="text-white/60 text-sm">Users receive notifications about potential matches and can view them in their dashboard.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Interpretation */}
              <div>
                <h4 className="text-white font-semibold mb-3">Score Interpretation</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 font-bold">90-100%</span>
                    <span className="text-white/70 text-sm">Excellent match - Very likely the same item</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-blue-400 font-bold">80-89%</span>
                    <span className="text-white/70 text-sm">Good match - Strong similarity</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-yellow-400 font-bold">70-79%</span>
                    <span className="text-white/70 text-sm">Possible match - Worth checking</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-500/10 border border-gray-500/20">
                    <span className="text-gray-400 font-bold">&lt;70%</span>
                    <span className="text-white/70 text-sm">Low similarity - Not shown to users</span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div>
                <h4 className="text-white font-semibold mb-3">Performance</h4>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <ul className="space-y-2 text-white/70 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Runs automatically in background after item is posted</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Processing time: ~2-5 seconds per item</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Model loads once and stays in memory for fast processing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Runs entirely in browser - no server costs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="w-full mt-6 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
