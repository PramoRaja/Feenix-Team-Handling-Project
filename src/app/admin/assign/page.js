'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Briefcase } from 'lucide-react';

export default function AssignOperation() {
    const [user, setUser] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', employee_id: '', due_date: '' });
    const [msg, setMsg] = useState({text:'', type:''});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>setWorkers(d.workers || []));
    };

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if(!d.authenticated || d.user.role !== 'admin') router.push('/dashboard');
            else { setUser(d.user); fetchData(); setLoading(false); }
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
        } else setMsg({text: 'Error deploying task.', type:'error'});
    };

    if(loading) return <div style={{textAlign:'center', marginTop:'100px'}}>Establishing Secure Connection...</div>;

    return (
        <AppLayout user={user}>
            <div className="animate-slide-up" style={{maxWidth:'800px', margin:'0 auto'}}>
                
                {/* Task Assigner Form */}
                <div className="glass-panel" style={{ padding: '40px', background:'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))' }}>
                    <h2 style={{marginBottom:'30px', display:'flex', alignItems:'center', gap:'15px', color:'#60a5fa'}}>
                        <Briefcase size={32} color="#60a5fa"/> Assign New Operation
                    </h2>
                    
                    {msg.text && <div className={`alert-box alert-${msg.type}`} style={{marginBottom:'25px'}}>{msg.text}</div>}
                    
                    <form onSubmit={handleAssign} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'25px'}}>
                        <div style={{gridColumn:'span 2'}}>
                            <label style={{textTransform:'uppercase', fontSize:'0.75em', letterSpacing:'1px', fontWeight:600, color:'#94a3b8', marginBottom:'8px', display:'block'}}>Operation Title</label>
                            <input type="text" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required placeholder="E.g. System Audit" style={{width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--panel-border)', color:'white'}} />
                        </div>
                        
                        <div style={{gridColumn:'span 2'}}>
                            <label style={{textTransform:'uppercase', fontSize:'0.75em', letterSpacing:'1px', fontWeight:600, color:'#94a3b8', marginBottom:'8px', display:'block'}}>Execution Parameters</label>
                            <textarea rows="4" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} required placeholder="Detailed objective instructions..." style={{width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--panel-border)', color:'white', resize:'vertical'}} />
                        </div>
                        
                        <div>
                            <label style={{textTransform:'uppercase', fontSize:'0.75em', letterSpacing:'1px', fontWeight:600, color:'#94a3b8', marginBottom:'8px', display:'block'}}>Assignee (Worker Node)</label>
                            <select value={form.employee_id} onChange={e=>setForm({...form, employee_id:e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--panel-border)', color:'white'}}>
                                <option value="" style={{background:'#1e293b'}}>Select Worker...</option>
                                {workers.map(w=><option key={w.id} value={w.id} style={{background:'#1e293b'}}>{w.name} ({w.position})</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label style={{textTransform:'uppercase', fontSize:'0.75em', letterSpacing:'1px', fontWeight:600, color:'#94a3b8', marginBottom:'8px', display:'block'}}>Execution Deadline (Due Date)</label>
                            <input type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--panel-border)', color:'white'}} />
                        </div>
                        
                        <div style={{gridColumn:'span 2'}}>
                            <label style={{textTransform:'uppercase', fontSize:'0.75em', letterSpacing:'1px', fontWeight:600, color:'#94a3b8', marginBottom:'8px', display:'block'}}>Data Payload (Attachment PDF/Imgs)</label>
                            <input type="file" id="taskFile" style={{width:'100%', padding:'10px', background:'rgba(0,0,0,0.1)', borderRadius:'8px', border:'1px dashed var(--panel-border)'}} />
                        </div>
                        
                        <button type="submit" className="btn-primary" style={{gridColumn:'span 2', marginTop:'15px', padding:'15px', fontSize:'1.1em', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px'}}>
                            Execute Assignment Protocol
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
