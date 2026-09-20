import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { ClipboardList, Search, FileText, ShieldAlert, CheckCircle2, User, HelpCircle, Activity, Trash2 } from 'lucide-react';
import { AdminActivityLog } from '../types';

interface ActivityLogsPanelProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ActivityLogsPanel({ onShowToast }: ActivityLogsPanelProps) {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [clearing, setClearing] = useState<boolean>(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = `/admin/activity-logs?action=${actionFilter}&q=${encodeURIComponent(search)}`;
      const res = await apiFetch(url);
      if (res && res.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.warn('API fetch failed.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all previous admin activity audit logs? This action cannot be undone.')) {
      return;
    }
    setClearing(true);
    try {
      const res = await apiFetch('/admin/activity-logs', {
        method: 'DELETE'
      });
      if (res && res.success) {
        onShowToast('All admin activity logs have been cleared successfully!', 'success');
        setLogs([]);
      } else {
        onShowToast(res?.error || 'Failed to clear activity logs.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error clearing activity logs.', 'error');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case 'user_warned': 
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold text-[10px] uppercase">User Warned</span>;
      case 'user_suspended': 
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px] uppercase">Suspended</span>;
      case 'user_activated': 
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px] uppercase">Reactivated</span>;
      case 'item_approved': 
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px] uppercase">Approved</span>;
      case 'item_rejected': 
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px] uppercase">Rejected</span>;
      case 'report_resolved': 
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold text-[10px] uppercase">Dispute Closed</span>;
      default: 
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-bold text-[10px] uppercase">System Configuration</span>;
    }
  };

  return (
    <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-gold" />
            Admin Activity Logs &amp; Audit Trail
          </h3>
          <p className="text-xs text-brand-ink2 font-light mt-0.5">Strict, read-only audit log tracing all administrator actions for campus transparency</p>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button 
              onClick={handleClearLogs}
              disabled={clearing}
              className="px-3.5 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              {clearing ? 'Clearing...' : 'Clear All Logs'}
            </button>
          )}
          <button 
            onClick={fetchLogs}
            className="px-3.5 py-1.5 border border-brand-border hover:bg-brand-cream/50 text-brand-navy font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-brand-gold-mid animate-pulse" />
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Quick-Select Row */}
      <div className="flex flex-wrap gap-1.5 border-b border-brand-border/40 pb-4 mb-6">
        {[
          { key: 'All', label: 'All Actions' },
          { key: 'user_warned', label: 'User Warnings' },
          { key: 'user_suspended', label: 'Suspensions' },
          { key: 'item_approved', label: 'Approvals' },
          { key: 'item_rejected', label: 'Rejections' },
          { key: 'report_resolved', label: 'Resolved Disputes' }
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setActionFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              actionFilter === opt.key 
                ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30' 
                : 'text-brand-ink2 hover:bg-brand-cream/60 hover:text-brand-navy border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search Input Filter */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-brand-ink3 absolute left-3 pointer-events-none" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by description or administrator name..."
            className="w-full pl-10 pr-4 p-2.5 text-xs bg-brand-cream/40 border border-brand-border rounded-xl outline-none font-medium text-brand-navy focus:border-brand-gold focus:bg-white transition-all"
          />
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-gold border border-brand-gold/30 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          Search Logs
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brand-ink2 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin"></div>
          <span className="text-xs">Fetching audit trails...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-brand-ink2">
          <ClipboardList className="w-10 h-10 text-brand-ink3/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-brand-navy">No activity logs found</p>
          <p className="text-xs text-brand-ink3 mt-1">Audit trail is currently clear or no search matches found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar touch-scroll rounded-xl border border-brand-border/60">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-xs text-left">
                <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Log ID</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Administrator</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Action Type</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Details &amp; Audit Log Description</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-xs sm:text-sm text-brand-ink">
              {logs.map((log, idx) => {
                const uniqueKey = log.id || log.logId || `log-${idx}`;
                const displayId = log.logId || (log.id ? String(log.id).replace('aal-', '') : `idx-${idx}`);
                return (
                  <tr key={uniqueKey} className="hover:bg-brand-cream/30 transition-colors">
                    <td className="p-3.5 font-mono text-xs text-brand-navy font-bold">
                      <span className="bg-brand-cream px-2 py-0.5 rounded border border-brand-border">
                        #LOG-{displayId}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold font-bold flex items-center justify-center text-[10px] shadow-2xs">
                          {(log.adminName || 'Admin').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-brand-navy">{log.adminName || 'Admin'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-3.5 text-brand-ink font-medium leading-relaxed max-w-sm">
                      {log.description}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500 font-mono">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
