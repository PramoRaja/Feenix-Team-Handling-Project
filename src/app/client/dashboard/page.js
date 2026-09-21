'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon, Plus, FileText, Send, X, Paperclip, Clock, CheckCircle2, AlertCircle, Calendar, CheckSquare, FolderGit2, BarChart2, Receipt, Download, ExternalLink, MessageSquare, Share2, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Portal Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Revision Modal State
  const [revModal, setRevModal] = useState({ open: false, requestId: null, title: '' });
  const [feedbackText, setFeedbackText] = useState('');

  // Client Asset Upload State
  const [showClientAssetModal, setShowClientAssetModal] = useState(false);
  const [clientAssetForm, setClientAssetForm] = useState({ title: '', category: 'Logo' });
  const [clientAssetUploading, setClientAssetUploading] = useState(false);

  const handleClientAssetSubmit = async (e) => {
    e.preventDefault();
    if (!clientAssetForm.title.trim()) { alert('Please enter asset title'); return; }
    setClientAssetUploading(true);
    try {
      let fileUrl = '';
      const fileInput = document.getElementById('clientAssetFileInput')?.files[0];
      if (fileInput) {
        const fd = new FormData();
        fd.append('file', fileInput);
        const up = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
        if (up.url) fileUrl = up.url;
      }

      if (!fileUrl) {
        alert('Please select a file to upload');
        setClientAssetUploading(false);
        return;
      }

      const res = await fetch('/api/client-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadBrandAsset',
          title: clientAssetForm.title,
          category: clientAssetForm.category,
          url: fileUrl
        })
      }).then(r => r.json());

      if (res.success) {
        alert('✅ Brand Asset uploaded successfully to your Vault!');
        setShowClientAssetModal(false);
        setClientAssetForm({ title: '', category: 'Logo' });
        if (document.getElementById('clientAssetFileInput')) document.getElementById('clientAssetFileInput').value = '';
        refreshDashboard();
      } else {
        alert(res.error || 'Failed to upload asset');
      }
    } catch (err) {
      alert('Error uploading brand asset');
    } finally {
      setClientAssetUploading(false);
    }
  };

  // Work Request State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    job_title: '',
    job_type: 'Post',
    delivery_date: '',
    notes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMsg, setRequestMsg] = useState({ text: '', type: '' });

  const refreshDashboard = async () => {
    try {
      const res = await fetch('/api/client-dashboard');
      const result = await res.json();
      if (res.ok) setData(result.dashboardData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/client-dashboard');
        const result = await res.json();
        
        if (!res.ok) {
          setError(result.error || 'Failed to load dashboard');
          if (res.status === 401 || res.status === 403) {
             router.push('/client/login');
          }
        } else {
          setData(result.dashboardData);
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    router.push('/client/login');
  };

  const handleWorkRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestMsg({ text: '', type: '' });
    setSubmittingRequest(true);

    try {
      let attachment = '';
      const fileInput = document.getElementById('clientRequestFile')?.files[0];
      if (fileInput) {
        const fd = new FormData();
        fd.append('file', fileInput);
        const up = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
        if (up.url) attachment = up.url;
      }

      const res = await fetch('/api/client-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'requestWork',
          job_title: requestForm.job_title,
          job_type: requestForm.job_type,
          delivery_date: requestForm.delivery_date,
          notes: requestForm.notes,
          attachment
        })
      }).then(r => r.json());

      if (res.success) {
        setRequestMsg({ text: '✅ Work request submitted successfully! Our team will review and schedule it.', type: 'success' });
        setRequestForm({ job_title: '', job_type: 'Post', delivery_date: '', notes: '' });
        if (document.getElementById('clientRequestFile')) document.getElementById('clientRequestFile').value = '';
        refreshDashboard();
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestMsg({ text: '', type: '' });
        }, 1800);
      } else {
        setRequestMsg({ text: res.error || 'Failed to submit request', type: 'error' });
      }
    } catch (err) {
      setRequestMsg({ text: 'Network error submitting request', type: 'error' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!confirm('Are you sure you want to approve this deliverable?')) return;
    try {
      const res = await fetch('/api/client-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveWork', requestId })
      }).then(r => r.json());
      if (res.success) {
        alert('✅ Work approved successfully!');
        refreshDashboard();
      } else {
        alert(res.error || 'Failed to approve');
      }
    } catch (e) {
      alert('Error approving work');
    }
  };

  const handleSendRevision = async () => {
    if (!feedbackText.trim()) { alert('Please enter revision feedback comments'); return; }
    try {
      const res = await fetch('/api/client-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'requestRevision', requestId: revModal.requestId, feedback: feedbackText })
      }).then(r => r.json());
      if (res.success) {
        alert('✅ Revision request sent to team!');
        setRevModal({ open: false, requestId: null, title: '' });
        setFeedbackText('');
        refreshDashboard();
      } else {
        alert(res.error || 'Failed to submit revision');
      }
    } catch (e) {
      alert('Error submitting revision');
    }
  };

  const getWhatsAppLink = (title, status) => {
    const msg = `Hello Feenix Team! 👋 Regarding project work "${title}", the status is currently "${status}". Please check the client portal.`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: 'var(--text-muted, #94a3b8)' }}>Loading Dashboard...</div>;
  if (error) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: '#ef4444' }}>{error}</div>;
  if (!data) return null;

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good Morning';
      if (hour >= 12 && hour < 17) return 'Good Afternoon';
      if (hour >= 17 && hour < 21) return 'Good Evening';
      return 'Good Night';
  };

  const clientQuotes = [
      "Your vision, engineered to perfection. 🚀",
      "Building the future of your project together. 🤝",
      "Quality is not an act, it is a habit. ✨",
      "Making progress visible, step by step. 📈",
      "Your success is our ultimate milestone. 🏆",
      "Co-creating excellence, day by day. 💡"
  ];
  const todayQuote = clientQuotes[new Date().getDate() % clientQuotes.length];

  const weeks = [1, 2, 3, 4];
  let totalPlan = 0;
  let totalAchieved = 0;
  weeks.forEach(wNum => {
      const wd = data.weekly_data[`week${wNum}`] || {};
      totalPlan += (wd.design_plan || 0) + (wd.video_plan || 0);
      totalAchieved += (wd.achieved_graphic || 0) + (wd.achieved_video || 0);
  });
  const overallProgress = totalPlan > 0 ? Math.min(100, Math.round((totalAchieved / totalPlan) * 100)) : 0;

  const totalDeliverables = (data.volumes.design || 0) + (data.volumes.video || 0) + (data.volumes.ads || 0);
  const activeOps = data.activeTasks?.length || 0;
  const completedOps = data.completedTasks?.length || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: 'var(--text-main, #e2e8f0)', padding: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', background: 'var(--panel-bg, rgba(30,41,59,0.5))', padding: '20px 30px', borderRadius: '20px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))', backdropFilter: 'blur(10px)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <img src="/feenix-logo.png" alt="FEENIX" style={{ height: '18px', width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontSize: '0.72em', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Client Portal</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2.2em', color: 'var(--text-main, #f8fafc)', fontWeight: 800 }}>
              {data.name}
            </h1>
            <p style={{ margin: '5px 0 0 0', color: '#94a3b8' }}>Monthly Operations Progress</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowRequestModal(true)} 
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.95em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(37,99,235,0.35)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37,99,235,0.35)'; }}
            >
              <Plus size={18} /> + Request Work
            </button>

            <button onClick={toggleTheme} style={{
                background: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.2)',
                padding: '10px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
            }} title="Toggle Theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => {e.target.style.background = '#ef4444'; e.target.style.color = '#fff';}} onMouseLeave={e => {e.target.style.background = 'rgba(239,68,68,0.1)'; e.target.style.color = '#ef4444';}}>
              Log Out
            </button>
          </div>
        </div>

        {/* Premium Portal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '30px',
          padding: '6px',
          borderRadius: '16px',
          background: 'var(--panel-bg, rgba(30,41,59,0.5))',
          border: '1px solid var(--panel-border, rgba(255,255,255,0.05))',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          {[
            { id: 'overview', label: '📊 Overview & Requests' },
            { id: 'calendar', label: '📅 Content Calendar' },
            { id: 'approvals', label: '⚡ Approval Hub', badge: data.requestedWorks?.filter(r => r.work_status === 'Sent to approval' || r.work_status === 'Pending').length },
            { id: 'vault', label: '📂 Brand Vault' },
            { id: 'analytics', label: '📈 Performance & Reports' },
            { id: 'billing', label: '💳 Billing & Invoices' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.88em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
                }}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{
                    fontSize: '0.72em',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? '#ffffff' : '#ef4444',
                    color: isActive ? '#1d4ed8' : '#ffffff',
                    fontWeight: 800
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & REQUESTS */}
        {activeTab === 'overview' && (
          <div>
            {/* Greeting + Progress Banner (merged) */}
            <div style={{
            padding: '30px 35px',
            marginBottom: '40px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.05) 100%)',
            border: '1px solid var(--panel-border, rgba(255,255,255,0.05))',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
        }}>
            <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(139,92,246,0.07)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:'-20px', left:'40%', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(59,130,246,0.06)', pointerEvents:'none' }} />
            
            {/* Left: Greeting */}
            <div style={{ position:'relative', zIndex:1 }}>
                <p style={{ margin:'0 0 4px 0', fontSize:'0.85em', color:'#7c3aed', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600 }}>
                    {new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' })}
                </p>
                <h1 style={{ margin:'0 0 8px 0', fontSize:'2.2em', fontWeight:800, color: 'var(--text-main, #e2e8f0)', lineHeight:1.2 }}>
                    {getGreeting()}, <span style={{ color: '#3b82f6', fontWeight: 800 }}>Client Partner!</span> 👋
                </h1>
                <p style={{ margin:0, fontSize:'1.05em', color: 'var(--text-muted, #94a3b8)', fontStyle:'italic', fontWeight:400 }}>
                    {todayQuote}
                </p>
            </div>

            {/* Right: Stats & Progress */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
                {/* Total Deliverables */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(59,130,246,0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1em',
                        marginBottom: '4px',
                        border: '1px solid rgba(59,130,246,0.15)'
                    }}>
                        📦
                    </div>
                    <div style={{ fontSize: '1.15em', fontWeight: 800, color: 'var(--text-main, #e2e8f0)', lineHeight: 1.1 }}>{totalDeliverables}</div>
                    <div style={{ fontSize: '0.68em', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Total Volume</div>
                </div>

                {/* Active Operations */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(139,92,246,0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1em',
                        marginBottom: '4px',
                        border: '1px solid rgba(139,92,246,0.15)'
                    }}>
                        ⚙️
                    </div>
                    <div style={{ fontSize: '1.15em', fontWeight: 800, color: 'var(--text-main, #e2e8f0)', lineHeight: 1.1 }}>{activeOps}</div>
                    <div style={{ fontSize: '0.68em', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Active Ops</div>
                </div>

                {/* Requested Works Stat */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(245,158,11,0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1em',
                        marginBottom: '4px',
                        border: '1px solid rgba(245,158,11,0.15)'
                    }}>
                        📋
                    </div>
                    <div style={{ fontSize: '1.15em', fontWeight: 800, color: 'var(--text-main, #e2e8f0)', lineHeight: 1.1 }}>{data.requestedWorks?.length || 0}</div>
                    <div style={{ fontSize: '0.68em', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Requests</div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: '1px', height: '42px', background: 'var(--panel-border, rgba(255,255,255,0.05))', margin: '0 10px' }} />

                {/* Progress block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16,185,129,0.05)', borderRadius: '12px', padding: '10px 16px', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg, #10b981, #3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1em' }}>🎯</div>
                    <div>
                        <p style={{ margin:0, fontSize:'0.65em', color:'#10b981', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700 }}>Project Progress</p>
                        <h2 style={{ margin:'2px 0 0 0', fontSize:'1.4em', color: '#10b981', fontWeight:800, lineHeight:1 }}>
                            {overallProgress}%
                            <span style={{ fontSize:'0.45em', color:'#6ee7b7', marginLeft:'4px', fontWeight:500 }}>DONE</span>
                        </h2>
                    </div>
                </div>
            </div>
        </div>

        {/* Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'var(--card-grad-design, linear-gradient(135deg, rgba(59,130,246,0.1), rgba(30,41,59,0.6)))', padding: '25px', borderRadius: '20px', border: '1px solid var(--card-inner-border, rgba(59,130,246,0.2))' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#60a5fa', fontSize: '1.1em' }}>Total Design Volume</h3>
            <div style={{ fontSize: '3em', fontWeight: 'bold' }}>{data.volumes.design}</div>
          </div>
          <div style={{ background: 'var(--card-grad-video, linear-gradient(135deg, rgba(168,85,247,0.1), rgba(30,41,59,0.6)))', padding: '25px', borderRadius: '20px', border: '1px solid var(--card-inner-border, rgba(168,85,247,0.2))' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#a855f7', fontSize: '1.1em' }}>Total Video Volume</h3>
            <div style={{ fontSize: '3em', fontWeight: 'bold' }}>{data.volumes.video}</div>
          </div>
          <div style={{ background: 'var(--card-grad-ads, linear-gradient(135deg, rgba(245,158,11,0.1), rgba(30,41,59,0.6)))', padding: '25px', borderRadius: '20px', border: '1px solid var(--card-inner-border, rgba(245,158,11,0.2))' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.1em' }}>Total Ads Volume</h3>
            <div style={{ fontSize: '3em', fontWeight: 'bold' }}>{data.volumes.ads}</div>
          </div>
        </div>

        {/* Weekly Progress */}
        <h2 style={{ fontSize: '1.5em', marginBottom: '20px' }}>Weekly Progress</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[1, 2, 3, 4].map(week => {
            const wd = data.weekly_data[`week${week}`] || { design_plan:0, video_plan:0, achieved_graphic:0, achieved_video:0, status:'' };
            return (
              <div key={week} style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', padding: '20px', borderRadius: '16px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main, #e2e8f0)' }}>Week 0{week}</h3>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.85em', fontWeight: 'bold',
                    background: wd.status === 'Completed' ? 'rgba(16,185,129,0.1)' : wd.status === 'Working' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                    color: wd.status === 'Completed' ? '#10b981' : wd.status === 'Working' ? '#3b82f6' : 'var(--text-muted, #64748b)',
                    border: `1px solid ${wd.status === 'Completed' ? 'rgba(16,185,129,0.2)' : wd.status === 'Working' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)'}`
                  }}>
                    {wd.status || 'Pending'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted, #cbd5e1)' }}>
                      <span>Graphic Design</span>
                      <span>{wd.achieved_graphic} / {wd.design_plan} Achieved</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--table-border, rgba(0,0,0,0.3))', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (wd.achieved_graphic / (wd.design_plan || 1)) * 100)}%`, background: '#3b82f6', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted, #cbd5e1)' }}>
                      <span>Video Production</span>
                      <span>{wd.achieved_video} / {wd.video_plan} Achieved</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--table-border, rgba(0,0,0,0.3))', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (wd.achieved_video / (wd.video_plan || 1)) * 100)}%`, background: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* My Requested Works Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📋 My Requested Works
            <span style={{ fontSize: '0.65em', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>
              {data.requestedWorks?.length || 0} ITEMS
            </span>
          </h2>
          <button 
            onClick={() => setShowRequestModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.1)',
              color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.3)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> New Work Request
          </button>
        </div>

        {(!data.requestedWorks || data.requestedWorks.length === 0) ? (
          <div style={{
            background: 'var(--panel-bg, rgba(30,41,59,0.5))',
            border: '1px dashed var(--panel-border, rgba(255,255,255,0.1))',
            borderRadius: '20px',
            padding: '50px 20px',
            textAlign: 'center',
            color: 'var(--text-muted, #94a3b8)',
            marginBottom: '40px'
          }}>
            <FileText size={40} color="#64748b" style={{ marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main, #e2e8f0)', fontSize: '1.2em' }}>No Work Requests Submitted Yet</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.95em' }}>Need new graphic designs, video edits, or content posts? Submit a work request directly to our team.</p>
            <button 
              onClick={() => setShowRequestModal(true)}
              style={{
                padding: '12px 26px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95em',
                boxShadow: '0 4px 15px rgba(37,99,235,0.35)'
              }}
            >
              + Create First Work Request
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {data.requestedWorks.map(req => {
              const jobStatus = req.job_status || 'Client Requested';
              const workStatus = req.work_status || 'Pending';
              const workerName = req.worker_name;

              // Job Schedule Status Pill
              let jobBadge = { label: '📋 Client Requested', bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
              if (jobStatus === 'Scheduled') {
                jobBadge = { label: '📅 Scheduled', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
              } else if (jobStatus === 'No Schedule') {
                jobBadge = { label: '📌 Unscheduled', bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.2)' };
              }

              // Work Execution Status Pill
              let workBadge = { label: '⏳ Pending', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
              if (workStatus === 'In Progress' || workStatus === 'Working') {
                workBadge = { label: '⚡ In Progress', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
              } else if (workStatus === 'Sent to approval') {
                workBadge = { label: '🔍 Sent for Approval', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
              } else if (workStatus === 'Done' || workStatus === 'Completed') {
                workBadge = { label: '✅ Done', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
              } else if (workStatus === 'Hold') {
                workBadge = { label: '⏸️ On Hold', bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' };
              }

              return (
                <div key={req.id} style={{
                  background: 'var(--panel-bg, rgba(30,41,59,0.5))',
                  borderRadius: '20px',
                  border: '1px solid var(--panel-border, rgba(255,255,255,0.05))',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  <div>
                    {/* Top Row: Type & Status Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '3px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted, #94a3b8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {req.job_type || 'Post'}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Job Schedule Status */}
                        <span style={{ fontSize: '0.75em', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: jobBadge.bg, color: jobBadge.color, border: jobBadge.border }}>
                          {jobBadge.label}
                        </span>
                        {/* Work Status */}
                        <span style={{ fontSize: '0.75em', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: workBadge.bg, color: workBadge.color, border: workBadge.border }}>
                          {workBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em', fontWeight: 800, color: 'var(--text-main, #e2e8f0)', lineHeight: 1.3 }}>
                      {req.job_title}
                    </h3>

                    {/* Brief / Notes */}
                    {req.notes && (
                      <p style={{ margin: '0 0 16px 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        {req.notes}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Assigned Worker Info (if present) */}
                    {workerName && (
                      <div style={{ marginBottom: '12px', fontSize: '0.82em', color: '#60a5fa', background: 'rgba(59,130,246,0.08)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>👤 Assigned Specialist:</span>
                        <strong style={{ color: '#ffffff' }}>{workerName}</strong>
                      </div>
                    )}

                    {/* Bottom Metadata */}
                    <div style={{ borderTop: '1px solid var(--panel-border, rgba(255,255,255,0.05))', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82em', color: 'var(--text-muted, #94a3b8)' }}>
                      <div>
                        <span>Target Date: </span>
                        <strong style={{ color: req.delivery_date ? '#60a5fa' : '#94a3b8' }}>
                          {req.delivery_date ? new Date(req.delivery_date).toLocaleDateString() : 'Asap'}
                        </strong>
                      </div>

                      {req.attachment && (
                        <a href={req.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>
                          <Paperclip size={14} /> Brief
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

        {/* TAB 2: CONTENT CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.5em', margin: 0 }}>📅 Social Media & Content Calendar</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)' }}>
                  View scheduled dates for your posts, reels, and video releases.
                </p>
              </div>
            </div>

            {(!data.postSchedules || data.postSchedules.length === 0) ? (
              <div style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '20px', border: '1px dashed var(--panel-border, rgba(255,255,255,0.1))', padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Calendar size={40} color="#64748b" style={{ marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 6px 0', color: '#e2e8f0' }}>No Posts Scheduled This Month</h3>
                <p style={{ margin: 0, fontSize: '0.9em' }}>Our creative team schedules posts as soon as briefs are finalized.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {data.postSchedules.map(post => (
                  <div key={post.id} style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '16px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.75em', fontWeight: 800, padding: '3px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                        {post.channel || 'Meta'}
                      </span>
                      <span style={{ fontSize: '0.8em', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                        📅 {new Date(post.schedule_date).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1em', fontWeight: 700, color: '#e2e8f0' }}>
                      {post.post_title || 'Scheduled Post'}
                    </h4>

                    {post.notes && (
                      <p style={{ fontSize: '0.85em', color: '#94a3b8', margin: '0 0 14px 0', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                        {post.notes}
                      </p>
                    )}

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8em', color: '#94a3b8' }}>
                      <span>Channel: <strong>{post.channel || 'Meta'}</strong></span>
                      <span style={{ color: post.status === 'Published' || post.status === 'Done' ? '#34d399' : '#f59e0b', fontWeight: 700 }}>
                        {post.status || 'Scheduled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPROVAL HUB */}
        {activeTab === 'approvals' && (
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.5em', margin: 0 }}>⚡ Client Approval & Proofing Hub</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)' }}>
                  Review drafts, approve deliverables in 1-click, or send revision feedback to the Feenix team.
                </p>
              </div>
            </div>

            {(!data.requestedWorks || data.requestedWorks.filter(r => r.work_status === 'Sent to approval' || r.work_status === 'Pending' || r.work_status === 'Hold').length === 0) ? (
              <div style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '20px', border: '1px dashed var(--panel-border, rgba(255,255,255,0.1))', padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 6px 0', color: '#e2e8f0' }}>All Caught Up! No Pending Approvals</h3>
                <p style={{ margin: 0, fontSize: '0.9em' }}>When graphics or video edits are ready for review, they will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {data.requestedWorks.filter(r => r.work_status === 'Sent to approval' || r.work_status === 'Pending' || r.work_status === 'Hold').map(req => (
                  <div key={req.id} style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '20px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.75em', fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '8px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                        {req.job_type || 'Post'}
                      </span>
                      <span style={{ fontSize: '0.78em', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: req.work_status === 'Sent to approval' ? 'rgba(168,85,247,0.15)' : 'rgba(245,158,11,0.15)', color: req.work_status === 'Sent to approval' ? '#c084fc' : '#f59e0b' }}>
                        {req.work_status === 'Sent to approval' ? '🔍 Ready for Review' : `⏳ ${req.work_status}`}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em', fontWeight: 800, color: '#e2e8f0' }}>
                      {req.job_title}
                    </h3>

                    {req.notes && (
                      <p style={{ fontSize: '0.88em', color: '#94a3b8', margin: '0 0 16px 0', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                        {req.notes}
                      </p>
                    )}

                    {req.attachment && (
                      <div style={{ marginBottom: '16px' }}>
                        <a href={req.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none', fontWeight: 700, fontSize: '0.9em', background: 'rgba(59,130,246,0.1)', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                          <Paperclip size={16} /> View Deliverable Preview File
                        </a>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '14px' }}>
                      <button
                        onClick={() => handleApprove(req.id)}
                        style={{ padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.85em', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                      >
                        ✅ Approve Work
                      </button>
                      <button
                        onClick={() => setRevModal({ open: true, requestId: req.id, title: req.job_title })}
                        style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800, cursor: 'pointer', fontSize: '0.85em' }}
                      >
                        🔄 Request Revision
                      </button>
                    </div>

                    {/* Instant WhatsApp Alert Trigger */}
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <a
                        href={getWhatsAppLink(req.job_title, req.work_status)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '0.8em', textDecoration: 'none', fontWeight: 700 }}
                      >
                        📱 Notify Team on WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BRAND VAULT */}
        {activeTab === 'vault' && (
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.5em', margin: 0 }}>📂 Brand Kit & Cloud Asset Vault</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)' }}>
                  Access and upload your brand logos, guidelines, typography, and raw media files 24/7.
                </p>
              </div>
              <button
                onClick={() => setShowClientAssetModal(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(168,85,247,0.35)'
                }}
              >
                <Plus size={16} /> + Upload Brand Asset
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {(data.brandAssets || []).map(asset => (
                <div key={asset.id} style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '16px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72em', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                      {asset.category}
                    </span>
                    <h4 style={{ margin: '10px 0 6px 0', fontSize: '1.05em', color: '#e2e8f0' }}>{asset.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.78em', color: '#94a3b8' }}>Uploaded: {asset.date}</p>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <a href={asset.url} download style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', textDecoration: 'none', fontWeight: 700, fontSize: '0.85em' }}>
                      <Download size={14} /> Download Asset
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PERFORMANCE & REPORTS */}
        {activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.5em', margin: 0 }}>📈 Monthly Performance & ROI Analytics</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)' }}>
                  Monthly operations output summary and downloadable client reports.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                style={{ padding: '10px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} /> 📄 Download Monthly Report (PDF)
              </button>
            </div>

            {/* Performance Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(30,41,59,0.6))', padding: '24px', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85em', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Graphic Design Volume</p>
                <h2 style={{ margin: 0, fontSize: '2.5em', color: '#ffffff' }}>{data.volumes.design} Posts</h2>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#94a3b8' }}>Contracted retainer quota</p>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(30,41,59,0.6))', padding: '24px', borderRadius: '20px', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85em', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Video Production Output</p>
                <h2 style={{ margin: 0, fontSize: '2.5em', color: '#ffffff' }}>{data.volumes.video} Videos</h2>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#94a3b8' }}>Reels / TikTok edits</p>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(30,41,59,0.6))', padding: '24px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85em', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Completed Deliverables</p>
                <h2 style={{ margin: 0, fontSize: '2.5em', color: '#ffffff' }}>{completedOps} Tasks</h2>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#94a3b8' }}>Approved & delivered</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BILLING & INVOICES */}
        {activeTab === 'billing' && (
          <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5em', margin: 0 }}>💳 Retainer Billing & Invoices</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted, #94a3b8)' }}>
                Monthly package retainer payment history and downloadable receipts.
              </p>
            </div>

            <div style={{ background: 'var(--panel-bg, rgba(30,41,59,0.5))', borderRadius: '20px', border: '1px solid var(--panel-border, rgba(255,255,255,0.05))', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', textTransform: 'uppercase', fontSize: '0.78em', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>Invoice ID</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>Billing Month</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>Amount</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.invoices || []).map(inv => {
                    const isPaid = inv.status === 'Paid';
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#e2e8f0' }}>{inv.invoice_no || inv.id}</td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8' }}>
                          <div>{inv.month}</div>
                          <span style={{ fontSize: '0.78em', color: '#64748b' }}>Issued: {inv.date}</span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#60a5fa', fontSize: '1.05em' }}>
                          ${typeof inv.amount === 'number' ? inv.amount.toFixed(2) : inv.amount}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8em', fontWeight: 800, padding: '4px 12px', borderRadius: '10px', background: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: isPaid ? '#34d399' : '#f59e0b', border: `1px solid ${isPaid ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                            {isPaid ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button onClick={() => window.print()} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Download size={12} /> Receipt PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Revision Modal */}
      {revModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--panel-bg, #0f172a)', border: '1px solid var(--panel-border, rgba(255,255,255,0.1))', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3em', color: '#ffffff' }}>🔄 Request Revision</h3>
              <button onClick={() => setRevModal({ open: false, requestId: null, title: '' })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9em', color: '#94a3b8', marginBottom: '16px' }}>
              Provide feedback for <strong>{revModal.title}</strong>:
            </p>

            <textarea
              rows="4"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="E.g., Please change the main headline text to '20% OFF Summer Sale', and adjust background color to Navy Blue..."
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.9em', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setRevModal({ open: false, requestId: null, title: '' })} style={{ padding: '10px 18px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSendRevision} style={{ padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                Send Revision Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Brand Asset Upload Modal */}
      {showClientAssetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--panel-bg, #0f172a)', border: '1px solid var(--panel-border, rgba(255,255,255,0.1))', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3em', color: '#ffffff', fontWeight: 800 }}>📂 Upload Brand Vault Asset</h3>
              <button onClick={() => setShowClientAssetModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleClientAssetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                  Asset Name / Description *
                </label>
                <input
                  type="text"
                  value={clientAssetForm.title}
                  onChange={e => setClientAssetForm({ ...clientAssetForm, title: e.target.value })}
                  required
                  placeholder="E.g., Updated High-Res Vector Logo, Brand Guidelines PDF..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.9em', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                    Category
                  </label>
                  <select
                    value={clientAssetForm.category}
                    onChange={e => setClientAssetForm({ ...clientAssetForm, category: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.9em', outline: 'none' }}
                  >
                    <option value="Logo">🎨 Logo</option>
                    <option value="Guideline">📖 Guideline</option>
                    <option value="Font">🔤 Font</option>
                    <option value="Media">🎬 Media</option>
                    <option value="Other">📦 Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                    Select File *
                  </label>
                  <input
                    type="file"
                    id="clientAssetFileInput"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.82em', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowClientAssetModal(false)} style={{ padding: '10px 18px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={clientAssetUploading} style={{ padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #7e22ce)', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.35)' }}>
                  {clientAssetUploading ? 'Uploading...' : '🚀 Upload to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Request Submission Modal */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--panel-bg, #1e293b)',
            border: '1px solid var(--panel-border, rgba(255,255,255,0.1))',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '0.75em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                  Client Portal
                </span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.6em', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
                  Submit New Work Request
                </h2>
              </div>
              <button 
                onClick={() => setShowRequestModal(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                <X size={18} />
              </button>
            </div>

            {requestMsg.text && (
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.9em',
                fontWeight: 600,
                background: requestMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: requestMsg.type === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${requestMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
              }}>
                {requestMsg.text}
              </div>
            )}

            {/* Request Form */}
            <form onSubmit={handleWorkRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                  Work Title / Topic *
                </label>
                <input 
                  type="text" 
                  value={requestForm.job_title}
                  onChange={e => setRequestForm({ ...requestForm, job_title: e.target.value })}
                  required
                  placeholder="E.g. Karoke Room Offer Banner, Reel Video Edit..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--input-bg, rgba(0,0,0,0.25))',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                    color: 'var(--text-main, #ffffff)',
                    fontSize: '0.95em',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                    Category / Type
                  </label>
                  <select 
                    value={requestForm.job_type}
                    onChange={e => setRequestForm({ ...requestForm, job_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--input-bg, #0f172a)',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.92em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Post">🎨 New Post Creation</option>
                    <option value="Template Date Change">📅 Change Date on Template</option>
                    <option value="Video">🎬 Video</option>
                    <option value="Content">✍️ Content</option>
                    <option value="Watermark">💧 Watermark</option>
                    <option value="Photo Editing">📸 Photo Editing</option>
                    <option value="Photo Shoot">📷 Photo Shoot</option>
                    <option value="Video Shoot">🎥 Video Shoot</option>
                    <option value="Video Editing">✂️ Video Editing</option>
                    <option value="Video Script">📜 Video Script</option>
                    <option value="Document">📄 Document</option>
                    <option value="Logo Design">✨ Logo Design</option>
                    <option value="Campaign">🚀 Campaign</option>
                    <option value="Other">📦 Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                    Desired Delivery Date
                  </label>
                  <input 
                    type="date" 
                    value={requestForm.delivery_date}
                    onChange={e => setRequestForm({ ...requestForm, delivery_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--input-bg, rgba(0,0,0,0.25))',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.92em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                  Brief / Specific Instructions
                </label>
                <textarea 
                  rows="3"
                  value={requestForm.notes}
                  onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Provide text details, offer wording, dimensions, or specific requirements..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--input-bg, rgba(0,0,0,0.25))',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                    color: 'var(--text-main, #ffffff)',
                    fontSize: '0.92em',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '8px' }}>
                  Attachment / Brief Document (Optional)
                </label>
                <input 
                  type="file" 
                  id="clientRequestFile"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--input-bg, rgba(0,0,0,0.25))',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                    color: '#94a3b8',
                    fontSize: '0.9em',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRequestModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.95em'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingRequest}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                    opacity: submittingRequest ? 0.7 : 1
                  }}
                >
                  <Send size={16} />
                  {submittingRequest ? 'Submitting Request...' : 'Submit Work Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

