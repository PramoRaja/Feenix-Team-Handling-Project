'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Terminal } from 'lucide-react';

export default function AdminAlerts() {
    const [user, setUser] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if(!d.authenticated) router.push('/login');
            else setUser(d.user);
        });

        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            if(d.error) router.push('/dashboard');
            else {
                setAlerts(d.alerts || []);
                fetch('/api/adminData', { method:'PUT' }); // mark all read
            }
        });
    }, []);

    if(!user) return null;

    return (
        <AppLayout user={user}>
            <div className="animate-slide-up" style={{maxWidth:'1000px', margin:'0 auto'}}>
                <div style={{marginTop:'10px', display:'flex', flexDirection:'column', gap:'12px'}}>
                    {alerts.length > 0 ? alerts.map(a => (
                        <div key={a.id} className="glass-panel" style={{ padding: '20px', display:'flex', alignItems:'flex-start', gap:'15px' }}>
                            <div style={{background:'rgba(59,130,246,0.1)', padding:'10px', borderRadius:'12px', color:'#60a5fa'}}>
                                <Terminal size={24} />
                            </div>
                            <div style={{flex:1}}>
                                <span style={{ color:'#94a3b8', fontSize:'0.8em', float:'right' }}>{new Date(a.created_at).toLocaleString()}</span>
                                <h4 style={{margin:'0 0 6px 0', fontSize:'1.1em', color:'#e2e8f0'}}>{a.name || 'System Command'}</h4>
                                <p style={{margin:0, color:'#cbd5e1', fontSize:'0.95em'}}>{a.message}</p>
                            </div>
                        </div>
                    )) : (
                       <div className="glass-panel" style={{padding:'40px', textAlign:'center'}}>
                           <p style={{color:'#64748b'}}>No system logs or activity detected yet.</p>
                       </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
