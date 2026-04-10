'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Info } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth').then(r=>r.json()).then(d=>{ 
      if(!d.authenticated) {
        router.push('/login'); 
      } else {
        fetch('/api/profile').then(r2=>r2.json()).then(d2=>{
          if(!d2.error) { 
            setForm({ name: d2.profile.name, email: d2.profile.email, phone: d2.profile.phone, password: d2.profile.password });
            setUser({ ...d.user, profile_picture: d2.profile.profile_picture });
          } else {
            setUser(d.user);
          }
        });
      }
    });
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg({text:'', type:''});
    
    let pictureUrl = '';
    const fileInput = document.getElementById('picLoader').files[0];
    if(fileInput) {
       const fd = new FormData(); fd.append('file', fileInput);
       const up = await fetch('/api/upload', { method:'POST', body:fd }).then(r=>r.json());
       if(up.url) pictureUrl = up.url;
    }

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, profile_picture: pictureUrl || user.profile_picture })
    }).then(r=>r.json());

    if(res.success) {
      setMsg({text: 'Identity profile fully synchronized!', type:'success'});
      setUser(prev => ({ ...prev, profile_picture: pictureUrl || prev.profile_picture, name: form.name }));
    } else {
      setMsg({text: 'Error updating profile', type:'error'});
    }
  };

  if(!user) return <div style={{textAlign:'center', marginTop:'100px'}}>Loading...</div>;

  return (
    <AppLayout user={user}>
      <div className="glass-panel animate-slide-up" style={{maxWidth:'800px', margin:'0 auto', padding:'40px'}}>
        
        {msg.text && <div className={`alert-box alert-${msg.type}`}><Info size={20}/> {msg.text}</div>}

        <div style={{textAlign:'center', paddingBottom:'30px'}}>
            <img src={(user.profile_picture && user.profile_picture !== 'default.png') ? user.profile_picture : `https://via.placeholder.com/120?text=${user.name.charAt(0)}`} onError={(e)=>{e.target.onerror=null; e.target.src=`https://via.placeholder.com/120?text=${user.name.charAt(0)}`}} alt="Profile Avatar" id="previewImg" style={{width:'120px', height:'120px', borderRadius:'50%', objectFit:'cover', border:'3px solid rgba(59,130,246,0.3)', marginBottom:'15px', backgroundColor:'rgba(0,0,0,0.5)'}} />
            <h2 style={{margin:'0 0 5px 0', fontSize:'1.6em', color:'var(--text-main)'}}>{user.name}</h2>
            <p style={{color:'var(--text-muted)', margin:0, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', fontSize:'0.9em'}}>Node ID: #FEENIX-{String(user.id).padStart(4, '0')}</p>
        </div>

        <form onSubmit={handleUpdate} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={{gridColumn:'span 2'}}>
                <label>Update Avatar / Biometric visual</label>
                <input type="file" id="picLoader" accept="image/*" style={{padding:'10px'}} />
            </div>
            <div>
                <label>Full Name</label>
                <input type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
            </div>
            <div>
                <label>Email Access</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required/>
            </div>
            <div>
                <label>Comm Link (Phone)</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} required/>
            </div>
            <div>
                <label>Authentication Code (Password)</label>
                <input type="text" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required/>
            </div>
            <button type="submit" className="btn-primary" style={{gridColumn:'span 2', marginTop:'15px'}}>Synchronize Identity</button>
        </form>
      </div>
    </AppLayout>
  );
}
