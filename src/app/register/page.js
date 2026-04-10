'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Phone, Lock, Briefcase, User, Info, ChevronRight } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', position: '', phone: '', email: '', password: '', role: 'worker' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...form })
    });

    const data = await res.json();
    if(data.success) {
      setMsg({ text: 'Node initialized successfully. Routing to login...', type: 'success' });
      setTimeout(() => router.push('/login'), 1500);
    } else {
      setMsg({ text: data.error || 'Registration failed', type: 'error' });
    }
  };

  const c = e => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="auth-container animate-slide-up" style={{padding:'40px 20px'}}>
      <div className="glass-panel auth-card" style={{maxWidth:'600px'}}>
        <div style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>
            <div style={{background:'rgba(16, 185, 129, 0.1)', padding:'15px', borderRadius:'20px', border:'1px solid rgba(16, 185, 129, 0.2)'}}>
                <UserPlus size={40} color="#34d399" />
            </div>
        </div>
        
        <h2 style={{textAlign:'center', fontSize:'1.8em', marginBottom:'5px'}}>System Registration</h2>
        <p style={{textAlign:'center', color:'#94a3b8', marginBottom:'30px'}}>Initialize your Feenix Employee Node</p>
        
        {msg.text && <div className={`alert-box alert-${msg.type}`}><Info size={20}/> {msg.text}</div>}
        
        <form onSubmit={handleRegister} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={{gridColumn:'span 2'}}>
               <label>Full Name</label>
               <div style={{position:'relative'}}>
                   <User size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                   <input type="text" name="name" placeholder="John Doe" required value={form.name} onChange={c} style={{paddingLeft:'45px'}} />
               </div>
            </div>
            
            <div>
               <label>Position / Title</label>
               <div style={{position:'relative'}}>
                   <Briefcase size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                   <select name="position" required value={form.position} onChange={c} style={{paddingLeft:'45px'}}>
                       <option value="">Select Position...</option>
                       <option value="Team Lead">Team Lead</option>
                       <option value="Project Manager">Project Manager</option>
                       <option value="Account Manager">Account Manager</option>
                       <option value="Digital Strategist">Digital Strategist</option>
                       <option value="Designer">Designer</option>
                       <option value="Video Editor">Video Editor</option>
                       <option value="Content Creator">Content Creator</option>
                   </select>
               </div>
            </div>
            
            <div>
               <label>Access Role Requirements</label>
               <select name="role" value={form.role} onChange={c} style={{paddingLeft:'15px'}}>
                   <option value="worker">Standard Worker Access</option>
                   <option value="admin">Administration Override</option>
               </select>
            </div>

            <div>
               <label>Comm Link (Phone)</label>
               <div style={{position:'relative'}}>
                   <Phone size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                   <input type="text" name="phone" placeholder="+1 234 567 890" required value={form.phone} onChange={c} style={{paddingLeft:'45px'}} />
               </div>
            </div>

            <div>
               <label>Official Email</label>
               <div style={{position:'relative'}}>
                   <Mail size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                   <input type="email" name="email" placeholder="agent@feenix.com" required value={form.email} onChange={c} style={{paddingLeft:'45px'}} />
               </div>
            </div>

            <div style={{gridColumn:'span 2'}}>
               <label>Authentication Code (Password)</label>
               <div style={{position:'relative'}}>
                   <Lock size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                   <input type="password" name="password" placeholder="••••••••" required value={form.password} onChange={c} style={{paddingLeft:'45px'}} />
               </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{gridColumn:'span 2', marginTop:'10px'}}>
                Create Node Instance <ChevronRight size={20} />
            </button>
        </form>

        <div style={{marginTop:'30px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'20px'}}>
          <Link href="/login" style={{color:'#94a3b8', fontSize:'0.9em', textDecoration:'none', transition:'color 0.2s'}}>
            Already connected? <span style={{color:'#34d399', fontWeight:'600'}}>Access terminal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
