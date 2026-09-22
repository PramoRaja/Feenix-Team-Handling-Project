'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { SRI_LANKAN_HOLIDAYS } from '@/lib/sriLankanHolidays';

function SafeAvatar({ src, name, size = 50 }) {
    const [error, setError] = useState(false);
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    const radius = size === 120 || size === 32 ? '50%' : '14px';
    const fontSize = size === 120 ? '2.5em' : (size === 32 ? '0.85em' : '1.1em');
    const border = size === 120 ? '3px solid rgba(59,130,246,0.3)' : '1px solid var(--panel-border)';
    
    if (src && src !== 'default.png' && !error) {
        return <img src={src} onError={() => setError(true)} style={{width:`${size}px`, height:`${size}px`, borderRadius:radius, objectFit:'cover', border, flexShrink:0, margin: size === 120 ? '0 auto 15px auto' : '0', display: size === 120 ? 'block' : 'inline-block'}} alt="Avatar" />;
    }
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: radius,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            fontSize, border, boxShadow: (size === 120 || size === 32) ? 'none' : '0 4px 10px rgba(59, 130, 246, 0.15)', flexShrink: 0,
            margin: size === 120 ? '0 auto 15px auto' : '0'
        }}>
            {initials}
        </div>
    );
}

import { ShieldCheck, UserCheck, AlertTriangle, Briefcase, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth').then(r=>r.json()).then(d=>{
      if(!d.authenticated) router.push('/worker/login');
      else if(d.user.role !== 'worker') router.push('/');
      else { setUser(d.user); setLoading(false); }
    });
  }, [router]);

  if(loading) return <div style={{textAlign:'center', marginTop:'100px'}}>Establishing Secure Connection...</div>;

  return (
    <AppLayout user={user}>
        <WorkerDashboard router={router} />
    </AppLayout>
  );
}

// ============================
// ADMIN COMPONENTS
// ============================
function AdminDashboard({ router }) {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [leaderAssign, setLeaderAssign] = useState({}); // { [taskId]: leader_id }
    const [form, setForm] = useState({ title: '', description: '', employee_id: '', due_date: '' });
    const [msg, setMsg] = useState({text:'', type:''});
    const [stats, setStats] = useState({ activeTasks: 0, completedTasks: 0, unreadAlerts: 0 });
    const [expandedWorkers, setExpandedWorkers] = useState(new Set()); // worker ids with completed tasks shown
    const [myPoints, setMyPoints] = useState(null);

    const toggleWorkerCompleted = (workerId) => {
        setExpandedWorkers(prev => {
            const next = new Set(prev);
            if (next.has(workerId)) next.delete(workerId);
            else next.add(workerId);
            return next;
        });
    };

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            const allWorkers = d.workers || [];
            setWorkers(allWorkers);
            setTeamLeaders(allWorkers.filter(w => w.is_team_leader === 1 || String(w.is_team_leader) === '1' || (w.position || '').toLowerCase().includes('team lead')));
            setStats(prev => ({...prev, unreadAlerts: d.unread_count || 0}));
        });
        fetch('/api/tasks').then(r=>r.json()).then(d=>{
            const ts = d.tasks || [];
            setTasks(ts);
            setStats(prev => ({
                ...prev,
                activeTasks: ts.filter(t=>t.status !== 'Completed').length,
                completedTasks: ts.filter(t=>t.status === 'Completed').length
            }));
        });
    };

    useEffect(() => {
        fetchData();
        // Fetch current worker's points
        fetch('/api/points').then(r => r.json()).then(d => {
            if (d.points && d.points.length > 0) setMyPoints(Number(d.points[0].total_points));
            else setMyPoints(0);
        });
    }, []);

    const updateAdminStatus = async (taskId, newStatus) => {
        await fetch('/api/tasks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ task_id: taskId, status: newStatus }) });
        fetchData();
    };

    const handleTerminateNode = async (workerId, workerName) => {
        if (!window.confirm(`WARNING: Are you absolutely sure you want to terminate the node for ${workerName}?\n\nThis will permanently delete their account, messages, notifications, and associated operational tasks. This action CANNOT be undone.`)) return;
        
        try {
            console.log(`Initiating termination protocol for worker: ${workerId}`);
            const res = await fetch('/api/adminData', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId }),
                credentials: 'include'
            });
            
            const text = await res.text();
            console.log('Termination response:', text);
            let data;
            try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid JSON response'); }
            
            if (res.ok && data.success) {
                alert(`Node terminated successfully for ${workerName}.`);
                fetchData();
            } else {
                alert(`Failed to terminate node: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Termination error:', err);
            alert(`An error occurred during termination protocol: ${err.message}`);
        }
    };

    const assignLeaderToWorker = async (workerId, leaderId) => {
        await fetch('/api/adminData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'assignLeader', workerId, leaderId: leaderId || null })
        });
        fetchData();
    };

    const assignToLeader = async (taskId, leaderId) => {
        if(!leaderId) return;
        const task = tasks.find(t => t.id === taskId);
        await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                receiver_id: leaderId,
                message: `🔔 Admin Review Request: Please review and approve the task "${task?.title}" submitted by ${task?.worker_name}. Notes: ${task?.worker_note || 'None.'}`
            })
        });
        setLeaderAssign(prev => ({...prev, [taskId]: 'sent'}));
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setMsg({text:'', type:''});
        
        let attachment = '';
        const fileInput = document.getElementById('taskFile').files[0];
        if(fileInput) {
            const fd = new FormData(); fd.append('file', fileInput);
            const up = await fetch('/api/upload', { method:'POST', body:fd }).then(r=>r.json());
            if(up.url) attachment = up.url;
        }

        const res = await fetch('/api/tasks', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({...form, attachment})
        }).then(r=>r.json());

        if(res.success) {
            setMsg({text: 'Operation deployed successfully.', type:'success'});
            setForm({ title: '', description: '', employee_id: '', due_date: '' });
            document.getElementById('taskFile').value = '';
            fetchData();
        } else setMsg({text: 'Error deploying task.', type:'error'});
    };

    function getOnlineStatus(last_active) {
        if(!last_active) return <span style={{color:'#f87171'}}>Offline</span>;
        const diff = (new Date() - new Date(last_active)) / 1000;
        return diff < 300 ? <span style={{color:'#34d399'}}>Online</span> : <span style={{color:'#94a3b8'}}>Offline</span>;
    }

    return (
        <div className="animate-slide-up">
            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="glass-panel stats-card">
                    <div className="stats-icon" style={{background:'rgba(59, 130, 246, 0.15)', color:'#3b82f6'}}><UserCheck /></div>
                    <div><h3 style={{margin:0, fontSize:'1.8em'}}>{workers.length}</h3><p style={{margin:0, color:'#94a3b8', fontSize:'0.9em'}}>Active Nodes</p></div>
                </div>
                <div className="glass-panel stats-card">
                    <div className="stats-icon" style={{background:'rgba(245, 158, 11, 0.15)', color:'#f59e0b'}}><ShieldCheck /></div>
                    <div><h3 style={{margin:0, fontSize:'1.8em'}}>{stats.activeTasks}</h3><p style={{margin:0, color:'#94a3b8', fontSize:'0.9em'}}>Pending Operations</p></div>
                </div>
                <div className="glass-panel stats-card">
                    <div className="stats-icon" style={{background:'rgba(239, 68, 68, 0.15)', color:'#ef4444'}}><AlertTriangle /></div>
                    <div><h3 style={{margin:0, fontSize:'1.8em'}}>{stats.unreadAlerts}</h3><p style={{margin:0, color:'#94a3b8', fontSize:'0.9em'}}>Unread Alerts</p></div>
                </div>
            </div>

            {/* Pending Approvals Panel */}
            {tasks.filter(t => t.status === 'Pending Approval').length > 0 && (
                <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.04)' }}>
                    <h3 style={{ marginBottom: '20px', marginTop: 0, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🔔 Pending Approval Requests ({tasks.filter(t => t.status === 'Pending Approval').length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {tasks.filter(t => t.status === 'Pending Approval').map(t => (
                            <div key={t.id} style={{ background: 'var(--card-inner-bg, rgba(0,0,0,0.2))', borderRadius: '14px', padding: '18px', border: '1px solid var(--card-inner-border, rgba(139,92,246,0.15))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '1.05em', color: 'var(--header-text, #e2e8f0)', marginBottom: '4px' }}>{t.title}</div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Submitted by <strong style={{ color: 'var(--text-main, #f8fafc)' }}>{t.worker_name}</strong>
                                        {t.worker_note && <> — Notes: <em style={{ color: 'var(--text-muted, #cbd5e1)' }}>{t.worker_note}</em></>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {leaderAssign[t.id] === 'sent' ? (
                                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9em' }}>✓ Routed to Team Leader</span>
                                    ) : (
                                        teamLeaders.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <select
                                                    value={typeof leaderAssign[t.id] === 'string' && leaderAssign[t.id] !== 'sent' ? leaderAssign[t.id] : ''}
                                                    onChange={e => setLeaderAssign(prev => ({...prev, [t.id]: e.target.value}))}
                                                    style={{ padding: '8px 12px', fontSize: '0.85em', minWidth: '160px' }}
                                                >
                                                    <option value="">Assign to Leader...</option>
                                                    {teamLeaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => assignToLeader(t.id, leaderAssign[t.id])}
                                                    disabled={!leaderAssign[t.id]}
                                                    className="btn-secondary"
                                                    style={{ padding: '8px 14px', fontSize: '0.85em', borderColor: '#a855f7', color: '#a855f7' }}
                                                >Route →</button>
                                            </div>
                                        )
                                    )}
                                    <button onClick={() => updateAdminStatus(t.id, 'Approved')} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85em', background: '#0ea5e9' }}>
                                        Approve ✓
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {/* Monthly Operations — Excel-style tabbed view */}
            <MonthlyOpsViewer tasks={tasks} fetchData={fetchData} workers={workers} />

            {/* Quick Operational Actions */}
            <div className="glass-panel" style={{ padding: '30px', marginBottom: '40px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.4em', color: '#60a5fa' }}>Operational Control</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Deploy new tasks or manage existing operations registry.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={() => router.push('/admin/assign')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Briefcase size={18}/> Assign New Operation
                    </button>
                    <button onClick={() => router.push('/operations')} className="btn-secondary">
                       View Full Registry
                    </button>
                </div>
            </div>

            {/* Workers Global View */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Active Node Network (Workers: {workers.length})</h3>
                {workers.length > 3 && (
                    <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
                        <span>↕</span> Scroll down to view all {workers.length} nodes
                    </span>
                )}
            </div>
            <div 
                className="network-scroll-container"
                style={{
                    maxHeight: '620px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: '10px',
                    paddingBottom: '14px',
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth'
                }}
            >
                <div className="workers-grid">
                {workers.map(w => {
                    const workerTasks = tasks.filter(t => t.employee_id === w.id);
                    const activeTasks = workerTasks.filter(t => t.status !== 'Completed' && t.status !== 'Approved');
                    const completedTasks = workerTasks.filter(t => t.status === 'Completed' || t.status === 'Approved');
                    const showCompleted = expandedWorkers.has(w.id);

                    return (
                    <div key={w.id} className="glass-panel" style={{ padding: '25px', display:'flex', flexDirection:'column' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px', borderBottom:'1px solid var(--panel-border)', paddingBottom:'20px' }}>
                            <SafeAvatar src={w.profile_picture} name={w.name} size={50} />
                            <div style={{flex: 1}}>
                                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                                    <h3
                                        onClick={() => completedTasks.length > 0 && toggleWorkerCompleted(w.id)}
                                        style={{margin:0, fontSize:'1.1em', color:'var(--text-main)', cursor: completedTasks.length > 0 ? 'pointer' : 'default', transition:'color 0.2s'}}
                                        onMouseEnter={e => { if(completedTasks.length > 0) e.currentTarget.style.color = '#60a5fa'; }}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-main)'}
                                        title={completedTasks.length > 0 ? 'Click to toggle completed tasks' : ''}
                                    >{w.name}</h3>
                                    {completedTasks.length > 0 && (
                                        <span
                                            onClick={() => toggleWorkerCompleted(w.id)}
                                            style={{ fontSize:'0.72em', fontWeight:700, padding:'2px 8px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s',
                                                background: showCompleted ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.15)',
                                                color: showCompleted ? '#10b981' : '#64748b',
                                                border: `1px solid ${showCompleted ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.2)'}`
                                            }}
                                        >
                                            {showCompleted ? '▲' : '▼'} {completedTasks.length} Completed
                                        </span>
                                    )}
                                </div>
                                <p style={{margin:0, fontSize:'0.85em', color:'var(--text-muted)', marginBottom:'4px', marginTop:'2px'}}>{w.position}</p>
                                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                    <p style={{margin:0, fontSize:'0.8em', fontWeight:600}}>{getOnlineStatus(w.last_active)}</p>
                                    {w.attendance_date && new Date(w.attendance_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0] && (
                                       <span style={{fontSize:'0.75em', fontWeight:600, padding:'2px 8px', borderRadius:'10px', background:w.attendance_status==='Present'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:w.attendance_status==='Present'?'#059669':'#dc2626'}}>
                                           {w.attendance_status}
                                       </span>
                                    )}
                                </div>
                                <div style={{marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <label style={{fontSize: '0.8em', color: 'var(--text-muted)'}}>Route to Team Leader:</label>
                                    <select
                                        value={w.assigned_leader_id || ''}
                                        onChange={(e) => assignLeaderToWorker(w.id, e.target.value)}
                                        style={{padding: '4px 8px', fontSize: '0.8em', borderRadius: '8px', minWidth: '150px'}}
                                    >
                                        <option value="">None (Admin Direct)</option>
                                        {teamLeaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={() => handleTerminateNode(w.id, w.name)} className="btn-icon" style={{color:'#ef4444', padding:'8px', background:'rgba(239, 68, 68, 0.1)', borderRadius:'8px'}} title="Terminate Node">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Active Tasks */}
                        <h4 style={{margin:'0 0 12px 0', color:'#cbd5e1', fontSize:'0.9em', textTransform:'uppercase', letterSpacing:'0.5px'}}>Active Operations</h4>
                        <div style={{flex:1, display:'flex', flexDirection:'column', gap:'10px'}}>
                            {activeTasks.length === 0 && <p style={{color:'#64748b', fontSize:'0.85em'}}>No active operations.</p>}
                            {activeTasks.map(t => {
                                const sc = t.status==='Pending Approval'?'status-pending':(t.status==='Having Changes'?'status-changes':(t.status==='In Progress'?'status-progress':'status-assigned'));
                                return (
                                <div key={t.id} style={{ background:'var(--card-inner-bg, rgba(0,0,0,0.2))', padding:'14px', borderRadius:'12px', border:'1px solid var(--card-inner-border, rgba(255,255,255,0.03))'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px'}}>
                                        <strong style={{color: 'var(--text-main)', fontSize:'1em'}}>{t.title}</strong>
                                        <span className={`status-badge ${sc}`}>{t.status}</span>
                                    </div>
                                    {t.due_date && <div style={{fontSize:'0.8em', color:'#ef4444', marginTop:'6px', fontWeight:500, marginBottom:'10px'}}>Deadline: {new Date(t.due_date).toLocaleDateString()}</div>}
                                    {t.status === 'Pending Approval' && (
                                        <button onClick={()=>updateAdminStatus(t.id, 'Approved')} className="btn-primary" style={{padding:'6px 12px', fontSize:'0.8em', width:'100%', marginTop:'5px', background:'#0ea5e9'}}>Approve Task ✓</button>
                                    )}
                                    {t.status === 'Approved' && (
                                        <button onClick={()=>updateAdminStatus(t.id, 'Completed')} className="btn-secondary" style={{padding:'6px 12px', fontSize:'0.8em', width:'100%', marginTop:'5px', color:'#10b981', borderColor:'#10b981'}}>Mark Completed</button>
                                    )}
                                </div>
                            )})}
                        </div>

                        {/* Completed Tasks — toggled by name click */}
                        {showCompleted && completedTasks.length > 0 && (
                            <div style={{marginTop:'18px', borderTop:'1px solid var(--panel-border)', paddingTop:'14px'}}>
                                <h4 style={{margin:'0 0 10px 0', color:'#10b981', fontSize:'0.85em', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:'6px'}}>
                                    ✅ Completed Operations
                                </h4>
                                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                    {completedTasks.map(t => (
                                        <div key={t.id} style={{ background:'rgba(16,185,129,0.04)', padding:'12px 14px', borderRadius:'10px', border:'1px solid rgba(16,185,129,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', opacity: 0.85 }}>
                                            <span style={{color:'#94a3b8', fontSize:'0.9em', textDecoration:'line-through'}}>{t.title}</span>
                                            <span className={`status-badge ${t.status === 'Approved' ? 'status-approved' : 'status-completed'}`}>{t.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>
            </div>
        </div>
    );
}

// ============================
// MONTHLY OPS VIEWER (Excel-tab style, day-by-day grouping)
// ============================
function MonthlyOpsViewer({ tasks, fetchData, workers }) {
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const toYearMonth = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    };

    const toYearMonthDay = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const today = new Date();
    const currentYear = today.getFullYear();
    const todayKey = today.toISOString().slice(0, 7);
    
    // Collect months
    const yearsWithData = new Set([currentYear]);
    tasks.forEach(t => {
        const key = toYearMonth(t.created_at) || toYearMonth(t.due_date);
        if (key) yearsWithData.add(parseInt(key.split('-')[0]));
    });

    const allMonths = [];
    [...yearsWithData].sort().reverse().forEach(year => {
        for (let m = 12; m >= 1; m--) {
            allMonths.push(`${year}-${String(m).padStart(2, '0')}`);
        }
    });

    const [activeMonth, setActiveMonth] = useState(todayKey);
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const handlePrevMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const prevD = new Date(yr, mo - 2, 1);
        const prevStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(prevStr)) {
            allMonths.push(prevStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(prevStr);
    };

    const handleNextMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const nextD = new Date(yr, mo, 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(nextStr)) {
            allMonths.push(nextStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(nextStr);
    };

    const [activeWorker, setActiveWorker] = useState(null); // null = "Works" (All)
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({});
    
    // Modal State
    const [taskDetailsModal, setTaskDetailsModal] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskForm, setEditTaskForm] = useState({});
    
    // Projects State
    const [projects, setProjects] = useState([]);
    
    useEffect(() => {
        fetch('/api/projects').then(r=>r.json()).then(d => {
            if(d.success) setProjects(d.projects || []);
        });
    }, []);

    // Filter tasks for active month
    const monthTasks = tasks.filter(t => (toYearMonth(t.due_date) || toYearMonth(t.created_at)) === activeMonth);

    // Get active workers for the bottom tabs
    const monthWorkerIds = new Set();
    monthTasks.forEach(t => { if(t.employee_id) monthWorkerIds.add(t.employee_id); });
    const tabWorkers = workers.filter(w => monthWorkerIds.has(w.id) || tasks.some(t=>t.employee_id === w.id)); // All workers who have ever had tasks, or just all active workers? Let's show all active workers in the company to allow assigning new.
    
    // Sort workers alphabetically
    const sortedWorkers = [...workers].sort((a,b) => a.name.localeCompare(b.name));

    // Filter tasks by active worker (if not "Works" tab)
    const displayTasks = activeWorker ? monthTasks.filter(t => t.employee_id === activeWorker) : monthTasks;

    // Group by Day -> { 'YYYY-MM-DD': [tasks...] }
    const dayMap = {};
    displayTasks.forEach(t => {
        const dayKey = toYearMonthDay(t.due_date) || toYearMonthDay(t.created_at);
        if (!dayKey) return;
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(t);
    });

    // Calculate Max Tasks in a single day to determine column count
    let maxTasksInDay = 1; // at least 1
    Object.values(dayMap).forEach(dayArr => {
        if (dayArr.length > maxTasksInDay) maxTasksInDay = dayArr.length;
    });
    // Let's ensure at least 4 empty columns for aesthetic matching with excel
    maxTasksInDay = Math.max(maxTasksInDay, 4);

    const [y, m] = activeMonth.split('-');
    const daysInMonth = new Date(y, m, 0).getDate();

    const handleStatusChange = async (taskId, newStatus) => {
        await fetch('/api/tasks', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, status: newStatus })
        });
        if(fetchData) fetchData();
    };

    const handleSchedule = async () => {
        if (!scheduleForm.date || !scheduleForm.title || !scheduleForm.employee_id) return alert('Please fill Date, Title, and Worker.');
        
        let attachmentUrl = '';
        if (scheduleForm.file) {
            const formData = new FormData();
            formData.append('file', scheduleForm.file);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json());
            if(uploadRes.success) attachmentUrl = uploadRes.url;
        }

        const res = await fetch('/api/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: scheduleForm.title, 
                description: scheduleForm.description || '',
                employee_id: scheduleForm.employee_id, 
                due_date: scheduleForm.date, 
                attachment: attachmentUrl,
                project_id: scheduleForm.project_id || null,
                category: scheduleForm.category || 'Other'
            })
        }).then(r => r.json());
        
        if (res.success) {
            setScheduleOpen(false);
            setScheduleForm({});
            if (fetchData) fetchData();
        }
    };

    const handleAdminDelete = async (taskId) => {
        if(!confirm('Are you sure you want to completely delete this task?')) return;
        const res = await fetch('/api/tasks', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ task_id: taskId }) }).then(r=>r.json());
        if(res.success) {
            setTaskDetailsModal(null);
            if(fetchData) fetchData();
        }
    };

    const handleAdminReschedule = async (taskId) => {
        if(!rescheduleDate) return alert('Select a new date first.');
        const res = await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ task_id: taskId, due_date: rescheduleDate, status: taskDetailsModal.status }) }).then(r=>r.json());
        if(res.success) {
            setTaskDetailsModal(null);
            if(fetchData) fetchData();
        }
    };

    const handleFullEditSave = async () => {
        const res = await fetch('/api/tasks', { 
            method: 'PUT', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                task_id: taskDetailsModal.id, 
                title: editTaskForm.title,
                description: editTaskForm.description,
                wage: editTaskForm.wage,
                due_date: editTaskForm.due_date,
                employee_id: editTaskForm.employee_id,
                project_id: editTaskForm.project_id || null,
                category: editTaskForm.category || 'Other',
                status: editTaskForm.status
            }) 
        }).then(r=>r.json());
        if(res.success) {
            setIsEditingTask(false);
            setTaskDetailsModal(null);
            if(fetchData) fetchData();
        }
    };

    const getStatusStyle = (status) => {
        if(status === 'Completed' || status === 'Approved') return { bg: '#059669', color: '#fff' }; // Green
        if(status === 'Having Changes' || (status && status.includes('Overdue'))) return { bg: '#dc2626', color: '#fff' }; // Red
        if(status === 'Pending Approval' || status === 'In Progress') return { bg: '#d97706', color: '#fff' }; // Orange/Yellowish
        if(status === 'Assigned') return { bg: '#0284c7', color: '#fff' }; // Blue
        return { bg: 'transparent', color: '#cbd5e1' };
    };

    return (
        <div className="glass-panel" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--panel-border)', marginBottom: '40px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Top Toolbar */}
            <div style={{
                background: isLight ? '#ffffff' : 'var(--toolbar-bg, rgba(15, 23, 42, 0.4))',
                backdropFilter: 'blur(10px)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                        flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.2em',
                        fontWeight: 800,
                        color: isLight ? '#0f172a' : 'var(--header-text, var(--text-main))',
                        letterSpacing: '0.3px',
                        whiteSpace: 'nowrap'
                    }}>
                        Operations Flow
                    </h3>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {/* Month Navigator with Prev / Next and Dropdown */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                        borderRadius: '12px',
                        padding: '2px',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Previous Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ◀
                        </button>

                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select
                                value={activeMonth}
                                onChange={e => setActiveMonth(e.target.value)}
                                style={{
                                    padding: '7px 32px 7px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.7)',
                                    color: isLight ? '#0f172a' : '#f8fafc',
                                    fontSize: '0.92em',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    outline: 'none',
                                    minWidth: '150px',
                                    boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                    textAlign: 'center'
                                }}
                            >
                                {allMonths.map(mStr => {
                                    const [my, mm] = mStr.split('-');
                                    const mName = MONTH_NAMES[parseInt(mm)-1];
                                    return (
                                        <option
                                            key={mStr}
                                            value={mStr}
                                            style={{
                                                background: isLight ? '#ffffff' : '#1e293b',
                                                color: isLight ? '#0f172a' : '#f8fafc',
                                                fontWeight: 600,
                                                padding: '6px'
                                            }}
                                        >
                                            {mName} {my}
                                        </option>
                                    );
                                })}
                            </select>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={isLight ? '#475569' : '#94a3b8'}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Next Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ▶
                        </button>
                    </div>

                    {/* Add Task Button */}
                    <button
                        onClick={() => setScheduleOpen(!scheduleOpen)}
                        className="btn-primary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 18px',
                            borderRadius: '12px',
                            fontSize: '0.88em',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Task
                    </button>
                </div>
            </div>

            {/* Quick Add Task Inline Form */}
            {scheduleOpen && (
                <div style={{ padding: '16px 24px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="date" value={scheduleForm.date || ''} onChange={e=>setScheduleForm(p=>({...p, date: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}/>
                        <input type="text" placeholder="Enter task title..." value={scheduleForm.title || ''} onChange={e=>setScheduleForm(p=>({...p, title: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em', flex: 1, minWidth: '200px' }}/>
                        <select value={scheduleForm.employee_id || ''} onChange={e=>setScheduleForm(p=>({...p, employee_id: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="">Select Designer...</option>
                            {sortedWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <select value={scheduleForm.project_id || ''} onChange={e=>{
                            const selectedProject = projects.find(p => p.id == e.target.value);
                            setScheduleForm(prev=>({...prev, project_id: e.target.value, title: selectedProject ? selectedProject.name : prev.title}));
                        }} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="">No Project (Optional)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={scheduleForm.category || ''} onChange={e=>setScheduleForm(p=>({...p, category: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="Other">Other Category</option>
                            <option value="Graphic">Graphic</option>
                            <option value="Video">Video</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                        <textarea placeholder="Task Description / Content (Optional)" value={scheduleForm.description || ''} onChange={e=>setScheduleForm(p=>({...p, description: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em', flex: 1, minHeight: '60px', resize: 'vertical' }}></textarea>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="file" onChange={e=>setScheduleForm(p=>({...p, file: e.target.files[0]}))} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }} />
                            <button onClick={handleSchedule} style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9em', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(16,185,129,0.2)' }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                                Save Task ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spreadsheet Grid Wrapper */}
            <div style={{ overflowX: 'auto', maxHeight: '650px', overflowY: 'auto', position: 'relative' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: '16px 20px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--table-header-bg, rgba(15, 23, 42, 0.95))', backdropFilter: 'blur(10px)', zIndex: 11, minWidth: '130px', color: 'var(--text-muted)', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)', borderRight: '1px solid var(--panel-border)' }}>Date</th>
                            <th colSpan={maxTasksInDay * 2} style={{ padding: '16px 20px', textAlign: 'center', background: 'var(--table-header-bg, rgba(15, 23, 42, 0.95))', backdropFilter: 'blur(10px)', color: 'var(--text-muted)', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)' }}>Assigned Workflow Slots</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({length: daysInMonth}, (_, i) => {
                            const dStr = String(i+1).padStart(2, '0');
                            const dayKey = `${activeMonth}-${dStr}`;
                            const dateObj = new Date(dayKey + 'T12:00:00');
                            const dayName = DAY_NAMES[dateObj.getDay()];
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                            const isToday = dayKey === new Date().toISOString().split('T')[0];
                            
                            // Beautiful subtle alternating or weekend backgrounds
                            const baseBg = isToday ? 'rgba(16,185,129,0.05)' : (isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent');
                            const tasksForDay = dayMap[dayKey] || [];
                            
                            return (
                                <tr key={i} style={{ background: baseBg, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg, rgba(255,255,255,0.04))'} onMouseLeave={e => e.currentTarget.style.background = baseBg}>
                                    {/* Date Column */}
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid var(--table-border, rgba(255,255,255,0.04))', borderRight: '1px solid var(--table-border, rgba(255,255,255,0.04))', textAlign: 'left', position: 'sticky', left: 0, background: isToday ? 'var(--today-bg, rgba(16,35,42,0.97))' : (isWeekend ? 'var(--weekend-bg, rgba(15, 23, 42, 0.95))' : 'var(--date-col-bg, rgba(15, 23, 42, 0.8))'), backdropFilter: 'blur(10px)', zIndex: 2, color: isToday ? '#10b981' : 'var(--date-col-text, #e2e8f0)', fontWeight: isToday ? 700 : 500, fontSize: '0.9em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.2em', fontWeight: 600 }}>{dStr}</span>
                                            <span style={{ color: isToday ? '#34d399' : 'var(--text-muted)' }}>{dayName}</span>
                                            {isToday && <span style={{ fontSize: '0.7em', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>TODAY</span>}
                                        </div>
                                    </td>
                                    
                                    {/* Task Columns */}
                                    {Array.from({length: maxTasksInDay}, (_, colIndex) => {
                                        const task = tasksForDay[colIndex];
                                        
                                        // Premium task cell styling
                                        let titleBg = 'var(--task-default-bg, rgba(0,0,0,0.2))';
                                        let titleColor = 'var(--task-default-color, #cbd5e1)';
                                        let titleBorder = 'var(--task-default-border, 1px solid rgba(255,255,255,0.05))';
                                        
                                        if(task) {
                                            titleColor = '#f8fafc';
                                            if(task.status === 'Having Changes') { titleBg = 'rgba(239,68,68,0.1)'; titleColor = '#fca5a5'; titleBorder = '1px solid rgba(239,68,68,0.3)'; }
                                            else if(task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'Completed') { titleBg = 'rgba(239,68,68,0.05)'; titleColor = '#fca5a5'; titleBorder = '1px dashed rgba(239,68,68,0.3)'; }
                                            else if(task.status === 'Completed' || task.status === 'Approved') { titleBg = 'rgba(16,185,129,0.05)'; titleBorder = '1px solid rgba(16,185,129,0.2)'; }
                                        }

                                        return (
                                            <React.Fragment key={colIndex}>
                                                {/* Task Title Cell */}
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--table-border, rgba(255,255,255,0.04))' }}>
                                                    {task ? (
                                                        <div 
                                                            onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setModalPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                                                                setTaskDetailsModal(task);
                                                                setRescheduleDate(toYearMonthDay(task.due_date));
                                                                setIsEditingTask(false);
                                                            }}
                                                            style={{ padding: '8px 14px', background: titleBg, border: titleBorder, borderRadius: '8px', minWidth: '180px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85em', fontWeight: 500, color: titleColor, transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} 
                                                            title="Click to view details"
                                                        >
                                                            <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{task.title}</span>
                                                            {(task.description || task.attachment) && (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                {/* Task Status Dropdown Cell */}
                                                <td style={{ padding: '8px 20px 8px 0', borderBottom: '1px solid var(--table-border, rgba(255,255,255,0.04))' }}>
                                                    {task ? (
                                                        <div style={{ position: 'relative', width: '130px' }}>
                                                            <select 
                                                                value={task.status}
                                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                                style={{ 
                                                                    width: '100%', padding: '7px 24px 7px 12px', border: `1px solid ${getStatusStyle(task.status).bg.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('#059669', 'rgba(5,150,105,0.3)').replace('#dc2626', 'rgba(220,38,38,0.3)').replace('#d97706', 'rgba(217,119,6,0.3)').replace('#0284c7', 'rgba(2,132,199,0.3)')}`, 
                                                                    borderRadius: '8px', fontSize: '0.8em', fontWeight: 600, cursor: 'pointer',
                                                                    background: getStatusStyle(task.status).bg === 'transparent' ? 'var(--task-default-bg, rgba(0,0,0,0.2))' : getStatusStyle(task.status).bg.replace(')', ', 0.15)').replace('rgb', 'rgba').replace('#059669', 'rgba(5,150,105,0.15)').replace('#dc2626', 'rgba(220,38,38,0.15)').replace('#d97706', 'rgba(217,119,6,0.15)').replace('#0284c7', 'rgba(2,132,199,0.15)'),
                                                                    color: getStatusStyle(task.status).bg === 'transparent' ? 'var(--task-default-color, #cbd5e1)' : getStatusStyle(task.status).bg,
                                                                    outline: 'none', appearance: 'none', transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.2)'}
                                                                onMouseLeave={e=>e.currentTarget.style.filter='none'}
                                                            >
                                                                <option value="Assigned" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Assigned</option>
                                                                <option value="In Progress" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Working</option>
                                                                <option value="Pending Approval" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Pending</option>
                                                                <option value="Having Changes" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Changes</option>
                                                                <option value="Approved" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Approved</option>
                                                                <option value="Completed" style={{background:'var(--task-select-option-bg, #0f172a)', color:'var(--task-select-option-color, #fff)'}}>Done</option>
                                                            </select>
                                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: getStatusStyle(task.status).bg === 'transparent' ? 'var(--task-default-color, #cbd5e1)' : getStatusStyle(task.status).bg }}><path d="M1 1L5 5L9 1"/></svg>
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '130px', height: '32px', background: 'var(--cell-empty-bg, rgba(255,255,255,0.02))', borderRadius: '8px', border: 'var(--cell-empty-border, 1px dashed rgba(255,255,255,0.05))' }}></div>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bottom Worker Tabs (Sleek Segmented Control Style) */}
            <div style={{ display: 'flex', padding: '16px 24px', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid var(--panel-border)', background: 'var(--tab-container-bg, rgba(0,0,0,0.15))' }}>
                <div 
                    onClick={() => setActiveWorker(null)}
                    style={{
                        padding: '10px 20px', fontSize: '0.9em', fontWeight: 600,
                        background: activeWorker === null ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))' : 'rgba(255,255,255,0.03)',
                        color: activeWorker === null ? '#fff' : '#94a3b8',
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: activeWorker === null ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                        boxShadow: activeWorker === null ? '0 4px 15px rgba(59,130,246,0.1)' : 'none'
                    }}
                    onMouseEnter={e => { if(activeWorker !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={e => { if(activeWorker !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    All Operations
                </div>
                {sortedWorkers.map(w => {
                    const isActive = activeWorker === w.id;
                    const wCount = monthTasks.filter(t => t.employee_id === w.id).length;
                    return (
                        <div 
                            key={w.id}
                            onClick={() => setActiveWorker(w.id)}
                            style={{
                                padding: '10px 20px', fontSize: '0.9em', fontWeight: 600,
                                background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                color: isActive ? '#60a5fa' : '#94a3b8',
                                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        >
                            {w.name}
                            <span style={{ fontSize: '0.75em', padding: '2px 8px', borderRadius: '20px', background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', color: isActive ? '#fff' : '#cbd5e1' }}>{wCount}</span>
                        </div>
                    );
                })}
            </div>

            {/* Task Details Modal (Contextual Popover) */}
            {taskDetailsModal && (
                <>
                    {/* Invisible backdrop to detect clicks outside */}
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => {setTaskDetailsModal(null); setRescheduleDate('');}}></div>
                    
                    {/* Popover Card */}
                    <div style={{ position: 'fixed', top: modalPosition.top, left: modalPosition.left, zIndex: 1000, animation: 'fadeIn 0.2s ease-out', background: 'var(--panel-bg)', padding: '24px', borderRadius: '16px', width: '400px', border: '1px solid var(--panel-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => {setTaskDetailsModal(null); setRescheduleDate(''); setIsEditingTask(false);}} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        {!isEditingTask ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.4em', paddingRight: '40px' }}>{taskDetailsModal.title}</h2>
                                    <button onClick={() => {
                                        setIsEditingTask(true);
                                        setEditTaskForm({
                                            title: taskDetailsModal.title,
                                            description: taskDetailsModal.description || '',
                                            wage: taskDetailsModal.wage || 0,
                                            due_date: toYearMonthDay(taskDetailsModal.due_date),
                                            employee_id: taskDetailsModal.employee_id,
                                            project_id: taskDetailsModal.project_id || '',
                                            category: taskDetailsModal.category || 'Other',
                                            status: taskDetailsModal.status
                                        });
                                    }} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600 }}>Edit</button>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span className={`status-badge status-${taskDetailsModal.status.replace(' ', '').toLowerCase()}`}>{taskDetailsModal.status}</span>
                                    <span>Assigned to: <strong style={{color:'var(--text-main)'}}>{taskDetailsModal.worker_name || 'Worker'}</strong></span>
                                    {taskDetailsModal.project_id && <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px' }}>Project ID: {taskDetailsModal.project_id}</span>}
                                    {taskDetailsModal.category && <span style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '2px 8px', borderRadius: '4px' }}>{taskDetailsModal.category}</span>}
                                </div>

                                {taskDetailsModal.description && (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.95em', color: 'var(--text-main)', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {taskDetailsModal.description}
                                    </div>
                                )}

                                {taskDetailsModal.attachment && (
                                    <div style={{ marginBottom: '25px' }}>
                                        <a href={taskDetailsModal.attachment} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(59,130,246,0.3)', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(59, 130, 246, 0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(59, 130, 246, 0.1)'}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                            View Attachment
                                        </a>
                                    </div>
                                )}

                                {taskDetailsModal.worker_note && (
                                    <div style={{ background: 'rgba(234, 179, 8, 0.05)', borderLeft: '4px solid #eab308', padding: '12px 15px', borderRadius: '0 8px 8px 0', marginBottom: '20px', fontSize: '0.9em' }}>
                                        <strong style={{ color: '#fde047', display: 'block', marginBottom: '4px' }}>Designer Note:</strong>
                                        <span style={{ color: 'var(--text-main)' }}>{taskDetailsModal.worker_note}</span>
                                    </div>
                                )}

                                {/* Admin Controls */}
                                <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '6px' }}>Reschedule Date</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="date" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }} />
                                            <button onClick={() => handleAdminReschedule(taskDetailsModal.id)} style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(59,130,246,0.1)'}>Update</button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAdminDelete(taskDetailsModal.id)} style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        Delete
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#60a5fa' }}>Edit Operation Details</h3>
                                
                                <div>
                                    <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Title</label>
                                    <input type="text" value={editTaskForm.title} onChange={e=>setEditTaskForm({...editTaskForm, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }} />
                                </div>
                                
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Worker Node</label>
                                        <select value={editTaskForm.employee_id} onChange={e=>setEditTaskForm({...editTaskForm, employee_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }}>
                                            {sortedWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Date</label>
                                        <input type="date" value={editTaskForm.due_date} onChange={e=>setEditTaskForm({...editTaskForm, due_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }} />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Project</label>
                                        <select value={editTaskForm.project_id} onChange={e=>setEditTaskForm({...editTaskForm, project_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }}>
                                            <option value="">No Project</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Category</label>
                                        <select value={editTaskForm.category} onChange={e=>setEditTaskForm({...editTaskForm, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }}>
                                            <option value="Other">Other</option>
                                            <option value="Graphic">Graphic</option>
                                            <option value="Video">Video</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Wage (Rs.)</label>
                                        <input type="number" value={editTaskForm.wage} onChange={e=>setEditTaskForm({...editTaskForm, wage: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Status</label>
                                        <select value={editTaskForm.status} onChange={e=>setEditTaskForm({...editTaskForm, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px' }}>
                                            <option value="Assigned">Assigned</option>
                                            <option value="In Progress">Working</option>
                                            <option value="Pending Approval">Pending</option>
                                            <option value="Having Changes">Changes</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Completed">Done</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Description</label>
                                    <textarea value={editTaskForm.description} onChange={e=>setEditTaskForm({...editTaskForm, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#fff', marginTop: '5px', minHeight: '80px', resize: 'vertical' }}></textarea>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button onClick={handleFullEditSave} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 600 }}>Save Changes</button>
                                    <button onClick={() => setIsEditingTask(false)} className="btn-secondary" style={{ padding: '12px 20px', borderRadius: '8px' }}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ============================
// WORKER OPS FLOW (spreadsheet calendar for workers)
// ============================
function WorkerOpsFlow({ tasks, onStatusUpdate, onTaskClick }) {
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const toYearMonth = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    };
    const toYearMonthDay = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 7);
    const currentYear = today.getFullYear();

    const yearsWithData = new Set([currentYear]);
    tasks.forEach(t => {
        const key = toYearMonth(t.due_date) || toYearMonth(t.created_at);
        if (key) yearsWithData.add(parseInt(key.split('-')[0]));
    });

    const allMonths = [];
    [...yearsWithData].sort().reverse().forEach(year => {
        for (let m = 12; m >= 1; m--) {
            allMonths.push(`${year}-${String(m).padStart(2, '0')}`);
        }
    });

    const [activeMonth, setActiveMonth] = useState(todayKey);
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const handlePrevMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const prevD = new Date(yr, mo - 2, 1);
        const prevStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(prevStr)) {
            allMonths.push(prevStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(prevStr);
    };

    const handleNextMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const nextD = new Date(yr, mo, 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(nextStr)) {
            allMonths.push(nextStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(nextStr);
    };

    const [pendingStatus, setPendingStatus] = useState({}); // { [taskId]: newStatus }
    const todayRowRef = useRef(null);

    useEffect(() => {
        if (todayRowRef.current) {
            setTimeout(() => {
                todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }, [activeMonth]);

    const monthTasks = tasks.filter(t => (toYearMonth(t.due_date) || toYearMonth(t.created_at)) === activeMonth);

    const dayMap = {};
    monthTasks.forEach(t => {
        const dayKey = toYearMonthDay(t.due_date) || toYearMonthDay(t.created_at);
        if (!dayKey) return;
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(t);
    });

    let maxTasksInDay = Math.max(...Object.values(dayMap).map(a => a.length), 3);

    const [y, m] = activeMonth.split('-');
    const daysInMonth = new Date(y, m, 0).getDate();

    const getStatusStyle = (status) => {
        if (status === 'Completed' || status === 'Approved') return { bg: '#059669' };
        if (status === 'Having Changes') return { bg: '#dc2626' };
        if (status === 'Pending Approval' || status === 'In Progress') return { bg: '#d97706' };
        if (status === 'Change Making') return { bg: '#8b5cf6' };
        if (status === 'Assigned') return { bg: '#0284c7' };
        return { bg: 'transparent' };
    };

    const handleStatusChange = async (taskId, newStatus) => {
        setPendingStatus(prev => ({ ...prev, [taskId]: newStatus }));
        await fetch('/api/tasks', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, status: newStatus })
        });
        setPendingStatus(prev => { const n = {...prev}; delete n[taskId]; return n; });
        if (onStatusUpdate) onStatusUpdate();
    };

    const todayDateKey = today.toISOString().split('T')[0];

    return (
        <div className="glass-panel" style={{ padding: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--panel-border)', marginBottom: '30px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: isLight ? '#ffffff' : 'rgba(15,23,42,0.4)',
                backdropFilter: 'blur(10px)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                        flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.15em',
                        fontWeight: 800,
                        color: isLight ? '#0f172a' : 'var(--header-text, var(--text-main))',
                        letterSpacing: '0.3px',
                        whiteSpace: 'nowrap'
                    }}>
                        My Operations Flow
                    </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {/* Month Navigator with Prev / Next and Dropdown */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                        borderRadius: '12px',
                        padding: '2px',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Previous Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ◀
                        </button>

                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select
                                value={activeMonth}
                                onChange={e => setActiveMonth(e.target.value)}
                                style={{
                                    padding: '7px 32px 7px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.7)',
                                    color: isLight ? '#0f172a' : '#f8fafc',
                                    fontSize: '0.92em',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    outline: 'none',
                                    minWidth: '150px',
                                    boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                    textAlign: 'center'
                                }}
                            >
                                {allMonths.map(mStr => {
                                    const [my, mm] = mStr.split('-');
                                    const mName = MONTH_NAMES[parseInt(mm)-1];
                                    return (
                                        <option
                                            key={mStr}
                                            value={mStr}
                                            style={{
                                                background: isLight ? '#ffffff' : '#1e293b',
                                                color: isLight ? '#0f172a' : '#f8fafc',
                                                fontWeight: 600,
                                                padding: '6px'
                                            }}
                                        >
                                            {mName} {my}
                                        </option>
                                    );
                                })}
                            </select>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={isLight ? '#475569' : '#94a3b8'}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Next Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ▶
                        </button>
                    </div>

                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px' }}>
                        {monthTasks.length} task{monthTasks.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: '14px 20px', textAlign: 'left', position: 'sticky', left: 0, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(10px)', zIndex: 11, minWidth: '120px', color: 'var(--text-muted)', fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)', borderRight: '1px solid var(--panel-border)' }}>Date</th>
                            <th colSpan={maxTasksInDay * 2} style={{ padding: '14px 20px', textAlign: 'center', background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(10px)', color: 'var(--text-muted)', fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)' }}>My Assigned Tasks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const dStr = String(i+1).padStart(2, '0');
                            const dayKey = `${activeMonth}-${dStr}`;
                            const dateObj = new Date(dayKey + 'T12:00:00');
                            const dayName = DAY_NAMES[dateObj.getDay()];
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                            const isToday = dayKey === todayDateKey;
                            const baseBg = isToday ? 'rgba(16,185,129,0.05)' : (isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent');
                            const tasksForDay = dayMap[dayKey] || [];

                            return (
                                <tr key={i} ref={isToday ? todayRowRef : null} style={{ background: baseBg, transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = baseBg}>
                                    <td style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', position: 'sticky', left: 0, background: isToday ? 'rgba(16,35,42,0.97)' : (isWeekend ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.8)'), backdropFilter: 'blur(10px)', zIndex: 2, color: isToday ? '#10b981' : 'var(--date-col-text, var(--text-muted))', fontWeight: isToday ? 700 : 500, fontSize: '0.88em' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.15em', fontWeight: 600 }}>{dStr}</span>
                                            <span style={{ color: isToday ? '#34d399' : 'var(--text-muted)', fontSize: '0.85em' }}>{dayName}</span>
                                            {isToday && <span style={{ fontSize: '0.7em', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>TODAY</span>}
                                        </div>
                                    </td>
                                    {Array.from({ length: maxTasksInDay }, (_, colIndex) => {
                                        const task = tasksForDay[colIndex];
                                        const currentStatus = pendingStatus[task?.id] ?? task?.status;

                                        let titleBg = 'rgba(0,0,0,0.15)';
                                        let titleColor = '#cbd5e1';
                                        let titleBorder = '1px solid rgba(255,255,255,0.04)';

                                        if (task) {
                                            titleColor = '#f8fafc';
                                            if (currentStatus === 'Having Changes') { titleBg = 'rgba(239,68,68,0.1)'; titleColor = '#fca5a5'; titleBorder = '1px solid rgba(239,68,68,0.3)'; }
                                            else if (currentStatus === 'Completed' || currentStatus === 'Approved') { titleBg = 'rgba(16,185,129,0.07)'; titleBorder = '1px solid rgba(16,185,129,0.2)'; }
                                            else if (currentStatus === 'In Progress') { titleBg = 'rgba(217,119,6,0.08)'; titleBorder = '1px solid rgba(217,119,6,0.25)'; }
                                            else if (task.due_date && toYearMonthDay(task.due_date) < todayDateKey && currentStatus !== 'Completed') { titleBg = 'rgba(239,68,68,0.06)'; titleColor = '#fca5a5'; titleBorder = '1px dashed rgba(239,68,68,0.3)'; }
                                        }

                                        return (
                                            <React.Fragment key={colIndex}>
                                                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {task ? (
                                                        <div onClick={() => onTaskClick?.(task)} style={{ padding: '8px 12px', background: titleBg, border: titleBorder, borderRadius: '8px', minWidth: '170px', maxWidth: '230px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84em', fontWeight: 500, color: titleColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: 'pointer' }} title={task.title}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                                                            {(task.description || task.attachment) && (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td style={{ padding: '8px 16px 8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {task ? (
                                                        <div style={{ position: 'relative', width: '128px' }}>
                                                            <select
                                                                value={currentStatus}
                                                                onChange={e => handleStatusChange(task.id, e.target.value)}
                                                                disabled={currentStatus === 'Approved' || currentStatus === 'Completed'}
                                                                style={{
                                                                    width: '100%', padding: '6px 22px 6px 10px',
                                                                    border: `1px solid ${getStatusStyle(currentStatus).bg}40`,
                                                                    borderRadius: '8px', fontSize: '0.78em', fontWeight: 600,
                                                                    background: `${getStatusStyle(currentStatus).bg}22`,
                                                                    color: getStatusStyle(currentStatus).bg === 'transparent' ? '#cbd5e1' : getStatusStyle(currentStatus).bg,
                                                                    outline: 'none', appearance: 'none', cursor: (currentStatus === 'Approved' || currentStatus === 'Completed') ? 'default' : 'pointer', transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <option value="Assigned" style={{ background: '#0f172a', color: '#fff' }}>Assigned</option>
                                                                <option value="In Progress" style={{ background: '#0f172a', color: '#fff' }}>Working</option>
                                                                <option value="Change Making" style={{ background: '#0f172a', color: '#fff' }}>Change Making</option>
                                                                <option value="Pending Approval" style={{ background: '#0f172a', color: '#fff' }}>Pending</option>
                                                                <option value="Completed" style={{ background: '#0f172a', color: '#fff' }}>Done</option>
                                                                {currentStatus === 'Approved' && <option value="Approved" style={{ background: '#0f172a', color: '#fff' }}>Done</option>}
                                                                {currentStatus === 'Having Changes' && <option value="Having Changes" style={{ background: '#0f172a', color: '#fff' }}>Changes!</option>}
                                                            </select>
                                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: getStatusStyle(currentStatus).bg === 'transparent' ? '#cbd5e1' : getStatusStyle(currentStatus).bg }}><path d="M1 1L5 5L9 1"/></svg>
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '128px', height: '30px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.04)' }}></div>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================
// WORKER COMPONENTS
// ============================
function WorkerDashboard({ router }) {
    const [tasks, setTasks] = useState([]);
    const [reviewTasks, setReviewTasks] = useState([]);
    const [teamTasks, setTeamTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [attendance, setAttendance] = useState({ marked: false, status: '' });
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [myProfile, setMyProfile] = useState({});
    const [myPoints, setMyPoints] = useState(null);
    const [pointDetails, setPointDetails] = useState([]);
    // Track selected status and leader per task
    const [taskState, setTaskState] = useState({}); // { [taskId]: { status, leader_id } }
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedKanbanCol, setSelectedKanbanCol] = useState('urgent');
    
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const fetchTasks = () => fetch('/api/tasks').then(r=>r.json()).then(d=>{
        setTasks(d.tasks || []);
        setReviewTasks(d.reviewTasks || []);
        setTeamTasks(d.teamTasks || []);
    });
    
    const checkAttendance = () => {
        fetch('/api/attendance').then(r=>r.json()).then(d=>{
            if(d.attendance?.attendance_date) {
                const checkDateObj = new Date(d.attendance.attendance_date);
                const checkDateStr = new Date(checkDateObj.getTime() - (checkDateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                const todayObj = new Date();
                const todayStr = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                if (checkDateStr === todayStr) {
                    setAttendance({ marked: true, status: d.attendance.attendance_status });
                }
            }
        });
    };

    useEffect(() => {
        fetchTasks();
        checkAttendance();
        fetch('/api/profile').then(r=>r.json()).then(d=>setMyProfile(d.profile || {}));
        // Fetch Team Leaders
        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            setWorkers(d.workers || []);
            const leaders = (d.workers || []).filter(w => w.position === 'Team Lead');
            setTeamLeaders(leaders);
        });
        // Fetch worker's own points
        fetch('/api/points').then(r => r.json()).then(d => {
            if (d.points && d.points.length > 0) setMyPoints(Number(d.points[0].total_points));
            else setMyPoints(0);
            if (d.details) setPointDetails(d.details.slice(0, 5));
        });
    }, []);

    const markAttendance = async (status) => {
        const res = await fetch('/api/attendance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status }) });
        if(res.ok) checkAttendance();
    };

    const updateStatus = async (taskId, e) => {
        e.preventDefault();
        const state = taskState[taskId] || {};
        
        // Handle Team Leader approval actions cleanly
        const isApprovalAction = e.nativeEvent?.submitter?.name === 'status';
        const actionStatus = isApprovalAction ? e.nativeEvent.submitter.value : null;

        const status = actionStatus || state.status || e.target.status?.value;
        const note = e.target.note?.value || '';
        const leader_id = state.leader_id || myProfile.assigned_leader_id;

        const res = await fetch('/api/tasks', {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ task_id: taskId, status, worker_note: note })
        });
        if(res.ok) {
            // If sending for approval, auto-send chat message to selected Team Leader
            if(status === 'Pending Approval' && leader_id) {
                const task = tasks.find(t => t.id === taskId);
                await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        receiver_id: leader_id,
                        message: `📋 Approval Request: I have completed the task "${task?.title}" and sent it for your review. Notes: ${note || 'No additional notes.'}`
                    })
                });
            }
            const btn = e.target.querySelector('button[type="submit"]');
            if(btn) {
                const orig = btn.innerText;
                btn.innerText = 'Synchronized ✓';
                btn.style.background = '#10b981';
                setTimeout(()=>{ btn.innerText = orig; btn.style.background = ''; }, 2000);
            }
            fetchTasks();
            setTaskState(prev => ({ ...prev, [taskId]: {} }));
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const motivationalQuotes = [
        "Let's make today amazing! 🚀",
        "Your creativity powers everything. ✨",
        "Great work starts with great energy. 💡",
        "You're building something incredible. 🏆",
        "Every task completed is a step forward. 🎯",
        "Consistency is the key to excellence. 🔑",
        "Design with passion, deliver with pride. 🎨",
        "Small progress is still progress. 🌱",
    ];
    const todayQuote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length];

    const workerName = myProfile?.name || myProfile?.username || 'Team Member';
    const pos = (myProfile?.position || '').toLowerCase();
    const isAuthorizedAssign = pos.includes('project manager') || 
        pos === 'pm' || 
        pos.includes('project director') ||
        pos.includes('strategist') ||
        pos.includes('executive') ||
        pos.includes('excecativ') ||
        pos.includes('managing director') ||
        pos === 'md' ||
        pos.includes('account manager') ||
        pos === 'am';
    const [activeTab, setActiveTab] = useState('overview');


    // Date helpers
    const todayObj = new Date();
    const todayStr = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const processDate = (ds) => {
        if (!ds) return null;
        const d = new Date(ds);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    // Get dates for today and last 2 days that actually have tasks
    const last2DaysWithTasks = (() => {
        const dates = new Set();
        tasks.forEach(t => {
            const d = processDate(t.due_date);
            if (d && d < todayStr) dates.add(d);
        });
        return [...dates].sort().reverse().slice(0, 2);
    })();

    const relevantDates = [todayStr, ...last2DaysWithTasks];

    // Status color helper
    const getStatusColor = (status) => {
        if (status === 'Completed' || status === 'Approved') return { bg: 'rgba(16,185,129,0.1)', color: '#059669', border: 'rgba(16,185,129,0.25)' };
        if (status === 'Having Changes') return { bg: 'rgba(239,68,68,0.08)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' };
        if (status === 'Change Making') return { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: 'rgba(139,92,246,0.2)' };
        if (status === 'Pending Approval') return { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: 'rgba(139,92,246,0.2)' };
        if (status === 'In Progress') return { bg: 'rgba(245,158,11,0.08)', color: '#d97706', border: 'rgba(245,158,11,0.2)' };
        return { bg: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#94a3b8', border: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)' };
    };

    const renderCompactTask = (t) => {
        const sc = getStatusColor(t.status);
        const ts = taskState[t.id] || {};
        const currentStatus = ts.status || t.status;
        const isDone = currentStatus === 'Completed' || currentStatus === 'Approved';
        return (
            <div key={t.id} onClick={() => setSelectedTask(t)} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px', borderRadius: '12px',
                background: sc.bg, border: `1px solid ${sc.border}`,
                transition: 'all 0.2s', cursor: 'pointer'
            }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.color, flexShrink: 0, boxShadow: `0 0 6px ${sc.color}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95em', color: isLight ? '#1e293b' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: '0.8em', color: isLight ? '#64748b' : '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {!isDone && (
                        <select
                            value={currentStatus}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                                setTaskState(prev => ({...prev, [t.id]: {...(prev[t.id]||{}), status: e.target.value}}));
                                fetch('/api/tasks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ task_id: t.id, status: e.target.value }) }).then(() => fetchTasks());
                            }}
                            style={{ padding: '5px 10px', fontSize: '0.78em', borderRadius: '8px', border: `1px solid ${sc.border}`, background: isLight ? '#fff' : 'rgba(0,0,0,0.3)', color: sc.color, fontWeight: 600, cursor: 'pointer' }}
                        >
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Change Making">Change Making</option>
                            <option value="Pending Approval">Send for Approval</option>
                            <option value="Completed">Completed</option>
                        </select>
                    )}
                    <span style={{ fontSize: '0.75em', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{t.status}</span>
       
               </div>
            </div>
        );
    };

    // Stats Calculations for greeting banner
    const todayWorksCount = tasks.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        const dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        return dStr === todayStr && t.status !== 'Completed' && t.status !== 'Approved';
    }).length;
    const agentWorksCount = tasks.filter(t => t.assigned_by_ai && t.status !== 'Completed' && t.status !== 'Approved').length;
    const changesCount = tasks.filter(t => t.status === 'Having Changes').length;

    const tabStyle = (tab) => ({
        padding: '10px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.88em',
        cursor: 'pointer', border: 'none', transition: 'all 0.2s',
        background: activeTab === tab
            ? (isLight ? '#3b82f6' : 'rgba(59,130,246,0.2)')
            : 'transparent',
        color: activeTab === tab
            ? (isLight ? '#ffffff' : '#60a5fa')
            : (isLight ? '#64748b' : '#94a3b8'),
        boxShadow: activeTab === tab ? '0 4px 12px rgba(59,130,246,0.25)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        whiteSpace: 'nowrap'
    });

    return (
        <div className="tasks-grid animate-slide-up">

             {/* Greeting + Points Banner (merged) */}
             <div className="dashboard-hero-banner" style={{
                 padding: '30px 35px',
                 marginBottom: '20px',
                 borderRadius: '20px',
                 background: isLight
                     ? 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.05) 100%)'
                     : 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.10) 50%, rgba(16,185,129,0.08) 100%)',
                 border: isLight ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(139,92,246,0.2)',
                 position: 'relative',
                 overflow: 'hidden',
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 flexWrap: 'wrap',
                 gap: '20px',
                 width: '100%',
                 maxWidth: '100%',
                 minWidth: 0,
                 boxSizing: 'border-box'
             }}>
                 <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(139,92,246,0.07)', pointerEvents:'none' }} />
                 <div style={{ position:'absolute', bottom:'-20px', left:'40%', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(59,130,246,0.06)', pointerEvents:'none' }} />
                 
                 {/* Left: Greeting */}
                 <div className="dashboard-hero-greeting" style={{ position:'relative', zIndex:1 }}>
                     <p style={{ margin:'0 0 4px 0', fontSize:'0.85em', color:'#7c3aed', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600 }}>
                         {new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' })}
                     </p>
                      <h1 style={{ margin:'0 0 8px 0', fontSize:'1.85em', fontWeight:800, color: 'var(--text-main)', lineHeight:1.2 }}>
                          {getGreeting()}, <span style={{ color: isLight ? '#7c3aed' : '#a78bfa', fontWeight:800 }}>{workerName}</span>! 👋
                      </h1>
                     <p style={{ margin:0, fontSize:'1.05em', color: isLight ? '#475569' : '#94a3b8', fontStyle:'italic', fontWeight:400 }}>
                         {todayQuote}
                     </p>
                 </div>

                 {/* Right: Stats & Points */}
                 <div className="worker-hero-stats-row">
                     <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                         {/* Today Works Stat */}
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '70px' }}>
                             <div style={{
                                 width: '42px',
                                 height: '42px',
                                 borderRadius: '12px',
                                 background: isLight ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.12)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '1.1em',
                                 marginBottom: '4px',
                                 border: isLight ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(59,130,246,0.25)'
                             }}>
                                 📅
                             </div>
                             <div style={{ fontSize: '1.15em', fontWeight: 800, color: isLight ? '#1e293b' : '#e2e8f0', lineHeight: 1.1 }}>{todayWorksCount}</div>
                             <div style={{ fontSize: '0.68em', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Today Works</div>
                         </div>

                         {/* Agent Works Stat */}
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '70px' }}>
                             <div style={{
                                 width: '42px',
                                 height: '42px',
                                 borderRadius: '12px',
                                 background: isLight ? 'rgba(139,92,246,0.07)' : 'rgba(139,92,246,0.12)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '1.1em',
                                 marginBottom: '4px',
                                 border: isLight ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(139,92,246,0.25)'
                             }}>
                                 🤖
                             </div>
                             <div style={{ fontSize: '1.15em', fontWeight: 800, color: isLight ? '#1e293b' : '#e2e8f0', lineHeight: 1.1 }}>{agentWorksCount}</div>
                             <div style={{ fontSize: '0.68em', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Agent Works</div>
                         </div>

                         {/* Changes Stat */}
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '70px' }}>
                             <div style={{
                                 width: '42px',
                                 height: '42px',
                                 borderRadius: '12px',
                                 background: isLight ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.12)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '1.1em',
                                 marginBottom: '4px',
                                 border: isLight ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(239,68,68,0.25)'
                             }}>
                                 ⚠️
                             </div>
                             <div style={{ fontSize: '1.15em', fontWeight: 800, color: isLight ? '#1e293b' : '#e2e8f0', lineHeight: 1.1 }}>{changesCount}</div>
                             <div style={{ fontSize: '0.68em', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Changes</div>
                         </div>
                     </div>

                     {/* Points block (only for workers with points) */}
                     {!isAuthorizedAssign && myPoints !== null && myPoints > 0 && (
                         <>
                             <div className="worker-hero-divider" style={{ width: '1px', height: '42px', background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
                             <div className="worker-hero-points" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: isLight ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.08)', borderRadius: '12px', padding: '10px 16px', border: '1px solid rgba(16,185,129,0.15)' }}>
                                 <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg, #10b981, #3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1em' }}>🏆</div>
                                 <div>
                                     <p style={{ margin:0, fontSize:'0.65em', color:'#10b981', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700 }}>My Points</p>
                                     <h2 style={{ margin:'2px 0 0 0', fontSize:'1.4em', color: isLight ? '#059669' : '#10b981', fontWeight:800, lineHeight:1 }}>
                                         {Number(myPoints).toFixed(1)}
                                         <span style={{ fontSize:'0.45em', color:'#6ee7b7', marginLeft:'4px', fontWeight:500 }}>PTS</span>
                                     </h2>
                                 </div>
                             </div>
                         </>
                     )}
                 </div>
             </div>

             {/* Tab Navigation */}
             <div className="worker-tabs-bar" style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                 <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>
                     <span className="tab-text-desktop">📂 Today's Operations</span>
                     <span className="tab-text-mobile">📂 Today</span>
                 </button>
                 <button style={tabStyle('flow')} onClick={() => setActiveTab('flow')}>
                     <span className="tab-text-desktop">🗓️ Operations Flow</span>
                     <span className="tab-text-mobile">🗓️ Flow</span>
                 </button>
                 <button style={tabStyle('calendar')} onClick={() => setActiveTab('calendar')}>
                     <span className="tab-text-desktop">📅 Calendar View</span>
                     <span className="tab-text-mobile">📅 Calendar</span>
                 </button>
                 {isAuthorizedAssign && (
                     <button style={tabStyle('team')} onClick={() => setActiveTab('team')}>
                         <span className="tab-text-desktop">👥 Team Operations</span>
                         <span className="tab-text-mobile">👥 Team</span>
                     </button>
                 )}
             </div>

             {/* ── FLOW BOARD TAB ── */}
             {activeTab === 'flow' && (
                 <MonthlyOpsViewer tasks={tasks} fetchData={fetchTasks} workers={workers} />
             )}

             {/* ── TEAM BOARD TAB ── */}
             {activeTab === 'team' && isAuthorizedAssign && (
                 <MonthlyOpsViewer tasks={teamTasks} fetchData={fetchTasks} workers={workers} />
             )}

             {/* ── CALENDAR TAB ── */}
             {activeTab === 'calendar' && (
                 <WorkerOpsFlow tasks={tasks} onStatusUpdate={fetchTasks} onTaskClick={setSelectedTask} />
             )}

             {/* Dynamic Task Detail Modal Overlay */}
             {selectedTask && (
                 <div style={{
                     position: 'fixed',
                     top: 0,
                     left: 0,
                     right: 0,
                     bottom: 0,
                     background: 'rgba(15,23,42,0.65)',
                     backdropFilter: 'blur(8px)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     zIndex: 1000,
                     padding: '20px',
                     animation: 'fadeIn 0.2s ease-out'
                 }}
                 onClick={() => setSelectedTask(null)}
                 >
                     <div style={{
                         width: '100%',
                         maxWidth: '600px',
                         background: isLight ? '#ffffff' : 'rgba(30,41,59,0.95)',
                         border: '1px solid var(--panel-border)',
                         borderRadius: '24px',
                         boxShadow: 'var(--card-shadow), 0 20px 25px -5px rgba(0,0,0,0.1)',
                         padding: '30px',
                         position: 'relative',
                         animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                         color: 'var(--text-main)'
                     }}
                     onClick={e => e.stopPropagation()}
                     >
                         {/* Close button */}
                         <button 
                             onClick={() => setSelectedTask(null)}
                             style={{
                                 position: 'absolute',
                                 top: '20px',
                                 right: '20px',
                                 background: 'none',
                                 border: 'none',
                                 color: 'var(--text-muted)',
                                 cursor: 'pointer',
                                 fontSize: '1.5em',
                                 fontWeight: 'bold',
                                 transition: 'color 0.2s'
                             }}
                             onMouseEnter={e => e.target.style.color = '#ef4444'}
                             onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                         >
                             &times;
                         </button>

                         {/* Title & Badge */}
                         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '15px', marginBottom: '20px', paddingRight: '20px' }}>
                             <div>
                                 <span style={{
                                     fontSize: '0.75em',
                                     fontWeight: 700,
                                     padding: '4px 10px',
                                     borderRadius: '20px',
                                     background: selectedTask.is_urgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                     color: selectedTask.is_urgent ? '#ef4444' : '#3b82f6',
                                     border: `1px solid ${selectedTask.is_urgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                     textTransform: 'uppercase',
                                     letterSpacing: '0.5px'
                                 }}>
                                     {selectedTask.is_urgent ? '🚨 Urgent Operation' : '📋 Task details'}
                                 </span>
                                 <h2 style={{ margin: '10px 0 0 0', fontSize: '1.6em', fontWeight: 800, lineHeight: 1.2 }}>
                                     {selectedTask.title}
                                 </h2>
                             </div>
                         </div>

                         {/* Description & Execution Parameters */}
                         <div style={{ marginBottom: '24px' }}>
                             <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                 Work Contents
                             </h4>
                             <div style={{
                                 padding: '16px',
                                 borderRadius: '12px',
                                 background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.2)',
                                 border: '1px solid var(--panel-border)',
                                 fontSize: '0.9em',
                                 lineHeight: 1.5,
                                 color: 'var(--text-main)',
                                 whiteSpace: 'pre-wrap'
                             }}>
                                 {selectedTask.description || 'No detailed instructions provided.'}
                             </div>
                         </div>

                         {/* Task Details Meta Grid */}
                         <div style={{
                             display: 'grid',
                             gridTemplateColumns: '1fr 1fr',
                             gap: '16px',
                             marginBottom: '24px',
                             fontSize: '0.85em'
                         }}>
                             <div>
                                 <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assigner</span>
                                 <strong style={{ color: 'var(--text-main)' }}>
                                     {selectedTask.assigned_by_ai ? '🤖 AI' : selectedTask.assigner_name || 'Admin'}
                                 </strong>
                             </div>
                             <div>
                                 <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</span>
                                 <strong style={{ color: 'var(--text-main)' }}>{selectedTask.category || 'Other'}</strong>
                             </div>
                             <div>
                                 <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Deadline</span>
                                 <strong style={{ color: 'var(--text-main)' }}>
                                     {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No deadline'}
                                 </strong>
                             </div>
                             <div>
                                 <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Compensation / Wage</span>
                                 <strong style={{ color: '#10b981' }}>Rs. {selectedTask.wage || '0'}</strong>
                             </div>
                         </div>

                         {/* Attachments Section */}
                         <div style={{ marginBottom: '24px' }}>
                             <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                 Attachment
                             </h4>
                             {selectedTask.attachment ? (
                                 <div style={{
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'space-between',
                                     padding: '12px 16px',
                                     borderRadius: '12px',
                                     background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.04)',
                                     border: '1px solid rgba(16, 185, 129, 0.2)',
                                     fontSize: '0.9em'
                                 }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                         <span style={{ fontSize: '1.2em' }}>📁</span>
                                         <span style={{
                                             fontWeight: 600,
                                             color: 'var(--text-main)',
                                             overflow: 'hidden',
                                             textOverflow: 'ellipsis',
                                             whiteSpace: 'nowrap'
                                         }}>
                                             {selectedTask.attachment.split('/').pop()}
                                         </span>
                                     </div>
                                     <a
                                         href={selectedTask.attachment}
                                         download
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         style={{
                                             padding: '6px 12px',
                                             background: 'linear-gradient(135deg, #10b981, #059669)',
                                             color: '#fff',
                                             borderRadius: '8px',
                                             fontSize: '0.8em',
                                             fontWeight: 700,
                                             textDecoration: 'none',
                                             transition: 'transform 0.2s',
                                             display: 'inline-flex',
                                             alignItems: 'center',
                                             gap: '4px'
                                         }}
                                         onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                         onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                     >
                                         Download 📥
                                     </a>
                                 </div>
                             ) : (
                                 <div style={{
                                     padding: '12px 16px',
                                     borderRadius: '12px',
                                     background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.1)',
                                     border: '1px dashed var(--panel-border)',
                                     fontSize: '0.85em',
                                     color: 'var(--text-muted)',
                                     textAlign: 'center'
                                 }}>
                                     No payload / attachments deployed with this operation.
                                 </div>
                             )}
                         </div>

                         {/* Status Update inline dropdown */}
                         <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
                             <span style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
                             <select
                                 value={taskState[selectedTask.id]?.status || selectedTask.status}
                                 onChange={async (e) => {
                                     const newStatus = e.target.value;
                                     await handleKanbanStatus(selectedTask.id, newStatus);
                                     setSelectedTask(prev => ({ ...prev, status: newStatus }));
                                 }}
                                 style={{
                                     flex: 1,
                                     padding: '8px 12px',
                                     fontSize: '0.85em',
                                     borderRadius: '10px',
                                     border: '1px solid var(--panel-border)',
                                     background: 'var(--input-bg)',
                                     color: 'var(--text-main)',
                                     fontWeight: 600,
                                     cursor: 'pointer'
                                 }}
                             >
                                 <option value="Assigned">📌 Assigned</option>
                                 <option value="In Progress">⚡ In Progress</option>
                                 <option value="Change Making">🛠️ Change Making</option>
                                 <option value="Pending Approval">🔔 Send for Approval</option>
                                 <option value="Completed">Completed</option>
                             </select>
                         </div>

                     </div>
                 </div>
             )}

             {/* ── KANBAN BOARD TAB ── */}
             {activeTab === 'overview' && (() => {
                  const columns = [
                       { id: 'urgent',           label: 'Urgent Works',     shortLabel: 'Urgent',   emoji: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
                       { id: 'Assigned',         label: 'Assigned',         shortLabel: 'Assigned', emoji: '📌', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
                       { id: 'In Progress',      label: 'In Progress',      shortLabel: 'Progress', emoji: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                       { id: 'Pending Approval', label: 'Pending Approval', shortLabel: 'Pending',  emoji: '🔔', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
                   ];

                 const getColTasks = (colId) => {
                      if (colId === 'urgent') {
                          return tasks.filter(t => {
                              const status = taskState[t.id]?.status || t.status;
                              return t.is_urgent && (status === 'Assigned' || !status);
                          });
                      }
                      return tasks.filter(t => {
                          const status = taskState[t.id]?.status || t.status;
                          if (colId === 'In Progress') {
                              return (status === 'In Progress' || status === 'Change Making' || status === 'Having Changes');
                          }
                          if (colId === 'Pending Approval') {
                              return status === 'Pending Approval';
                          }
                          return status === colId && !t.is_urgent;
                      });
                  };

                 const handleKanbanStatus = async (taskId, newStatus) => {
                     setTaskState(prev => ({...prev, [taskId]: {...(prev[taskId]||{}), status: newStatus}}));
                     await fetch('/api/tasks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ task_id: taskId, status: newStatus }) });
                     fetchTasks();
                 };

                 const processDateLocal = (ds) => {
                     if (!ds) return null;
                     const d = new Date(ds);
                     return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                 };
                 const todayLocal = new Date();
                 const todayLocalStr = new Date(todayLocal.getTime() - (todayLocal.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

                   const renderKanbanCard = (t, col) => {
                       const dueDate = processDateLocal(t.due_date);
                       const isOverdue = dueDate && dueDate < todayLocalStr && t.status !== 'Completed' && t.status !== 'Approved';
                       const isDueToday = dueDate === todayLocalStr;
                       const isDone = t.status === 'Completed' || t.status === 'Approved';
                       return (
                            <div key={t.id} onClick={() => setSelectedTask(t)}
                                style={{
                                    padding:'14px',
                                    borderRadius:'14px',
                                    background: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
                                    border: t.is_urgent 
                                        ? '1px solid rgba(239,68,68,0.5)' 
                                        : (isOverdue ? '1px solid rgba(239,68,68,0.4)' : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'}`),
                                    boxShadow: t.is_urgent
                                        ? (isLight ? '0 2px 10px rgba(239,68,68,0.1)' : '0 0 14px rgba(239,68,68,0.2)')
                                        : (isLight ? '0 1px 6px rgba(0,0,0,0.05)' : 'none'),
                                    transition:'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                                    opacity: isDone ? 0.75 : 1,
                                    cursor: 'pointer',
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    boxSizing: 'border-box',
                                    overflow: 'hidden'
                                }}
                               onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                               onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                           >
                               <div style={{ marginBottom:'8px' }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                       <div style={{ fontWeight:700, fontSize:'0.92em', color: isLight ? '#1e293b' : '#e2e8f0', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.35, wordBreak: 'break-word' }}>{t.title}</div>
                                       {t.is_urgent && (
                                           <span style={{
                                               fontSize: '0.65em',
                                               fontWeight: 800,
                                               color: '#ef4444',
                                               background: 'rgba(239,68,68,0.12)',
                                               border: '1px solid rgba(239,68,68,0.3)',
                                               padding: '3px 7px',
                                               borderRadius: '6px',
                                               textTransform: 'uppercase',
                                               letterSpacing: '0.5px',
                                               display: 'inline-flex',
                                               alignItems: 'center',
                                               gap: '3px',
                                               flexShrink: 0
                                           }}>
                                               🚨 Urgent
                                           </span>
                                       )}
                                   </div>
                                   {t.description && <div style={{ fontSize:'0.76em', color:'var(--text-muted)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', marginBottom:'6px', wordBreak: 'break-word', lineHeight: 1.4 }}>{t.description}</div>}
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74em', color: 'var(--text-muted)', marginTop: '6px', flexWrap: 'wrap' }}>
                                       <span style={{ fontWeight: 600 }}>Agent:</span>
                                       <span style={{
                                           padding: '2px 8px',
                                           borderRadius: '6px',
                                           background: t.assigned_by_ai ? 'rgba(139,92,246,0.1)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'),
                                           color: t.assigned_by_ai ? '#8b5cf6' : (isLight ? '#475569' : '#cbd5e1'),
                                           fontWeight: 600,
                                           display: 'inline-flex',
                                           alignItems: 'center',
                                           gap: '4px',
                                           maxWidth: '100%',
                                           overflow: 'hidden',
                                           textOverflow: 'ellipsis',
                                           whiteSpace: 'nowrap'
                                       }}>
                                           {t.assigned_by_ai ? '🤖 AI Agent' : `👤 ${t.assigner_name || 'Admin'}`}
                                       </span>
                                   </div>
                               </div>
                               {dueDate && (
                                   <div style={{ fontSize:'0.72em', fontWeight:600, padding:'3px 8px', borderRadius:'6px', display:'inline-flex', alignItems:'center', gap:'4px', marginBottom:'10px', background: isOverdue ? 'rgba(239,68,68,0.1)' : isDueToday ? 'rgba(245,158,11,0.1)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'), color: isOverdue ? '#dc2626' : isDueToday ? '#d97706' : 'var(--text-muted)' }}>
                                       {isOverdue ? '⚠️ Overdue' : isDueToday ? '🔴 Today' : `📅 ${new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'})}`}
                                   </div>
                               )}
                               {!isDone ? (
                                   <select value={taskState[t.id]?.status || t.status} onClick={e => e.stopPropagation()} onChange={e => handleKanbanStatus(t.id, e.target.value)}
                                       style={{ width:'100%', padding:'7px 10px', fontSize:'0.8em', borderRadius:'8px', border:`1px solid ${col.border}`, background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.3)', color: col.color, fontWeight:600, cursor:'pointer', outline:'none' }}>
                                       <option value="Assigned">📌 Assigned</option>
                                       <option value="In Progress">⚡ In Progress</option>
                                       <option value="Change Making">🛠️ Change Making</option>
                                       <option value="Pending Approval">🔔 Send for Approval</option>
                                       <option value="Completed">✅ Completed</option>
                                   </select>
                               ) : (
                                   <div style={{ fontSize:'0.76em', fontWeight:600, color: t.status === 'Approved' ? '#0284c7' : '#059669' }}>
                                       {t.status === 'Approved' ? '✓ Approved' : '✓ Completed'}
                                   </div>
                               )}
                           </div>
                      );
                  };

                  return (
                      <div style={{ display:'flex', flexDirection:'column', gap:'16px', width: '100%' }}>
                          {/* Review requests strip */}
                          {reviewTasks && reviewTasks.length > 0 && (
                              <div className="glass-panel" style={{ padding:'16px 22px', border:'1px solid rgba(139,92,246,0.3)', background:'rgba(139,92,246,0.04)', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                                  <span>🔔</span>
                                  <strong style={{ color:'#a855f7', fontSize:'0.92em' }}>Approval Requests ({reviewTasks.length})</strong>
                                  <span style={{ color:'var(--text-muted)', fontSize:'0.82em' }}>— {reviewTasks.map(t => t.worker_name).join(', ')}</span>
                                  <div style={{ marginLeft:'auto', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                                      {reviewTasks.slice(0,2).map(t => (
                                          <div key={t.id} style={{ display:'flex', gap:'6px', alignItems:'center', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', padding:'6px 12px', borderRadius:'10px', border:'1px solid rgba(139,92,246,0.2)' }}>
                                              <span style={{ fontSize:'0.82em', fontWeight:600, color: isLight ? '#1e293b' : '#e2e8f0' }}>{t.title}</span>
                                              <form onSubmit={e => updateStatus(t.id, e)} style={{ display:'flex', gap:'4px', margin:0 }}>
                                                  <input name="note" type="hidden" value="" readOnly />
                                                  <button type="submit" name="status" value="Having Changes" style={{ padding:'3px 8px', fontSize:'0.72em', borderRadius:'6px', border:'1px solid rgba(249,115,22,0.4)', background:'rgba(249,115,22,0.08)', color:'#ea580c', cursor:'pointer' }}>↩ Changes</button>
                                                  <button type="submit" name="status" value="Approved" style={{ padding:'3px 8px', fontSize:'0.72em', borderRadius:'6px', border:'none', background:'#0ea5e9', color:'#fff', cursor:'pointer' }}>✓ Approve</button>
                                              </form>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Desktop Kanban Board (>= 769px) */}
                          <div className="worker-kanban-desktop">
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'14px', alignItems:'start' }}>
                                  {columns.map(col => {
                                      const colTasks = getColTasks(col.id);
                                      return (
                                          <div key={col.id} className="worker-kanban-col">
                                              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'12px', background: col.bg, border:`1px solid ${col.border}` }}>
                                                  <span>{col.emoji}</span>
                                                  <span style={{ fontWeight:700, fontSize:'0.86em', color: col.color }}>{col.label}</span>
                                                  <span style={{ marginLeft:'auto', minWidth:'22px', height:'22px', borderRadius:'50%', background: col.color, color:'#fff', fontSize:'0.72em', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{colTasks.length}</span>
                                              </div>

                                              <div style={{ display:'flex', flexDirection:'column', gap:'8px', minHeight:'60px' }}>
                                                  {colTasks.length === 0 && (
                                                      <div style={{ padding:'20px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8em', borderRadius:'12px', border:`1px dashed ${col.border}`, background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>No tasks</div>
                                                  )}
                                                  {colTasks.map(t => renderKanbanCard(t, col))}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                           {/* Mobile App Kanban View (<= 768px) */}
                           <div className="worker-kanban-mobile" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                               {/* Segmented Column Switcher Tabs */}
                               <div className="worker-kanban-mobile-tabs" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                   {columns.map(col => {
                                       const colTasks = getColTasks(col.id);
                                       const isActive = (selectedKanbanCol || 'urgent') === col.id;
                                       return (
                                           <button
                                               key={col.id}
                                               type="button"
                                               onClick={() => setSelectedKanbanCol(col.id)}
                                               className={`worker-kanban-tab-btn ${isActive ? 'active' : ''}`}
                                               style={{
                                                   background: isActive ? col.bg : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'),
                                                   border: `1.5px solid ${isActive ? col.color : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)')}`,
                                                   color: isActive ? col.color : 'var(--text-muted)',
                                                   boxShadow: isActive ? `0 2px 10px ${col.border}` : 'none',
                                               }}
                                           >
                                               <span style={{ fontSize: '1.05em' }}>{col.emoji}</span>
                                               <span style={{ fontWeight: 700 }}>{col.shortLabel || col.label}</span>
                                               <span style={{
                                                   minWidth: '20px',
                                                   height: '20px',
                                                   borderRadius: '10px',
                                                   background: isActive ? col.color : (isLight ? '#94a3b8' : 'rgba(255,255,255,0.2)'),
                                                   color: '#fff',
                                                   fontSize: '0.75em',
                                                   fontWeight: 800,
                                                   display: 'inline-flex',
                                                   alignItems: 'center',
                                                   justifyContent: 'center',
                                                   padding: '0 5px'
                                               }}>
                                                   {colTasks.length}
                                               </span>
                                           </button>
                                       );
                                   })}
                               </div>

                               {/* Selected Column Task Cards (Full Width, 100% Native App Feel) */}
                               {(() => {
                                   const activeColObj = columns.find(c => c.id === (selectedKanbanCol || 'urgent')) || columns[0];
                                   const activeColTasks = getColTasks(activeColObj.id);
                                   return (
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                          {activeColTasks.length === 0 ? (
                                              <div style={{
                                                  padding: '36px 20px',
                                                  textAlign: 'center',
                                                  color: 'var(--text-muted)',
                                                  fontSize: '0.88em',
                                                  borderRadius: '16px',
                                                  border: `1.5px dashed ${activeColObj.border}`,
                                                  background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'
                                              }}>
                                                  <div style={{ fontSize: '1.8em', marginBottom: '8px' }}>{activeColObj.emoji}</div>
                                                  <div>No operations currently in <strong>{activeColObj.label}</strong></div>
                                              </div>
                                          ) : (
                                              activeColTasks.map(t => renderKanbanCard(t, activeColObj))
                                          )}
                                      </div>
                                  );
                              })()}
                          </div>

                          {tasks.length === 0 && (
                              <div className="glass-panel" style={{ padding:'50px', textAlign:'center' }}>
                                  <p style={{ color:'var(--text-muted)', fontSize:'1.1em' }}>No operations currently assigned.</p>
                              </div>
                          )}
                      </div>
                  );
             })()}

             {/* ── OPERATIONS FLOW TAB ── */}
             {activeTab === 'flow' && (
                 <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                     <WorkerOpsFlow tasks={tasks} onStatusUpdate={fetchTasks} onTaskClick={setSelectedTask} />
                 </div>
             )}

             {/* ── CALENDAR VIEW TAB ── */}
             {activeTab === 'calendar' && (
                 <div style={{ marginBottom: '30px' }}>
                     <CalendarView tasks={tasks} workers={[]} onSelectTask={(t) => setSelectedTask(t)} isAdmin={false} isLight={isLight} />
                 </div>
             )}

        </div>
    );
}

// ============================
// CALENDAR VIEW COMPONENT
// ============================
function CalendarView({ tasks = [], workers = [], onSelectTask, isAdmin = false, isLight = false }) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => todayStr);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const toYMD = (dStr) => {
        if (!dStr) return '';
        if (typeof dStr === 'string' && dStr.includes('T')) return dStr.split('T')[0];
        if (typeof dStr === 'string' && dStr.length === 10) return dStr;
        const d = new Date(dStr);
        if (isNaN(d)) return '';
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    // Filter tasks for selected date
    const dateWorks = tasks.filter(t => toYMD(t.due_date) === selectedDate);

    const selectedHoliday = SRI_LANKAN_HOLIDAYS.find(h => h.date === selectedDate);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const todayMonth = () => {
        const t = new Date();
        setCurrentDate(t);
        setSelectedDate(t.toISOString().slice(0, 10));
    };

    const getCatColor = (cat) => {
        if (cat === 'Graphic') return '#a855f7';
        if (cat === 'Video') return '#ef4444';
        if (cat === 'Content') return '#10b981';
        return '#3b82f6';
    };

    const renderCalendarGrid = () => {
        const cells = [];
        for (let i = 0; i < firstDayIndex; i++) {
            cells.push(
                <div key={`empty-${i}`} style={{ background: isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.01)', minHeight: '100px', borderRadius: '12px', border: '1px solid var(--panel-border)', opacity: 0.3 }} />
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const cellDateStr = `${year}-${mStr}-${dStr}`;
            
            const isToday = cellDateStr === todayStr;
            const isSelected = cellDateStr === selectedDate;
            const holiday = SRI_LANKAN_HOLIDAYS.find(h => h.date === cellDateStr);

            const dayTasks = tasks.filter(t => toYMD(t.due_date) === cellDateStr);

            cells.push(
                <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDate(cellDateStr)}
                    style={{
                        minHeight: '110px',
                        padding: '8px',
                        borderRadius: '12px',
                        background: isSelected 
                            ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.18)') 
                            : (isToday ? (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)') : 'var(--card-inner-bg, rgba(0,0,0,0.15))'),
                        border: isSelected 
                            ? '2px solid #3b82f6' 
                            : (isToday ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--panel-border)'),
                        boxShadow: isSelected ? '0 0 14px rgba(59, 130, 246, 0.3)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{
                                fontSize: '0.85em',
                                fontWeight: isToday || isSelected ? 800 : 600,
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isToday ? '#3b82f6' : (isSelected ? 'rgba(59,130,246,0.25)' : 'transparent'),
                                color: isToday ? '#fff' : (isSelected ? '#60a5fa' : 'var(--text-main)')
                            }}>
                                {day}
                            </span>
                            {holiday && (
                                <span title={holiday.reason} style={{ fontSize: '0.75em' }}>
                                    {holiday.type === 'poya' ? '🌕' : '🇱🇰'}
                                </span>
                            )}
                        </div>

                        {/* Task Chips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {dayTasks.slice(0, 2).map((t, idx) => {
                                const catColor = getCatColor(t.category);
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            fontSize: '0.68em',
                                            fontWeight: 600,
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: `${catColor}20`,
                                            color: catColor,
                                            border: `1px solid ${catColor}40`,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                        title={t.title}
                                    >
                                        {t.title}
                                    </div>
                                );
                            })}
                            {dayTasks.length > 2 && (
                                <span style={{ fontSize: '0.64em', fontWeight: 700, color: '#3b82f6', marginTop: '2px' }}>
                                    +{dayTasks.length - 2} more...
                                </span>
                            )}
                        </div>
                    </div>

                    {dayTasks.length > 0 && (
                        <div style={{ fontSize: '0.68em', fontWeight: 700, color: '#10b981', alignSelf: 'flex-end', marginTop: '4px' }}>
                            {dayTasks.length} Work{dayTasks.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            );
        }

        return cells;
    };

    return (
        <div className="animate-slide-up" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Left Side: Calendar Grid */}
            <div className="glass-panel" style={{ flex: '1 1 650px', padding: '24px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
                {/* Header Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4em', fontWeight: 800, color: 'var(--text-main)' }}>
                            📅 {monthName}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={prevMonth} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85em' }}>Previous</button>
                        <button onClick={todayMonth} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85em', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>Today</button>
                        <button onClick={nextMonth} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85em' }}>Next</button>
                    </div>
                </div>

                {/* Day Names Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '10px', textAlign: 'center' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <div key={d} style={{ fontSize: '0.78em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: i === 0 ? '#ef4444' : 'var(--text-muted)' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                    {renderCalendarGrid()}
                </div>
            </div>

            {/* Right Side: Selected Date Works Panel */}
            <div className="glass-panel" style={{ width: '360px', flexShrink: 0, padding: '24px', borderRadius: '20px', border: '1px solid var(--panel-border)', minHeight: '450px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                    <div style={{ fontSize: '0.75em', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Selected Date
                    </div>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25em', fontWeight: 800, color: '#3b82f6' }}>
                        📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    {selectedHoliday && (
                        <div style={{ marginTop: '8px', fontSize: '0.8em', fontWeight: 700, color: selectedHoliday.type === 'poya' ? '#a855f7' : '#ef4444', background: selectedHoliday.type === 'poya' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(239, 68, 68, 0.12)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${selectedHoliday.type === 'poya' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'inline-block' }}>
                            {selectedHoliday.type === 'poya' ? '🌕 Poya: ' : '🇱🇰 Holiday: '}{selectedHoliday.reason}
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88em', fontWeight: 700, color: 'var(--text-main)' }}>
                            Works for this date
                        </span>
                        <span style={{ fontSize: '0.75em', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                            {dateWorks.length}
                        </span>
                    </div>

                    {dateWorks.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '14px', fontSize: '0.88em' }}>
                            No works scheduled for this date. ☀️
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                            {dateWorks.map(t => {
                                const catColor = getCatColor(t.category);
                                const assignedWorker = workers.find(w => w.id === t.employee_id);
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => onSelectTask && onSelectTask(t)}
                                        style={{
                                            background: 'var(--card-inner-bg, rgba(0,0,0,0.15))',
                                            border: '1px solid var(--card-inner-border, rgba(255,255,255,0.04))',
                                            padding: '16px',
                                            borderRadius: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-inner-border, rgba(255,255,255,0.04))'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7em', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>
                                                {t.category || 'Other'}
                                            </span>
                                            <span style={{ fontSize: '0.7em', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                {t.status}
                                            </span>
                                        </div>

                                        <h4 style={{ margin: 0, fontSize: '1em', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {t.title}
                                        </h4>

                                        {isAdmin && assignedWorker && (
                                            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--panel-border)', paddingTop: '8px', marginTop: '2px' }}>
                                                <SafeAvatar src={assignedWorker.profile_picture} name={assignedWorker.name} size={22} />
                                                <span>{assignedWorker.name}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
