import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import AuditLogsPanel from '../components/dashboard/AuditLogsPanel';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { GlassCard } from '../components/ui/GlassCard';
import { GlowButton } from '../components/ui/GlowButton';
import Footer from '../components/layout/Footer';
import { useNavigate } from 'react-router-dom';

export default function AuditLogsPage({ user }) {
  const { logs, loading } = useAuditLogs(user?.uid);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      <header className="p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center gap-4 z-10 sticky top-0">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Law Enforcement Audit Log
            <span className="bg-blue-900/50 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-blue-500/30">
              <ShieldCheck size={12} />
              Immutable Record
            </span>
          </h1>
          <p className="text-sm text-gray-400 hidden md:block">
            Tamper-proof, append-only crash incident records for official inquiries
          </p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <AuditLogsPanel user={user} logs={logs} />
        )}
      </main>

      <Footer />
    </div>
  );
}
