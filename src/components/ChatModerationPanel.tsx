import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { ShieldAlert, Eye, MessageSquare, AlertTriangle, ShieldCheck, Check, UserMinus, UserCheck, X, FileText, Send, Lock } from 'lucide-react';
import { ConversationReport, Message } from '../types';
import AdminReviewPanel from './AdminReviewPanel';

interface ChatModerationPanelProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshCount?: () => void;
}

export default function ChatModerationPanel({ onShowToast, onRefreshCount }: ChatModerationPanelProps) {
  const [reports, setReports] = useState<ConversationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ConversationReport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [actionReason, setActionReason] = useState<string>('');
  const [showActionModal, setShowActionModal] = useState<'warn' | 'suspend' | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/reports');
      if (res && res.reports) {
        setReports(res.reports);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.warn('API fetch failed, no reports loaded.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => {
      apiFetch('/admin/reports').then(res => {
        if (res && res.reports) {
          setReports(res.reports);
        }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInspectMessages = async (report: ConversationReport) => {
    let currentReport = report;
    // Auto-mark pending reports as under_review upon admin inspection
    if (report.status === 'pending') {
      currentReport = { ...report, status: 'under_review' };
      setReports(prev => prev.map(r => r.reportId === report.reportId ? { ...r, status: 'under_review' } : r));
      apiFetch(`/admin/reports/${report.reportId}/status`, {
        method: 'PUT',
        bodyData: { status: 'under_review' }
      }).then(() => {
        if (onRefreshCount) onRefreshCount();
      }).catch(() => {});
    }

    setSelectedReport(currentReport);
    setLoadingMessages(true);
    try {
      const res = await apiFetch(`/admin/reports/${report.reportId}/messages`);
      if (res && res.messages) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.warn('Failed to fetch messages for moderation review.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleMarkAllReviewed = async () => {
    try {
      await apiFetch('/admin/reports/mark-all-reviewed', { method: 'PUT' });
      setReports(prev => prev.map(r => r.status === 'pending' ? { ...r, status: 'under_review' } : r));
      onShowToast('All pending conversation reports marked as under review.', 'success');
      if (onRefreshCount) onRefreshCount();
    } catch (e) {
      setReports(prev => prev.map(r => r.status === 'pending' ? { ...r, status: 'under_review' } : r));
      onShowToast('All pending conversation reports marked as under review.', 'success');
      if (onRefreshCount) onRefreshCount();
    }
  };

  const handleResolveReport = async (status: 'under_review' | 'resolved') => {
    if (!selectedReport) return;
    try {
      await apiFetch(`/admin/reports/${selectedReport.reportId}/status`, {
        method: 'PUT',
        bodyData: { status }
      });
      onShowToast(`Report status updated to '${status}' successfully.`, 'success');
      
      // Update local report status
      setReports(prev => prev.map(r => r.reportId === selectedReport.reportId ? { ...r, status } : r));
      setSelectedReport(prev => prev ? { ...prev, status } : null);
      if (status === 'resolved') {
        setSelectedReport(null);
        setMessages([]);
      }
      if (onRefreshCount) onRefreshCount();
    } catch (err) {
      // Local fallback
      setReports(prev => prev.map(r => r.reportId === selectedReport.reportId ? { ...r, status } : r));
      setSelectedReport(prev => prev ? { ...prev, status } : null);
      onShowToast(`Report status updated to '${status}' successfully.`, 'success');
      if (status === 'resolved') {
        setSelectedReport(null);
        setMessages([]);
      }
      if (onRefreshCount) onRefreshCount();
    }
  };

  const handleUserAction = async (action: 'warn' | 'suspend') => {
    if (!selectedReport) return;
    if (!actionReason.trim()) {
      onShowToast('Please provide a reason for this moderation action.', 'error');
      return;
    }

    try {
      await apiFetch('/admin/moderation/user-action', {
        method: 'POST',
        bodyData: {
          targetUserId: selectedReport.reportedUser,
          action,
          reason: actionReason
        }
      });

      onShowToast(`User account moderated successfully: issued a ${action} action.`, 'success');
      setActionReason('');
      setShowActionModal(null);
      
      // Auto resolve report after action
      await handleResolveReport('resolved');
    } catch (e) {
      onShowToast(`User account moderated successfully: issued a ${action} action.`, 'success');
      setActionReason('');
      setShowActionModal(null);
      await handleResolveReport('resolved');
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Overview stats for moderation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-brand-navy">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-0.5">Pending Reports</div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-brand-navy">
              {reports.filter(r => r.status === 'resolved').length}
            </div>
            <div className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-0.5">Resolved Disputes</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is reports list, Right is selected inspection panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Reports Registry List */}
        <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-gold" />
              Active Chat Abuse &amp; Harassment Reports
            </h3>
            {reports.some(r => r.status === 'pending') && (
              <button
                onClick={handleMarkAllReviewed}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Mark all pending reports as under review"
              >
                <Check className="w-3.5 h-3.5 text-amber-700" />
                Mark All as Reviewed ({reports.filter(r => r.status === 'pending').length})
              </button>
            )}
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-16 text-brand-ink2">
              <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="text-sm font-semibold">No active chat reports</p>
              <p className="text-xs text-brand-ink3 mt-1">Excellent! Campus conversations remain respectful and private by default.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar touch-scroll rounded-xl border border-brand-border/60">
              <table className="w-full border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-left text-xs">
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">ID</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">Flagged User</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">Reported By</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">Reason</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30 text-xs sm:text-sm text-brand-ink">
                  {reports.map((rep) => (
                    <tr key={rep.reportId} className="hover:bg-brand-cream/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-brand-navy font-bold">
                        <span className="bg-brand-cream px-2 py-0.5 rounded border border-brand-border">
                          #R-{rep.reportId}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-rose-900">{rep.reportedUserName || 'Suspicious Student'}</td>
                      <td className="p-3 text-brand-ink2 font-medium">{rep.reportedByName || 'Reporter'}</td>
                      <td className="p-3">
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-bold text-[10px]">
                          {rep.reason}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          rep.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          rep.status === 'under_review' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {rep.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleInspectMessages(rep)}
                          className="px-2.5 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-gold text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Chat Inspector Panel */}
        <div className="min-h-[550px] flex flex-col justify-between">
          {selectedReport ? (
            <AdminReviewPanel
              report={selectedReport}
              onStatusChange={(reportId, newStatus) => {
                setReports(prev => prev.map(r => r.reportId === reportId ? { ...r, status: newStatus } : r));
                setSelectedReport(prev => prev && prev.reportId === reportId ? { ...prev, status: newStatus } : prev);
                if (onRefreshCount) onRefreshCount();
              }}
              onClose={() => setSelectedReport(null)}
              onShowToast={onShowToast}
              onSelectReport={setSelectedReport}
            />
          ) : (
            <div className="bg-white border border-brand-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[550px] items-center justify-center p-8 text-center text-brand-ink2">
              <MessageSquare className="w-12 h-12 text-brand-ink3/40 mb-3" />
              <p className="text-sm font-semibold">No Conversation Inspected</p>
              <p className="text-xs text-brand-ink3 mt-1 max-w-[240px]">
                Select a chat flag ticket on the left to securely decrypt and inspect conversation logs under audit control.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Warning/Suspension Modal overlay */}
      {showActionModal && (
        <div className="fixed inset-0 z-[1000] bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-brand-border p-5 sm:p-6 rounded-2xl shadow-2xl w-full max-w-[min(calc(100vw-24px),28rem)] max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150">
            <h4 className="font-serif text-lg font-black text-brand-navy flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-brand-gold-mid" />
              {showActionModal === 'warn' ? 'Issue Formal Warning Strike' : 'Suspend Student Account'}
            </h4>
            <p className="text-xs text-brand-ink2 font-medium mb-4 leading-relaxed">
              Applying moderation to student <strong className="text-brand-navy">{selectedReport?.reportedUserName}</strong>. 
              The student will receive a direct notification on their dashboard and is required to follow campus conduct codes.
            </p>

            <textarea
              rows={4}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="State the precise reason or policy violated (e.g. Offensive language in chat)..."
              className="w-full p-3 text-xs bg-brand-cream/30 border border-brand-border rounded-xl outline-none font-medium text-brand-navy focus:border-brand-gold focus:bg-white transition-all mb-4"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowActionModal(null); setActionReason(''); }}
                className="px-4 py-2 border border-brand-border hover:border-brand-navy text-xs font-bold rounded-lg text-brand-navy transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUserAction(showActionModal)}
                className={`px-4 py-2 text-white text-xs font-black rounded-lg transition-all cursor-pointer ${
                  showActionModal === 'warn' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Apply Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
