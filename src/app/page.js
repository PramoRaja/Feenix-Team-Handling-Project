'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if(data.authenticated) router.push('/dashboard');
        else router.push('/login');
      });
  }, []);

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', padding: '20px' }}>
      <div className="glass-card" style={{ padding: '60px' }}>
        <h2 style={{ marginBottom: '10px' }}>FEENIX Loading...</h2>
        <p style={{ color: '#94a3b8' }}>Securely authenticating connection...</p>
      </div>
    </div>
  );
}
