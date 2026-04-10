'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileWarning, User, LogOut, Hexagon, Bell, Sun, Moon, Calendar, MessageCircle, Briefcase, ClipboardList } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';

export default function AppLayout({ children, user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [alertsList, setAlertsList] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [avatar, setAvatar] = useState(user?.profile_picture || null);
  const [unreadChat, setUnreadChat] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if(user?.role === 'admin') {
      fetch('/api/adminData').then(r=>r.json()).then(d=>{
          setUnread(d.unread_count || 0);
          setAlertsList((d.alerts || []).slice(0, 5));
      });
    }
    // Chat unread count for everyone
    if(user) {
      fetch('/api/chat?unread=1').then(r=>r.json()).then(d=>setUnreadChat(d.unread || 0));
    }
    if (user?.profile_picture) {
       setAvatar(user.profile_picture);
    } else if (user) {
       fetch('/api/profile').then(r=>r.json()).then(d=>{
           if (!d.error && d.profile) setAvatar(d.profile.profile_picture);
       }).catch(()=>{});
    }
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', body: JSON.stringify({action:'logout'})});
    router.push('/login');
  };

  const links = user?.role === 'admin' ? [
     { name: 'Workspace', path: '/dashboard', icon: <LayoutDashboard size={20}/> },
     { name: 'Assign Operation', path: '/admin/assign', icon: <Briefcase size={20}/> },
     { name: 'Operation Registry', path: '/operations', icon: <ClipboardList size={20}/> },
     { name: 'System Logs', path: '/alerts', icon: <FileWarning size={20}/> },
     { name: 'Company Schedule', path: '/calendar', icon: <Calendar size={20}/> },
     { name: 'Team Chat', path: '/chat', icon: <MessageCircle size={20}/>, badge: unreadChat },
     { name: 'My Identity', path: '/profile', icon: <User size={20}/> }
  ] : [
     { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20}/> },
     { name: 'Company Schedule', path: '/calendar', icon: <Calendar size={20}/> },
     { name: 'Team Chat', path: '/chat', icon: <MessageCircle size={20}/>, badge: unreadChat },
     { name: 'My Identity', path: '/profile', icon: <User size={20}/> }
  ];

  return (
    <div className="app-layout">
        <aside className="sidebar">
            <div className="sidebar-logo">
               <Hexagon size={28} color="#60a5fa" fill="rgba(96, 165, 250, 0.2)"/> FEENIX.
            </div>
            
            <div className="subtext" style={{fontSize:'0.75em', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', paddingLeft:'15px'}}>Navigation</div>
            
            {links.map(l => (
                <Link key={l.path} href={l.path} className={`sidebar-link ${pathname === l.path ? 'active' : ''}`} style={{position:'relative'}}>
                    {l.icon} {l.name}
                    {l.badge > 0 && <span style={{marginLeft:'auto', background:'#ef4444', color:'white', borderRadius:'50%', minWidth:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7em', fontWeight:700, padding:'0 4px'}}>{l.badge}</span>}
                </Link>
            ))}

            <div style={{marginTop:'auto', borderTop:'1px solid var(--panel-border)', paddingTop:'20px'}}>
               <button onClick={handleLogout} className="sidebar-link" style={{width:'100%', background:'none', border:'none', cursor:'pointer', color:'#ef4444'}}>
                  <LogOut size={20}/> Terminate Session
               </button>
            </div>
        </aside>

        <main className="main-wrapper">
            <header className="topbar">
                <div>
                   <h2 style={{margin:0, fontSize:'1.4em'}}>{pathname === '/dashboard' ? 'Overview' : pathname === '/profile' ? 'Identity Profile' : 'Alerts Monitor'}</h2>
                </div>
                <div className="topbar-right">
                   <button onClick={toggleTheme} className="btn-icon" title="Toggle Theme">
                       {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
                   </button>
                   
                   {user?.role === 'admin' && (
                       <div style={{position:'relative'}}>
                           <button onClick={() => { setAlertOpen(!alertOpen); if(unread > 0) { fetch('/api/adminData', { method:'PUT' }); setUnread(0); } }} className="btn-icon">
                               <Bell size={20} />
                               {unread > 0 && <span style={{position:'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.65em', padding: '2px 6px', borderRadius: '50%', fontWeight: 'bold'}}>{unread}</span>}
                           </button>
                           {alertOpen && (
                               <div style={{position:'absolute', top:'60px', right:'0', width:'350px', background:'var(--panel-bg)', backdropFilter:'blur(20px)', border:'1px solid var(--panel-border)', borderRadius:'16px', boxShadow:'var(--card-shadow)', zIndex:100, overflow:'hidden', animation:'fadeIn 0.2s ease'}}>
                                   <div style={{padding:'15px', borderBottom:'1px solid var(--panel-border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                       <strong style={{fontSize:'1em'}}>Leader Alerts</strong>
                                       <Link href="/alerts" className="btn-secondary" style={{padding:'4px 8px', fontSize:'0.75em', border:'none', background:'var(--glow-1)', color:'#3b82f6'}} onClick={()=>setAlertOpen(false)}>View System Logs</Link>
                                   </div>
                                   <div style={{maxHeight:'320px', overflowY:'auto'}}>
                                       {alertsList.length > 0 ? alertsList.map(a => (
                                           <div key={a.id} style={{padding:'15px', borderBottom:'1px solid rgba(148, 163, 184, 0.1)', fontSize:'0.9em', display:'flex', flexDirection:'column', gap:'5px', background: a.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.05)'}}>
                                               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                   <strong style={{color:'#60a5fa'}}>{a.name}</strong>
                                                   <span style={{fontSize:'0.75em', color:'var(--text-muted)'}}>{new Date(a.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                               </div>
                                               <div style={{color:'var(--text-main)', lineHeight:1.4}}>{a.message}</div>
                                           </div>
                                       )) : (
                                           <div style={{padding:'30px 20px', textAlign:'center', color:'var(--text-muted)'}}>No pending approvals or alerts.</div>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
                   <div style={{display:'flex', alignItems:'center', gap:'12px', background:'rgba(59, 130, 246, 0.05)', padding:'6px 14px', borderRadius:'30px', border:'1px solid var(--panel-border)'}}>
                      {avatar && avatar !== 'default.png' ? (
                          <img src={avatar} alt="Avatar" style={{width:'32px', height:'32px', borderRadius:'50%', objectFit:'cover'}} onError={(e)=>{e.target.onerror=null; e.target.src=`https://via.placeholder.com/32?text=${user?.name?.charAt(0) || 'U'}`}} />
                      ) : (
                          <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9em', fontWeight:600}}>
                              {user?.name?.charAt(0)}
                          </div>
                      )}
                      <span style={{fontSize:'0.9em', fontWeight:500}}>{user?.name}</span>
                   </div>
                </div>
            </header>
            
            <div className="content-area">
                {children}
            </div>
        </main>
    </div>
  );
}
