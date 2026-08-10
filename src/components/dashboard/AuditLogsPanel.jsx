import React, { useState, useMemo } from 'react';
import { FileText, Download, ChevronDown, ChevronUp, Filter, AlertOctagon, Trash2, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { SeverityBadge } from '../ui/SeverityBadge';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';

const AuditLogsPanel = ({ user, logs: propLogs }) => {
  const userId = user?.uid;
  const { logs: hookLogs, loading, hasMore, loadMore } = useAuditLogs(propLogs ? null : userId);
  // Prefer logs passed from parent (already fetched) over duplicating a hook subscription
  const logs = propLogs ?? hookLogs;
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSeverity = severityFilter === 'All' || log.severity === severityFilter;
      const matchStatus = statusFilter === 'All' || log.status === statusFilter;
      return matchSeverity && matchStatus;
    });
  }, [logs, severityFilter, statusFilter]);

  const toggleRow = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FALSE_ALARM': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'ALERT_DISPATCHED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'PENDING': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'QUEUED_OFFLINE': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const handleDeleteLog = async (logId, e) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'crash_logs', logId));
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  };

  const handleMarkFalseAlarm = async (logId, e) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId, 'crash_logs', logId), {
        status: 'FALSE_ALARM'
      });
    } catch (err) {
      console.error('Error marking false alarm:', err);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text('Crash Guard by RedHack - Audit Logs', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    let y = 40;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    filteredLogs.forEach((log, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const time = new Date(log.timestamp).toLocaleString();
      const txt = `${index + 1}. [${time}] | Status: ${log.status} | Severity: ${log.severity} | Force: ${log.peakForce} m/s² | Vel: ${log.velocity} km/h`;
      doc.text(txt, 14, y);
      y += 8;
    });
    
    doc.save('crash-guard-audit-logs.pdf');
  };

  const exportCSV = () => {
    const csvData = filteredLogs.map(log => ({
      Timestamp: new Date(log.timestamp).toISOString(),
      Severity: log.severity,
      PeakForce_ms2: log.peakForce,
      Velocity_kmh: log.velocity,
      Latitude: log.gps?.lat || '',
      Longitude: log.gps?.lon || '',
      Status: log.status,
      RawPacketData: JSON.stringify(log.rawPacket || {})
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'crash-guard-audit-logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-red-500" />
            Audit Logs
          </h2>
          <p className="text-gray-400 text-sm mt-1">Review historical crash data and sensor triggers.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
            <Filter className="w-4 h-4 text-gray-400 ml-1" />
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-sm text-gray-200 border-none outline-none pr-4"
            >
              <option value="All">All Severities</option>
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-gray-200 border-none outline-none pr-4"
            >
              <option value="All">All Statuses</option>
              <option value="FALSE_ALARM">False Alarm</option>
              <option value="ALERT_DISPATCHED">Dispatched</option>
              <option value="PENDING">Pending</option>
              <option value="QUEUED_OFFLINE">Offline Queue</option>
            </select>
          </div>

          <GlowButton variant="secondary" onClick={exportCSV} className="!py-1.5 !px-3 text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> CSV
          </GlowButton>
          <GlowButton variant="secondary" onClick={exportPDF} className="!py-1.5 !px-3 text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> PDF
          </GlowButton>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-slate-900/80 text-gray-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Metrics</th>
                <th className="px-4 py-3 font-medium">GPS Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && logs.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-slate-800/20">
                    <td className="px-4 py-4"><div className="h-4 bg-slate-700/50 rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-slate-700/50 rounded-full w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-700/50 rounded w-32"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-700/50 rounded w-28"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-slate-700/50 rounded-full w-24"></div></td>
                    <td className="px-4 py-4"></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <AlertOctagon className="w-12 h-12 mb-3 text-slate-700" />
                      <p className="text-lg">No crash incidents recorded</p>
                      <p className="text-sm mt-1">You're driving safely. Keep it up!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${expandedRowId === log.id ? 'bg-slate-800/40' : ''}`}
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge level={log.severity} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-red-400 font-medium">{log.peakForce} m/s²</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span>{log.velocity} km/h</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {log.gps && log.gps.lat != null && log.gps.lon != null
                          ? `${Number(log.gps.lat).toFixed(4)}, ${Number(log.gps.lon).toFixed(4)}`
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(log.status)}`}>
                          {(log.status || 'PENDING').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {expandedRowId === log.id ? (
                          <ChevronUp className="w-5 h-5 inline-block text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 inline-block text-gray-400" />
                        )}
                      </td>
                    </tr>
                    {expandedRowId === log.id && (
                      <tr>
                        <td colSpan="6" className="px-0 py-0 border-b-0">
                          <div className="bg-black/60 p-4 border-t border-slate-800/80">
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Raw BLE Packet Data</p>
                              <div className="flex gap-2">
                                {log.status !== 'FALSE_ALARM' && (
                                  <button onClick={(e) => handleMarkFalseAlarm(log.id, e)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-green-400 rounded-md text-xs font-semibold transition-colors border border-slate-700">
                                    <CheckCircle className="w-3.5 h-3.5" /> False Alarm
                                  </button>
                                )}
                                <button onClick={(e) => handleDeleteLog(log.id, e)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-md text-xs font-semibold transition-colors border border-slate-700 hover:border-red-500/30">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </div>
                            <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-words bg-[#0d1117] p-4 rounded-lg border border-slate-700/50">
                              {JSON.stringify(log.rawPacket, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
      
      {hasMore && (
        <div className="flex justify-center mt-6">
          <GlowButton variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More Logs'}
          </GlowButton>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPanel;
