'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Award, Users, Search, Bot, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminPointsDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth').then(r=>r.json()).then(d=>{
      if(!d.authenticated) router.push('/admin/login');
      else if(d.user.role !== 'admin') router.push('/');
      else { setUser(d.user); setLoading(false); }
    });
  }, [router]);

  if(loading) return <div style={{textAlign:'center', marginTop:'100px'}}>Loading Points Dashboard...</div>;

  return (
    <AppLayout user={user}>
      <PointsDashboard />
    </AppLayout>
  );
}

function PointsDashboard() {
  const [pointsData, setPointsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fetchPoints = () => {
    fetch('/api/points')
      .then(r => r.json())
      .then(d => { if(d.points) setPointsData(d.points); });
  };

  useEffect(() => { fetchPoints(); }, []);

  const runAiSync = async () => {
    setAiRunning(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer openclaw_secret_123'
        },
        body: JSON.stringify({ trigger: 'auto' })
      });
      const data = await res.json();
      setAiResult(data);
      // Refresh points after sync
      fetchPoints();
    } catch(e) {
      setAiResult({ error: e.message });
    }
    setAiRunning(false);
  };

  const filtered = pointsData.filter(p => p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-slide-up" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
            <Award size={24} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '0.72em', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI Evaluation Console
            </span>
            <h1 style={{ margin: '4px 0 0 0', fontSize: '1.9em', fontWeight: 800, color: '#10b981' }}>
              AI Performance & Points
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>Automated worker evaluation based on task completion time.</p>
          </div>
        </div>

        {/* AI Sync Button */}
        <button
          onClick={runAiSync}
          disabled={aiRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 22px', borderRadius: '14px', border: 'none', cursor: aiRunning ? 'not-allowed' : 'pointer',
            background: aiRunning ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: '0.95em',
            boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
            transition: 'all 0.2s', opacity: aiRunning ? 0.7 : 1
          }}
        >
          {aiRunning
            ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> AI Assigning Tasks...</>
            : <><Bot size={18} /> Run AI Task Assignment</>
          }
        </button>
      </div>

      {/* AI Result Banner */}
      {aiResult && (
        <div style={{
          marginBottom: '20px', padding: '15px 20px', borderRadius: '14px',
          background: aiResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${aiResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: '12px', color: aiResult.error ? '#f87171' : '#34d399'
        }}>
          {aiResult.error
            ? <><AlertCircle size={20} /> Error: {aiResult.error}</>
            : aiResult.skipped
              ? <><AlertCircle size={20} /> {aiResult.reason}</>
              : <><CheckCircle size={20} /> ✅ AI successfully assigned {aiResult.assigned} task(s) to {aiResult.workers} workers! Workers have been notified.</>
          }
        </div>
      )}

      {/* Leaderboard */}
      <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Monthly Points Leaderboard
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search worker..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>
            <button onClick={fetchPoints} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              <th style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>#</th>
              <th style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>Worker</th>
              <th style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>Role</th>
              <th style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>Month</th>
              <th style={{ padding: '12px 15px', color: 'var(--text-muted)', textAlign: 'right' }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No points data yet. Workers earn points when they submit tasks for approval.
              </td></tr>
            ) : filtered.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--panel-border)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                <td style={{ padding: '15px', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#475569', fontWeight: 700, fontSize: '1.1em' }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </td>
                <td style={{ padding: '15px', color: 'var(--text-main)', fontWeight: 700 }}>{row.name}</td>
                <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{row.position}</td>
                <td style={{ padding: '15px', color: '#2563eb', fontWeight: 600 }}>{row.month || '—'}</td>
                <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: '1.2em' }}>
                  {row.total_points ? Number(row.total_points).toFixed(1) : '0.0'} <span style={{ fontSize: '0.6em', color: '#64748b' }}>PTS</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
