'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { ShieldCheck, UserCheck, AlertTriangle, Briefcase, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth').then(r=>r.json()).then(d=>{
      if(!d.authenticated) router.push('/login');
      else { setUser(d.user); setLoading(false); }
    });
  }, []);

  if(loading) return <div style={{textAlign:'center', marginTop:'100px'}}>Establishing Secure Connection...</div>;

  return (
    <AppLayout user={user}>
        {user.role === 'admin' ? <AdminDashboard router={router} /> : <WorkerDashboard router={router} />}
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

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            const allWorkers = d.workers || [];
            setWorkers(allWorkers);
            setTeamLeaders(allWorkers.filter(w => w.position === 'Team Lead'));
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

    useEffect(() => { fetchData(); }, []);

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
                            <div key={t.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '1.05em', color: '#e2e8f0', marginBottom: '4px' }}>{t.title}</div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Submitted by <strong style={{ color: '#f8fafc' }}>{t.worker_name}</strong>
                                        {t.worker_note && <> — Notes: <em style={{ color: '#cbd5e1' }}>{t.worker_note}</em></>}
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

            {/* This Month's Operations Dashboard */}
            {(() => {
                const todayObj = new Date();
                const currentMonthStr = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
                const processDateMonth = (dateString) => {
                    if (!dateString) return null;
                    const d = new Date(dateString);
                    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
                };
                const thisMonthTasks = tasks.filter(t => processDateMonth(t.due_date) === currentMonthStr || processDateMonth(t.created_at) === currentMonthStr);
                
                return (
                    <div className="glass-panel" style={{ padding: '30px', marginBottom: '40px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4em', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            📅 This Month's Operations ({thisMonthTasks.length})
                        </h3>
                        {thisMonthTasks.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No operations active this month.</p>
                        ) : (
                            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase', textAlign: 'left', backdropFilter: 'blur(10px)' }}>
                                            <th style={{ padding: '12px 15px', borderRadius: '10px 0 0 10px' }}>Task Title</th>
                                            <th style={{ padding: '12px 15px' }}>Assigned To</th>
                                            <th style={{ padding: '12px 15px' }}>Due Date</th>
                                            <th style={{ padding: '12px 15px', borderRadius: '0 10px 10px 0' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {thisMonthTasks.map(t => {
                                            const sc = t.status==='Completed'?'#10b981':(t.status==='Approved'?'#0ea5e9':(t.status==='Pending Approval'?'#f59e0b':(t.status==='In Progress'?'#3b82f6':'#64748b')));
                                            return (
                                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': {background: 'rgba(255,255,255,0.02)'} }}>
                                                    <td style={{ padding: '15px' }}>
                                                        <strong style={{ color: '#e2e8f0', fontSize: '0.95em' }}>{t.title}</strong>
                                                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{t.description?.substring(0, 50)}{t.description?.length > 50 ? '...' : ''}</div>
                                                    </td>
                                                    <td style={{ padding: '15px', color: '#cbd5e1', fontSize: '0.9em' }}>{t.worker_name || 'Unassigned'}</td>
                                                    <td style={{ padding: '15px', color: '#f8fafc', fontSize: '0.9em' }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.8em', fontWeight: 600, background: `${sc}20`, color: sc, border: `1px solid ${sc}40`, whiteSpace: 'nowrap' }}>
                                                            {t.status}
                                                        </span>
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
            })()}

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
            <h3 style={{marginBottom:'20px'}}>Active Node Network (Workers)</h3>
            <div className="workers-grid">
                {workers.map(w => (
                    <div key={w.id} className="glass-panel" style={{ padding: '25px', display:'flex', flexDirection:'column' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px', borderBottom:'1px solid var(--panel-border)', paddingBottom:'20px' }}>
                            <img src={(w.profile_picture && w.profile_picture !== 'default.png') ? w.profile_picture : `https://via.placeholder.com/50?text=${w.name.charAt(0)}`} onError={(e)=>{e.target.onerror=null; e.target.src=`https://via.placeholder.com/50?text=${w.name.charAt(0)}`}} style={{width:'50px', height:'50px', borderRadius:'14px', objectFit:'cover', border:'1px solid var(--panel-border)'}} />
                            <div style={{flex: 1}}>
                                <h3 style={{margin:0, fontSize:'1.1em', color:'var(--text-main)'}}>{w.name}</h3>
                                <p style={{margin:0, fontSize:'0.85em', color:'var(--text-muted)', marginBottom:'4px'}}>{w.position}</p>
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

                        <h4 style={{margin:'0 0 12px 0', color:'#cbd5e1', fontSize:'0.9em', textTransform:'uppercase', letterSpacing:'0.5px'}}>Active Operations</h4>
                        <div style={{flex:1, display:'flex', flexDirection:'column', gap:'10px'}}>
                            {tasks.filter(t=>t.employee_id === w.id).length === 0 && <p style={{color:'#64748b', fontSize:'0.85em'}}>No operations assigned.</p>}
                            {tasks.filter(t=>t.employee_id === w.id).map(t => {
                                const sc = t.status==='Completed'?'status-completed':(t.status==='Approved'?'status-approved':(t.status==='Pending Approval'?'status-pending':(t.status==='In Progress'?'status-progress':'status-assigned')));
                                return (
                                <div key={t.id} style={{ background:'rgba(0,0,0,0.2)', padding:'14px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.03)'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px'}}>
                                        <strong style={{color:'#e2e8f0', fontSize:'1em'}}>{t.title}</strong>
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
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================
// WORKER COMPONENTS
// ============================
function WorkerDashboard({ router }) {
    const [tasks, setTasks] = useState([]);
    const [attendance, setAttendance] = useState({ marked: false, status: '' });
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [myProfile, setMyProfile] = useState({});
    // Track selected status and leader per task
    const [taskState, setTaskState] = useState({}); // { [taskId]: { status, leader_id } }
    
    const fetchTasks = () => fetch('/api/tasks').then(r=>r.json()).then(d=>setTasks(d.tasks || []));
    
    const checkAttendance = () => {
        fetch('/api/attendance').then(r=>r.json()).then(d=>{
            if(d.attendance?.attendance_date && new Date(d.attendance.attendance_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
                setAttendance({ marked: true, status: d.attendance.attendance_status });
            }
        });
    };

    useEffect(() => {
        fetchTasks();
        checkAttendance();
        fetch('/api/profile').then(r=>r.json()).then(d=>setMyProfile(d.profile || {}));
        // Fetch Team Leaders
        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            const leaders = (d.workers || []).filter(w => w.position === 'Team Lead');
            setTeamLeaders(leaders);
        });
    }, []);

    const markAttendance = async (status) => {
        const res = await fetch('/api/attendance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status }) });
        if(res.ok) checkAttendance();
    };

    const updateStatus = async (taskId, e) => {
        e.preventDefault();
        const state = taskState[taskId] || {};
        const status = state.status || e.target.status?.value;
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

    return (
        <div className="tasks-grid animate-slide-up">
             {/* Daily Attendance Widget */}
             <div className="glass-panel" style={{ padding: '25px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))', border:'1px solid var(--panel-border)' }}>
                 <div>
                     <h3 style={{margin:0, fontSize:'1.2em'}}>Daily Attendance Log</h3>
                     <p style={{margin:'5px 0 0', color:'var(--text-muted)', fontSize:'0.9em'}}>Mark your operational status for today.</p>
                 </div>
                 <div>
                     {attendance.marked ? (
                         <div style={{fontWeight:600, color: attendance.status==='Present'?'#059669':'#dc2626', background: attendance.status==='Present'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', padding:'10px 20px', borderRadius:'12px', border:`1px solid ${attendance.status==='Present'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>
                             Today's Checked Status: {attendance.status}
                         </div>
                     ) : (
                         <div style={{display:'flex', gap:'10px'}}>
                             <button onClick={()=>markAttendance('Present')} className="btn-primary" style={{background:'#059669', boxShadow:'none'}}>Mark Active (Stay)</button>
                             <button onClick={()=>markAttendance('Leave')} className="btn-secondary" style={{borderColor:'#dc2626', color:'#dc2626'}}>Log Leave</button>
                         </div>
                     )}
                 </div>
             </div>

             {(() => {
                 const todayObj = new Date();
                 const todayStr = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                 
                 // Helper to format DB dates to strictly YYYY-MM-DD
                 const processDate = (dateString) => {
                     if (!dateString) return null;
                     const d = new Date(dateString);
                     // Adjust for timezone offset to avoid previous-day shifting issues on 'Z' dates
                     return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                 };

                 const overdueTasks = tasks.filter(t => { const d = processDate(t.due_date); return d && d < todayStr && t.status !== 'Completed'; });
                 const todayTasks = tasks.filter(t => { const d = processDate(t.due_date); return (!d || d === todayStr) && t.status !== 'Completed'; });
                 const upcomingTasks = tasks.filter(t => { const d = processDate(t.due_date); return d && d > todayStr && t.status !== 'Completed'; });
                 const completedTasks = tasks.filter(t => t.status === 'Completed');

                 const renderTask = (t) => {
                     const sc = t.status==='Completed'?'status-completed':(t.status==='Approved'?'status-approved':(t.status==='Pending Approval'?'status-pending':(t.status==='In Progress'?'status-progress':'status-assigned')));
                     const ts = taskState[t.id] || {};
                     const currentStatus = ts.status || t.status;
                     const showLeaderPick = currentStatus === 'Pending Approval';
                     const hasAssignedLeader = !!myProfile.assigned_leader_id;
                     return (
                         <div key={t.id} className="glass-panel" style={{ padding: '30px' }}>
                             <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                 <h3 style={{marginTop:0, color:'#e2e8f0', fontSize:'1.4em'}}>{t.title}</h3>
                                 <span className={`status-badge ${sc}`}>{t.status}</span>
                             </div>

                             {t.due_date && <div style={{fontSize:'0.85em', color: t.due_date < todayStr ? '#dc2626' : '#f87171', marginBottom:'15px', fontWeight:600}}>
                                 {t.due_date < todayStr ? '⚠️ OVERDUE:' : '🔴 Strict Deadline:'} {new Date(t.due_date).toLocaleDateString()}
                             </div>}
                             <p style={{color:'#cbd5e1', fontSize:'0.95em', lineHeight:1.6}}>{t.description}</p>
                             
                             {t.attachment && <a href={t.attachment} target="_blank" className="btn-secondary" style={{marginTop:'15px', display:'inline-flex'}}>📎 Download Payload Data</a>}

                             <hr style={{ border:0, borderTop:'1px solid rgba(255,255,255,0.05)', margin:'25px 0' }} />
                             
                             <form onSubmit={(e)=>updateStatus(t.id, e)} style={{display:'grid', gridTemplateColumns:'1fr 3fr', gap:'20px', alignItems:'end'}}>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                     <label>Update Status</label>
                                     <select name="status" value={currentStatus} onChange={e => setTaskState(prev => ({...prev, [t.id]: {...(prev[t.id]||{}), status: e.target.value, leader_id: undefined}})) }>
                                         <option value="Assigned">Assigned</option>
                                         <option value="In Progress">In Progress</option>
                                         <option value="Pending Approval">Send for Approval</option>
                                         <option value="Completed">Completed</option>
                                     </select>
                                </div>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <label>Execution Report / Notes</label>
                                    <div style={{display:'flex', gap:'15px'}}>
                                        <input type="text" name="note" defaultValue={t.worker_note || ''} placeholder="Status update notes..." />
                                        <button type="submit" className="btn-primary" style={{marginTop:0}}>Push Update</button>
                                    </div>
                                </div>
                                {showLeaderPick && teamLeaders.length > 0 && !hasAssignedLeader && (
                                    <div style={{gridColumn:'span 2', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
                                        <label style={{color:'#a855f7', marginBottom:0}}>🔔 Notify Team Leader for Review</label>
                                        <select value={ts.leader_id || ''} onChange={e => setTaskState(prev => ({...prev, [t.id]: {...(prev[t.id]||{}), leader_id: e.target.value}}))} required>
                                            <option value="">Select Team Leader...</option>
                                            {teamLeaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                        <p style={{margin:0, fontSize:'0.82em', color:'var(--text-muted)'}}>A direct chat message will be sent to the selected Team Leader with your approval request.</p>
                                    </div>
                                )}
                                {showLeaderPick && hasAssignedLeader && (
                                    <div style={{gridColumn:'span 2', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
                                        <label style={{color:'#10b981', marginBottom:0}}>✅ Auto-Routing to your Team Leader</label>
                                        <p style={{margin:0, fontSize:'0.85em', color:'var(--text-muted)'}}>Your approval request will be automatically routed to your assigned Team Leader.</p>
                                    </div>
                                )}
                                {showLeaderPick && teamLeaders.length === 0 && (
                                    <div style={{gridColumn:'span 2', fontSize:'0.85em', color:'#f59e0b', padding:'10px', background:'rgba(245,158,11,0.08)', borderRadius:'10px', border:'1px solid rgba(245,158,11,0.2)'}}>
                                        ⚠️ No Team Leaders are registered yet. Your approval will go to the main Admin.
                                    </div>
                                )}
                             </form>
                         </div>
                     );
                 };

                 return (
                     <>
                         {overdueTasks.length > 0 && (
                             <div>
                                 <h3 style={{ color: '#ef4444', marginBottom: '15px', borderBottom: '1px solid #ef4444', paddingBottom: '10px' }}>⚠️ Missed / Overdue Operations</h3>
                                 <div className="tasks-grid">{overdueTasks.map(renderTask)}</div>
                             </div>
                         )}

                         <div>
                             <h3 style={{ color: '#3b82f6', marginBottom: '15px', borderBottom: '1px solid #3b82f6', paddingBottom: '10px', marginTop: overdueTasks.length > 0 ? '20px' : '0' }}>📅 Today's Operations</h3>
                             {todayTasks.length > 0 ? (
                                 <div className="tasks-grid">{todayTasks.map(renderTask)}</div>
                             ) : (
                                 <div className="glass-panel" style={{padding:'30px', textAlign:'center', color:'#94a3b8'}}>No tasks pending for today.</div>
                             )}
                         </div>

                         {upcomingTasks.length > 0 && (
                             <div>
                                 <h3 style={{ color: '#f59e0b', marginBottom: '15px', borderBottom: '1px solid #f59e0b', paddingBottom: '10px', marginTop: '20px' }}>⏳ Upcoming Operations</h3>
                                 <div className="tasks-grid">{upcomingTasks.map(renderTask)}</div>
                             </div>
                         )}

                         {completedTasks.length > 0 && (
                             <div>
                                 <h3 style={{ color: '#10b981', marginBottom: '15px', borderBottom: '1px solid #10b981', paddingBottom: '10px', marginTop: '20px' }}>✅ Completed Operations</h3>
                                 <div className="tasks-grid">{completedTasks.map(renderTask)}</div>
                             </div>
                         )}
                         {tasks.length === 0 && <div className="glass-panel" style={{padding:'50px', textAlign:'center'}}><p style={{color:'#94a3b8', fontSize:'1.1em'}}>No operations currently assigned to this node.</p></div>}
                     </>
                 );
             })()}
        </div>
    );
}
