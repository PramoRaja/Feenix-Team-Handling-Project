'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Briefcase, ArrowDownCircle, Mail, LayoutGrid, List } from 'lucide-react';
import KanbanBoard from '@/components/KanbanBoard';

export default function OperationsRegistry() {
    const [user, setUser] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [form, setForm] = useState({ title: '', description: '', employee_id: '', due_date: '' });
    const [msg, setMsg] = useState({text:'', type:''});
    const [rescheduleData, setRescheduleData] = useState({ id: null, date: '' });
    const [sendingReminder, setSendingReminder] = useState(false);
    const router = useRouter();

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>setWorkers(d.workers || []));
        fetch('/api/tasks').then(r=>r.json()).then(d=>setTasks(d.tasks || []));
    };

    const handleSendReminders = async (taskId = null) => {
        setSendingReminder(true);
        setMsg({ text: '', type: '' });
        try {
            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            }).then(r => r.json());

            if (res.success) {
                setMsg({ text: res.message, type: 'success' });
            } else {
                setMsg({ text: res.error || 'Failed to dispatch email reminders.', type: 'error' });
            }
        } catch (e) {
            setMsg({ text: 'Error dispatching reminders: ' + e.message, type: 'error' });
        }
        setSendingReminder(false);
    };

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if (!d.authenticated) {
                router.push('/admin/login');
                return;
            }
            const pos = (d.user?.position || '').toLowerCase();
            const isAllowedOps = d.user?.role === 'admin' || 
                pos.includes('managing director') || pos === 'md' ||
                pos.includes('project manager') || pos === 'pm' ||
                pos.includes('strategist') || pos.includes('executive') ||
                pos.includes('account manager') || pos === 'am';

            if (!isAllowedOps) {
                router.push(d.user?.role === 'admin' ? '/admin/dashboard' : '/worker/dashboard');
            } else {
                setUser(d.user);
                fetchData();
            }
        });
    }, []);

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

    const handleDelete = async (id, title) => {
        if(!window.confirm(`Are you sure you want to delete the task "${title}"?\nThis cannot be undone.`)) return;
        const res = await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: id }) }).then(r=>r.json());
        if(res.success) { setMsg({text:`Operation "${title}" deleted successfully.`, type:'success'}); fetchData(); }
        else setMsg({text:'Error deleting operation.', type:'error'});
    };

    const handleReschedule = async (id) => {
        if(!rescheduleData.date) return;
        const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: id, due_date: rescheduleData.date }) }).then(r=>r.json());
        if(res.success) { setMsg({text:'Operation rescheduled successfully.', type:'success'}); setRescheduleData({id:null, date:''}); fetchData(); }
        else setMsg({text:'Error rescheduling operation.', type:'error'});
    };

    if(!user) return null;

    return (
        <AppLayout user={user}>
<div className="animate-slide-up" style={{maxWidth:'1000px', margin:'0 auto'}}>
                
                {/* Header with Quick Assign Link */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'32px'}}>
                    <div>
                        <span style={{ fontSize: '0.72em', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Logistics & Audit
                        </span>
                        <h1 style={{ margin: '4px 0 0 0', fontSize: '1.9em', fontWeight: 800, color: '#2563eb' }}>
                            Operations Management Registry
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* View Switcher Button Group */}
                        <div style={{ display: 'flex', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <button
                                onClick={() => setViewMode('kanban')}
                                style={{
                                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                                    background: viewMode === 'kanban' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-muted)',
                                    fontWeight: 800, fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <LayoutGrid size={16} /> Kanban Board
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                                    background: viewMode === 'list' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: viewMode === 'list' ? '#ffffff' : 'var(--text-muted)',
                                    fontWeight: 800, fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <List size={16} /> List View
                            </button>
                        </div>

                        <button 
                            onClick={() => handleSendReminders()} 
                            disabled={sendingReminder}
                            className="btn-secondary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', fontWeight: 700, color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)', opacity: sendingReminder ? 0.7 : 1 }}
                        >
                            <Mail size={18} /> {sendingReminder ? 'Dispatching...' : 'Dispatch Email Reminders'}
                        </button>
                        <button onClick={() => router.push('/admin/assign')} className="btn-primary" style={{display:'flex', alignItems:'center', gap:'8px', padding:'12px 22px', borderRadius: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'}}>
                            <Briefcase size={18}/> Assign New Operation
                        </button>
                    </div>
                </div>

                {msg.text && <div className={`alert-box alert-${msg.type}`} style={{marginBottom:'20px'}}>{msg.text}</div>}

                {viewMode === 'kanban' ? (
                    <KanbanBoard tasks={tasks} onTaskUpdate={fetchData} />
                ) : (
                    <>
                        {/* Assignment History Section Header */}
                        <div style={{ marginBottom: '22px', padding: '12px 20px', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--card-shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', display: 'flex' }}>
                            <ArrowDownCircle size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 700, color: 'var(--text-main)' }}>
                                Operation Assignment History
                            </h3>
                            <span style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>Audit log of deployed tasks and worker assignments</span>
                        </div>
                    </div>
                    <span style={{ fontSize: '0.78em', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '4px 14px', borderRadius: '20px', fontWeight: 700 }}>
                        {tasks.length} {tasks.length === 1 ? 'RECORD' : 'RECORDS'}
                    </span>
                </div>
                
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    {tasks.length > 0 ? tasks.map(t => {
                        const sc = t.status==='Completed'?'status-completed':(t.status==='Approved'?'status-approved':(t.status==='Pending Approval'?'status-pending':(t.status==='In Progress'?'status-progress':'status-assigned')));
                        const dateObj = new Date(t.created_at);
                        const assignedDate = dateObj.toLocaleDateString();
                        const assignedTime = dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        const isPending = t.status !== 'Completed' && t.status !== 'Approved';
                        
                        return (
                            <div key={t.id} className="glass-panel" style={{padding:'20px', display:'flex', flexDirection:'column', gap:'15px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <div>
                                       <h4 style={{margin:'0 0 5px 0', fontSize:'1.2em', color:'var(--text-main)', fontWeight: 800}}>{t.title}</h4>
                                       <div style={{fontSize:'0.9em', color:'var(--text-muted)'}}>
                                           Assigned to <strong style={{color:'var(--text-main)', fontWeight: 700}}>{t.worker_name}</strong>
                                       </div>
                                    </div>
                                    <span className={`status-badge ${sc}`}>{t.status}</span>
                                </div>
                                <div style={{fontSize:'0.95em', color:'var(--text-main)', background:'var(--input-bg)', padding:'12px 16px', borderRadius:'10px', border:'1px solid var(--panel-border)'}}>
                                     {t.description}
                                </div>
                                
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--panel-border)', paddingTop:'15px', marginTop:'5px'}}>
                                     <div style={{fontSize:'0.85em', color:'var(--text-muted)', display:'flex', gap:'20px'}}>
                                         <span>Assigned by: <strong style={{color:'var(--primary)'}}>{t.assigner_name || 'System Admin'}</strong></span>
                                         <span>Date: <strong style={{color:'var(--text-main)'}}>{assignedDate}</strong></span>
                                         <span>Time: <strong style={{color:'var(--text-main)'}}>{assignedTime}</strong></span>
                                     </div>
                                     <div style={{display:'flex', alignItems:'center', gap:'15px', flexWrap:'wrap', justifyContent:'flex-end'}}>
                                         {t.due_date && <div style={{fontSize:'0.85em', color:'#ef4444', fontWeight:600}}>Deadline: {new Date(t.due_date).toLocaleDateString()}</div>}
                                         
                                         {rescheduleData.id === t.id ? (
                                             <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                 <input type="date" value={rescheduleData.date} onChange={e=>setRescheduleData({...rescheduleData, date: e.target.value})} style={{padding:'4px 8px', fontSize:'0.85em', borderRadius:'6px', background:'var(--input-bg)', color:'var(--text-main)', border:'1px solid var(--input-border)'}}/>
                                                 <button onClick={()=>handleReschedule(t.id)} className="btn-primary" style={{padding:'4px 10px', fontSize:'0.82em', background:'#10b981'}}>Save</button>
                                                 <button onClick={()=>setRescheduleData({id:null, date:''})} className="btn-secondary" style={{padding:'4px 10px', fontSize:'0.82em'}}>Cancel</button>
                                             </div>
                                         ) : (
                                             <div style={{display:'flex', gap:'8px'}}>
                                                 {isPending && (
                                                     <button 
                                                         onClick={() => handleSendReminders(t.id)} 
                                                         disabled={sendingReminder}
                                                         className="btn-secondary" 
                                                         style={{ padding: '4px 12px', fontSize: '0.82em', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                     >
                                                         <Mail size={13} /> Email Remind
                                                     </button>
                                                 )}
                                                 <button onClick={()=>setRescheduleData({id: t.id, date: t.due_date ? t.due_date.split('T')[0] : ''})} className="btn-secondary" style={{padding:'4px 12px', fontSize:'0.82em', color:'#eab308', borderColor:'rgba(234, 179, 8, 0.4)'}}>Reschedule</button>
                                                 {user?.role === 'admin' && (
                                                     <button onClick={()=>handleDelete(t.id, t.title)} className="btn-secondary" style={{padding:'4px 12px', fontSize:'0.82em', color:'#ef4444', borderColor:'rgba(239, 68, 68, 0.4)'}}>Delete</button>
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="glass-panel" style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>
                            No operations recorded in the registry yet.
                        </div>
                    )}
                </div>
            </>
        )}
            </div>
        </AppLayout>
    );
}
