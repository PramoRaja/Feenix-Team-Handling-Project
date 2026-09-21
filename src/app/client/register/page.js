'use client';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClientRegister() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...formData })
    });
    
    const data = await res.json();
    setLoading(false);
    
    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => router.push('/client/login'), 1500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button onClick={toggleTheme} style={{
              background: 'var(--panel-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--panel-border)',
              padding: '12px',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
          }} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
      </div>
      <div style={{ 
        background: 'var(--panel-bg, rgba(30,41,59,0.7))', 
        padding: '40px', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '450px', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--input-border)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img 
              src="/feenix-logo.png" 
              alt="FEENIX" 
              style={{ width: '100%', maxWidth: '220px', height: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <h2 style={{ fontSize: '1.6em', marginBottom: '6px', color: '#3b82f6', fontWeight: 800, margin: 0 }}>Client Registration</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.92em' }}>Register your brand account</p>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <input type="text" name="company_code" placeholder="Company Code (e.g., FX-1234)" required onChange={handleChange} 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)', fontSize: '1em', outline: 'none', transition: 'border 0.3s' }} 
            onFocus={e => e.target.style.borderColor = '#60a5fa'} onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
          
          <input type="text" name="name" placeholder="Company Name / Contact Person" required onChange={handleChange} 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)', fontSize: '1em', outline: 'none', transition: 'border 0.3s' }} 
            onFocus={e => e.target.style.borderColor = '#60a5fa'} onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
          
          <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)', fontSize: '1em', outline: 'none', transition: 'border 0.3s' }} 
            onFocus={e => e.target.style.borderColor = '#60a5fa'} onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
          
          <input type="password" name="password" placeholder="Password" required onChange={handleChange} 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)', fontSize: '1em', outline: 'none', transition: 'border 0.3s' }} 
            onFocus={e => e.target.style.borderColor = '#60a5fa'} onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />

          <button type="submit" disabled={loading} style={{ 
            width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', 
            color: '#fff', border: 'none', fontSize: '1.1em', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'transform 0.2s', marginTop: '10px' 
          }} onMouseEnter={e => !loading && (e.target.style.transform = 'translateY(-2px)')} onMouseLeave={e => !loading && (e.target.style.transform = 'translateY(0)')}>
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <Link href="/client/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9em', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'var(--text-main)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
            Already have an account? <span style={{ color: '#60a5fa' }}>Log In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
