'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Briefcase, ArrowDownCircle } from 'lucide-react';

export default function OperationsRegistry() {
    const [user, setUser] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', employee_id: '', due_date: '' });
    const [msg, setMsg] = useState({text:'', type:''});
    const router = useRouter();

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>setWorkers(d.workers || []));
        fetch('/api/tasks').then(r=>r.json()).then(d=>setTasks(d.tasks || []));
    };

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if(!d.authenticated || d.user.role !== 'admin') router.push('/dashboard');
            else { setUser(d.user); fetchData(); }
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

    if(!user) return null;

    return (
        <AppLayout user={user}>
<div className="animate-slide-up" style={{maxWidth:'1000px', margin:'0 auto'}}>
                
                {/* Header with Quick Assign Link */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
                    <h2 style={{margin:0, color:'#e2e8f0', fontSize:'1.6em'}}>Operations Management Registry</h2>
                    <button onClick={() => router.push('/admin/assign')} className="btn-primary" style={{display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px'}}>
                        <Briefcase size={18}/> Assign New Operation
                    </button>
                </div>

                {msg.text && <div className={`alert-box alert-${msg.type}`} style={{marginBottom:'20px'}}>{msg.text}</div>}


                {/* Assignment History */}
                <h3 style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
                    <ArrowDownCircle size={22} color="#94a3b8"/> Operation Assignment Registry
                </h3>
                
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    {tasks.length > 0 ? tasks.map(t => {
                        const sc = t.status==='Completed'?'status-completed':(t.status==='Approved'?'status-approved':(t.status==='Pending Approval'?'status-pending':(t.status==='In Progress'?'status-progress':'status-assigned')));
                        const dateObj = new Date(t.created_at);
                        const assignedDate = dateObj.toLocaleDateString();
                        const assignedTime = dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        
                        return (
                            <div key={t.id} className="glass-panel" style={{padding:'20px', display:'flex', flexDirection:'column', gap:'15px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <div>
                                       <h4 style={{margin:'0 0 5px 0', fontSize:'1.2em', color:'#e2e8f0'}}>{t.title}</h4>
                                       <div style={{fontSize:'0.9em', color:'var(--text-muted)'}}>
                                           Assigned to <strong style={{color:'#f8fafc', fontWeight:600}}>{t.worker_name}</strong>
                                       </div>
                                    </div>
                                    <span className={`status-badge ${sc}`}>{t.status}</span>
                                </div>
                                <div style={{fontSize:'0.95em', color:'#cbd5e1', background:'rgba(255,255,255,0.02)', padding:'12px', borderRadius:'10px', border:'1px solid var(--panel-border)'}}>
                                     {t.description}
                                </div>
                                
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--panel-border)', paddingTop:'15px', marginTop:'5px'}}>
                                     <div style={{fontSize:'0.85em', color:'var(--text-muted)', display:'flex', gap:'20px'}}>
                                         <span>Assigned by: <strong style={{color:'#60a5fa'}}>{t.assigner_name || 'System Admin'}</strong></span>
                                         <span>Date: <strong>{assignedDate}</strong></span>
                                         <span>Time: <strong>{assignedTime}</strong></span>
                                     </div>
                                     {t.due_date && <div style={{fontSize:'0.85em', color:'#ef4444', fontWeight:600}}>Deadline: {new Date(t.due_date).toLocaleDateString()}</div>}
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="glass-panel" style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>
                            No operations recorded in the registry yet.
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
