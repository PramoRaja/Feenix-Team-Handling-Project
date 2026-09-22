'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ChevronRight, ShieldAlert } from 'lucide-react';

export default function WorkerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'login', email, password, expectedRole: 'worker' })
      });

      const data = await res.json();
      if(data.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('feenix_user', JSON.stringify(data.user));
        }
        router.push('/worker/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login connection error:', err);
      setError('Connection error! Please check network or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-slide-up">
      <div className="glass-panel auth-card">
        <div style={{display:'flex', justifyContent:'center', marginBottom:'24px'}}>
          <img 
            src="/feenix-logo.png" 
            alt="FEENIX" 
            style={{ width: '100%', maxWidth: '240px', height: 'auto', objectFit: 'contain' }} 
          />
        </div>
        
        <h2 style={{textAlign:'center', fontSize:'1.6em', marginBottom:'4px'}}>Worker Portal</h2>
        <p style={{textAlign:'center', color: 'var(--text-muted)', marginBottom:'28px'}}>Sign in to your Feenix Workspace</p>
        
        {error && <div className="alert-box alert-error"><ShieldAlert size={20}/> {error}</div>}
        
        <form onSubmit={handleLogin}>
          <div>
              <label>Email Address</label>
              <div style={{position:'relative'}}>
                  <Mail size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                  <input type="email" placeholder="agent@feenix.com" required value={email} onChange={(e)=>setEmail(e.target.value)} style={{paddingLeft:'45px'}} />
              </div>
          </div>
          <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <label>Password</label>
                  <Link href="/forgot-password" style={{color:'#60a5fa', fontSize:'0.85em', textDecoration:'none', fontWeight:'600'}}>Forgot Password?</Link>
              </div>
              <div style={{position:'relative'}}>
                  <Lock size={18} color="#64748b" style={{position:'absolute', left:'15px', top:'16px'}} />
                  <input type="password" placeholder="••••••••" required value={password} onChange={(e)=>setPassword(e.target.value)} style={{paddingLeft:'45px'}} />
              </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{marginTop:'10px'}} disabled={loading}>
              {loading ? 'Authenticating...' : <>Login <ChevronRight size={20} /></>}
          </button>
        </form>
        
        <div style={{marginTop:'30px', textAlign:'center', borderTop: '1px solid var(--panel-border)', paddingTop:'20px'}}>
          <Link href="/worker/register" style={{color: 'var(--text-muted)', fontSize:'0.9em', textDecoration:'none', transition:'color 0.2s'}}>
            Need portal access? <span style={{color:'#60a5fa', fontWeight:'600'}}>Register now</span>
          </Link>
        </div>
        

      </div>
    </div>
  );
}
