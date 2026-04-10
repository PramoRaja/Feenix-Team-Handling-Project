'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ChevronRight, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });

    const data = await res.json();
    if(data.success) {
      router.push('/dashboard');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div className="auth-container animate-slide-up">
      <div className="glass-panel auth-card">
        <div style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>
            <div style={{background:'rgba(59,130,246,0.1)', padding:'15px', borderRadius:'20px', border:'1px solid rgba(59,130,246,0.2)'}}>
                <Lock size={40} color="#60a5fa" />
            </div>
        </div>
        
        <h2 style={{textAlign:'center', fontSize:'1.8em', marginBottom:'5px'}}>Welcome Back</h2>
        <p style={{textAlign:'center', color:'#94a3b8', marginBottom:'30px'}}>Sign in to your Feenix Workspace</p>
        
        {error && <div className="alert-box alert-error"><ShieldAlert size={20}/> {error}</div>}
        
        <form onSubmit={handleLogin}>
          <div>
              <label>Official Email Address</label>
              <div style={{position:'relative'}}>
                  <Mail size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                  <input type="email" placeholder="agent@feenix.com" required value={email} onChange={(e)=>setEmail(e.target.value)} style={{paddingLeft:'45px'}} />
              </div>
          </div>
          <div>
              <label>Authentication Password</label>
              <div style={{position:'relative'}}>
                  <Lock size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                  <input type="password" placeholder="••••••••" required value={password} onChange={(e)=>setPassword(e.target.value)} style={{paddingLeft:'45px'}} />
              </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{marginTop:'10px'}}>
              Access System <ChevronRight size={20} />
          </button>
        </form>
        
        <div style={{marginTop:'30px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'20px'}}>
          <Link href="/register" style={{color:'#94a3b8', fontSize:'0.9em', textDecoration:'none', transition:'color 0.2s'}}>
            Need an access terminal? <span style={{color:'#60a5fa', fontWeight:'600'}}>Initialize here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
