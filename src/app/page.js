'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Hexagon, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    const timer = setTimeout(() => setChecking(false), 2000);
    fetch('/api/auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timer);
        if (data.authenticated) {
            if (data.user.role === 'admin') router.push('/admin/dashboard');
            else if (data.user.role === 'client') router.push('/client/dashboard');
            else router.push('/worker/dashboard');
        } else {
            setChecking(false);
        }
      })
      .catch(() => {
        clearTimeout(timer);
        setChecking(false);
      });
    return () => clearTimeout(timer);
  }, [router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px', background: 'var(--bg)' }}>
        <div className="glass-card" style={{ padding: '50px 40px', textAlign: 'center', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '20px' }}>
          <img src="/feenix-logo.png" alt="FEENIX" style={{ height: '36px', width: 'auto', maxWidth: '220px', objectFit: 'contain', display: 'block', margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Securely authenticating connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', padding: '20px' }}>
      {/* Floating Theme Toggle */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button 
          onClick={toggleTheme} 
          className="btn-icon" 
          title="Toggle Theme" 
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
      </div>

      <div className="glass-panel animate-slide-up" style={{ textAlign: 'center', maxWidth: '540px', width: '100%', padding: '50px 35px', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
        
        {/* Official Feenix Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img 
            src="/feenix-logo.png" 
            alt="FEENIX" 
            style={{ width: '100%', maxWidth: '320px', height: 'auto', objectFit: 'contain' }} 
          />
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.02em', marginBottom: '35px', fontWeight: 500, lineHeight: 1.5 }}>
          Enterprise Digital Operations & Management Portal
        </p>

        {/* Primary Login Button (Routes to Team Portal) */}
        <div>
          <Link href="/worker/login" style={{ textDecoration: 'none' }}>
            <button 
              className="btn-primary" 
              style={{ 
                padding: '14px 45px', 
                fontSize: '1.1em', 
                fontWeight: 800, 
                borderRadius: '16px', 
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                boxShadow: '0 8px 25px rgba(37, 99, 235, 0.35)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.25s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>Login</span>
              <ArrowRight size={20} />
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
