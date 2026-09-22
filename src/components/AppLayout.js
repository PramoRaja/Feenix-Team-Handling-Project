'use client';
import { useState, useEffect, useRef } from 'react';




import Link from 'next/link';

import { useRouter, usePathname } from 'next/navigation';

import { LayoutDashboard, Users, FileWarning, User, LogOut, Hexagon, Bell, Sun, Moon, Calendar, MessageCircle, Briefcase, ClipboardList, Table, Award, Flame, RotateCcw, Smartphone, Download, X, Menu, Apple, Share, CheckCircle2 } from 'lucide-react';



import { useTheme } from '@/components/ThemeProvider';



function SafeAvatar({ src, name, size = 32 }) {

    const [error, setError] = useState(false);

    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

    const radius = '50%';

    const fontSize = '0.85em';

    const border = '1px solid var(--panel-border)';

    

    if (src && src !== 'default.png' && !error) {

        return <img src={src} onError={() => setError(true)} style={{ width: `${size}px`, height: `${size}px`, borderRadius: radius, objectFit: 'cover', border, flexShrink: 0 }} alt="Avatar" />;

    }

    return (

        <div style={{

            width: `${size}px`, height: `${size}px`, borderRadius: radius,

            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',

            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,

            fontSize, border, flexShrink: 0

        }}>

            {initials}

        </div>

    );

}




function playNotificationChime() {
    try {
        if (typeof window === 'undefined') return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

function sendDesktopNotification(title, body, onClick) {
    try {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            const notif = new Notification(title, {
                body: body || 'New message in Feenix Team Chat',
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
            if (onClick) {
                notif.onclick = () => {
                    window.focus();
                    onClick();
                };
            }
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    } catch (e) {}
}

export default function AppLayout({ children, user }) {

  const router = useRouter();

  const pathname = usePathname();

  const [unread, setUnread] = useState(0);

  const [alertsList, setAlertsList] = useState([]);

  const [alertOpen, setAlertOpen] = useState(false);

  const [avatar, setAvatar] = useState(user?.profile_picture || null);

  const [unreadChat, setUnreadChat] = useState(0);

  const [metrics, setMetrics] = useState({ today: 0, urgent: 0, changes: 0 });

  const { theme, toggleTheme } = useTheme();



  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [chatToast, setChatToast] = useState(null);
  const prevUnreadChatRef = useRef(0);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTab, setInstallTab] = useState('ios');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setInstallTab(isIOS ? 'ios' : 'android');
    }
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };



    useEffect(() => {
    // Request notification permission smoothly
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        const handleInteraction = () => {
            Notification.requestPermission();
            window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction, { once: true });
    }

    const fetchAdminAlerts = () => {
        if(user?.role === 'admin') {
            fetch('/api/adminData').then(r=>r.json()).then(d=>{
                setUnread(d.unread_count || 0);
                setAlertsList((d.alerts || []).slice(0, 5));
            }).catch(()=>{});
        }
    };

    const fetchChatUnread = () => {
        if (!user) return;
        fetch('/api/chat?unread=1')
            .then(r => r.json())
            .then(d => {
                const currentUnread = d.unread || 0;
                setUnreadChat(currentUnread);

                // If new incoming unread message arrived
                if (currentUnread > prevUnreadChatRef.current && prevUnreadChatRef.current !== 0) {
                    playNotificationChime();
                    sendDesktopNotification('💬 Feenix Team Chat', 'You have new unread messages!', () => {
                        router.push('/chat');
                    });
                    if (pathname !== '/chat') {
                        setChatToast({ count: currentUnread, time: new Date() });
                        setTimeout(() => setChatToast(null), 6000);
                    }
                }
                prevUnreadChatRef.current = currentUnread;
            })
            .catch(() => {});
    };

    fetchAdminAlerts();
    fetchChatUnread();

    const interval = setInterval(() => {
        fetchAdminAlerts();
        fetchChatUnread();
    }, 4000);

    if(user) {
      fetch('/api/tasks').then(r=>r.json()).then(d=>{
          const allTasks = Array.isArray(d.tasks) ? d.tasks : [];
          const todayStr = new Date().toISOString().slice(0, 10);
          let tCount = 0;
          let uCount = 0;
          let cCount = 0;

          allTasks.forEach(t => {
            const isDone = t.status === 'Completed' || t.status === 'Approved';
            if (!isDone) {
              if (t.due_date && t.due_date.slice(0, 10) === todayStr) tCount++;
              if (t.is_urgent) uCount++;
              if (t.status === 'Changes Requested' || t.status === 'Revision' || t.status === 'Pending Approval') cCount++;
            }
          });
          setMetrics({ today: tCount, urgent: uCount, changes: cCount });
      }).catch(()=>{});
    }

    if (user?.profile_picture) {
       setAvatar(user.profile_picture);
    } else if (user) {
       fetch('/api/profile').then(r=>r.json()).then(d=>{
           if (!d.error && d.profile) setAvatar(d.profile.profile_picture);
       }).catch(()=>{});
    }

    return () => clearInterval(interval);
  }, [user, pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', body: JSON.stringify({action:'logout'})});
    router.push('/');
  };

  const userPos = (user?.position || '').toLowerCase();
  
  const isManagingDirector = userPos.includes('managing director') || userPos.includes('(md)') || userPos === 'md';
  const isStrategist = userPos.includes('strategist') || userPos.includes('team lead') || userPos.includes('account manager') || userPos === 'am';
  const isCustomerService = userPos.includes('customer service') || userPos.includes('(cs)') || userPos === 'cs';
  const isCreativeLead = userPos.includes('creative lead') || userPos.includes('graphic qa');
  const isVideoQA = userPos.includes('video qa');
  const isPerformanceMarketer = userPos.includes('performance marketer') || userPos.includes('performance');

  const isAllowedTracker = user?.role === 'admin' || 
    userPos.includes('admin') || 
    userPos.includes('system administrator') ||
    userPos.includes('administrator') ||
    isManagingDirector;

  const isAllowedAssign = user?.role === 'admin' || 
    isManagingDirector ||
    isStrategist ||
    isCreativeLead ||
    isCustomerService;

  const isAllowedPostSchedule = user?.role === 'admin' || 
    isManagingDirector ||
    isStrategist ||
    isPerformanceMarketer ||
    isCreativeLead;

  const isAllowedJobSchedule = user?.role === 'admin' || 
    userPos.includes('admin') ||
    userPos.includes('system administrator') ||
    userPos.includes('administrator') ||
    isManagingDirector ||
    isStrategist ||
    isCustomerService ||
    isCreativeLead;

  const isAllowedMDFreeSlots = user?.role === 'admin' || 
    isManagingDirector || 
    isStrategist ||
    isCreativeLead ||
    isCustomerService;

  const links = user?.role === 'admin' ? [
     { name: 'Workspace', path: '/admin/dashboard', icon: <LayoutDashboard size={20}/> },
     { name: 'Post Scheduling', path: '/admin/post-scheduling', icon: <Calendar size={20}/> },
     { name: 'Job Request', path: '/admin/job-schedule?tab=requests', icon: <ClipboardList size={20}/> },
     { name: 'Job Onboard', path: '/admin/job-schedule?tab=onboard', icon: <Briefcase size={20}/> },
     { name: 'Assign Operation', path: '/admin/assign', icon: <Briefcase size={20}/> },
     { name: 'Operation Registry', path: '/operations', icon: <ClipboardList size={20}/> },
     ...(isAllowedTracker ? [{ name: 'Project Tracker', path: '/admin/tracker', icon: <Table size={20}/> }] : []),
     { name: 'AI Points & Performance', path: '/admin/points', icon: <Award size={20}/> },
     ...(isAllowedMDFreeSlots ? [{ name: 'Shooting Schedule', path: '/admin/md-free-slots', icon: <Calendar size={20}/> }] : []),
     { name: 'Leave Management', path: '/leaves', icon: <Calendar size={20}/> },
     { name: 'Notifications', path: '/alerts', icon: <Bell size={20}/> },
     { name: 'Calendar', path: '/calendar', icon: <Calendar size={20}/> },
     { name: 'Team Chat', path: '/chat', icon: <MessageCircle size={20}/>, badge: unreadChat },
     { name: 'Profile', path: '/profile', icon: <User size={20}/> }
  ] : [
     { name: 'Workspace', path: '/worker/dashboard', icon: <LayoutDashboard size={20}/> },
     ...(isAllowedPostSchedule ? [{ name: 'Post Scheduling', path: '/admin/post-scheduling', icon: <Calendar size={20}/> }] : []),
     ...(isAllowedJobSchedule ? [{ name: 'Job Request', path: '/admin/job-schedule?tab=requests', icon: <ClipboardList size={20}/> }] : []),
     { name: 'Job Onboard', path: '/admin/job-schedule?tab=onboard', icon: <Briefcase size={20}/> },
     ...(isAllowedAssign ? [{ name: 'Assign Operation', path: '/admin/assign', icon: <Briefcase size={20}/> }] : []),
     ...(isAllowedAssign ? [{ name: 'Operation Registry', path: '/operations', icon: <ClipboardList size={20}/> }] : []),
     ...(isAllowedTracker ? [{ name: 'Project Tracker', path: '/admin/tracker', icon: <Table size={20}/> }] : []),
     ...(isAllowedMDFreeSlots ? [{ name: 'Shooting Schedule', path: '/admin/md-free-slots', icon: <Calendar size={20}/> }] : []),
     { name: 'Leave Request', path: '/leaves', icon: <Calendar size={20}/> },
     { name: 'Notifications', path: '/alerts', icon: <Bell size={20}/> },
     { name: 'Calendar', path: '/calendar', icon: <Calendar size={20}/> },
     { name: 'Team Chat', path: '/chat', icon: <MessageCircle size={20}/>, badge: unreadChat },
     { name: 'Profile', path: '/profile', icon: <User size={20}/> }
  ];

  return (
    <div className="app-layout">
        {mobileNavOpen && (
            <div 
                className="mobile-backdrop" 
                onClick={() => setMobileNavOpen(false)}
            />
        )}
        <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
                <div className="sidebar-logo" style={{ margin: 0, padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                   <img 
                      src="/feenix-logo.png" 
                      alt="FEENIX" 
                      style={{ height: '30px', width: 'auto', maxWidth: '160px', objectFit: 'contain', display: 'block' }} 
                   />
                </div>
                <button 
                    className="mobile-close-btn" 
                    onClick={() => setMobileNavOpen(false)}
                    title="Close Navigation"
                >
                    <X size={20} />
                </button>
            </div>
            
            <div className="subtext" style={{fontSize:'0.75em', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', paddingLeft:'15px'}}>Navigation</div>
            
            {links.map(l => {
                if (l.action) {
                    return (
                        <button key={l.name} onClick={l.action} className="sidebar-link" style={{width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit'}}>
                            {l.icon} {l.name}
                        </button>
                    );
                }
                const isDashboard = l.path === '/admin/dashboard' || l.path === '/worker/dashboard';
                return (
                    <Link key={l.path} href={l.path} onClick={() => setMobileNavOpen(false)} className={`sidebar-link ${pathname === l.path ? 'active' : ''}`} style={{position:'relative', display:'flex', alignItems:'center', gap: isDashboard ? '8px' : '12px', padding: isDashboard ? '10px 8px 10px 14px' : '10px 14px'}}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>{l.icon}</span> <span>{l.name}</span>
                        {isDashboard && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: 'auto', flexShrink: 0 }}>
                            {/* Today Works */}
                            <span 
                                title="Today Works" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '1px 4px', fontSize: '0.62em', fontWeight: 700, cursor: 'pointer', lineHeight: '1' }}
                            >
                                <Calendar size={10} />
                                <span>{metrics.today}</span>
                            </span>
                            {/* Urgent Work */}
                            <span 
                                title="Urgent Works" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '1px 4px', fontSize: '0.62em', fontWeight: 700, cursor: 'pointer', lineHeight: '1' }}
                            >
                                <Flame size={10} />
                                <span>{metrics.urgent}</span>
                            </span>
                            {/* Changes */}
                            <span 
                                title="Changes" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '1px 4px', fontSize: '0.62em', fontWeight: 700, cursor: 'pointer', lineHeight: '1' }}
                            >
                                <RotateCcw size={10} />
                                <span>{metrics.changes}</span>
                            </span>
                          </div>
                        )}
                        {!isDashboard && l.badge > 0 && <span style={{marginLeft:'auto', background:'#ef4444', color:'white', borderRadius:'50%', minWidth:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7em', fontWeight:700, padding:'0 4px'}}>{l.badge}</span>}
                    </Link>
                );
            })}

            <div style={{marginTop:'auto', borderTop:'1px solid var(--panel-border)', paddingTop:'14px', display:'flex', flexDirection:'column', gap:'6px'}}>
               <button 
                  onClick={handleInstallClick} 
                  className="sidebar-link" 
                  style={{width:'100%', background:'rgba(59, 130, 246, 0.12)', border:'1px solid rgba(59, 130, 246, 0.25)', borderRadius:'10px', cursor:'pointer', color:'#60a5fa', fontWeight:600, display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', transition:'all 0.2s', textAlign:'left', fontFamily:'inherit'}}
                  title="Install Feenix App on your phone or desktop"
               >
                  <Smartphone size={18}/> <span>{deferredPrompt ? '📲 Install App' : '📱 Mobile App'}</span>
               </button>

               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px'}}>
                 <a 
                    href="/FeenixPortal.apk" 
                    download="FeenixPortal.apk"
                    className="sidebar-link" 
                    style={{background:'rgba(16, 185, 129, 0.12)', border:'1px solid rgba(16, 185, 129, 0.25)', borderRadius:'10px', cursor:'pointer', color:'#34d399', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'8px 6px', textDecoration:'none', transition:'all 0.2s', boxSizing:'border-box', fontSize:'0.8em'}}
                    title="Download Native Android APK File"
                 >
                    <Download size={14}/> <span>Android</span>
                 </a>

                 <button 
                    onClick={() => { setInstallTab('ios'); setShowInstallModal(true); }}
                    className="sidebar-link" 
                    style={{background:'rgba(244, 63, 94, 0.12)', border:'1px solid rgba(244, 63, 94, 0.25)', borderRadius:'10px', cursor:'pointer', color:'#fb7185', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'8px 6px', transition:'all 0.2s', boxSizing:'border-box', fontSize:'0.8em', fontFamily:'inherit'}}
                    title="Install on iPhone / iPad (iOS)"
                 >
                    <Apple size={14}/> <span>iPhone</span>
                 </button>
               </div>

               <button onClick={handleLogout} className="sidebar-link" style={{width:'100%', background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:'9px 12px', marginTop:'4px'}}>
                  <LogOut size={18}/> Log Out
               </button>
            </div>
        </aside>

        <main className="main-wrapper">

            <header className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <button 
                        className="mobile-hamburger-btn" 
                        onClick={() => setMobileNavOpen(true)}
                        title="Open Navigation Menu"
                        type="button"
                    >
                        <Menu size={22} />
                    </button>
                    <img 
                        src="/feenix-logo.png" 
                        alt="FEENIX" 
                        className="topbar-mobile-logo" 
                        style={{ height: '22px', width: 'auto', maxWidth: '100px', objectFit: 'contain' }} 
                    />
                    <h2 className="topbar-title" style={{margin:0, fontSize:'1.25em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{pathname === '/admin/dashboard' || pathname === '/worker/dashboard' ? 'Overview' : pathname === '/profile' ? 'Identity Profile' : pathname === '/leaves' ? 'Leave Portal' : pathname === '/alerts' ? 'Notifications' : pathname === '/admin/tracker' ? 'Project Tracker' : pathname === '/calendar' ? 'Company Schedule' : pathname === '/admin/job-schedule' ? 'Job Request' : pathname === '/admin/job-onboard' ? 'Job Onboard' : pathname === '/chat' ? 'Team Chat' : pathname === '/operations' ? 'Operation Registry' : pathname === '/admin/assign' ? 'Assign Operation' : pathname === '/admin/points' ? 'AI Points & Performance' : pathname === '/admin/md-free-slots' ? 'Shooting Schedule' : 'Overview'}</h2>

                </div>

                <div className="topbar-right">

                   <button 
                       onClick={() => {
                           if (typeof window !== 'undefined') {
                               window.location.reload();
                           }
                       }} 
                       className="btn-icon" 
                       title="Refresh & Sync"
                       style={{ color: 'var(--text-muted)' }}
                   >
                       <RotateCcw size={18} />
                   </button>

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

                                       <Link href="/alerts" className="btn-secondary" style={{padding:'4px 8px', fontSize:'0.75em', border:'none', background:'var(--glow-1)', color:'#3b82f6'}} onClick={()=>setAlertOpen(false)}>View Notifications</Link>

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



                   {/* Header Profile Dropdown Menu */}

                   <div style={{ position: 'relative' }}>

                       <div 
                           className="topbar-user-pill"
                           onClick={() => setProfileMenuOpen(!profileMenuOpen)} 
                           style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.08)', padding: '5px 14px', borderRadius: '30px', border: '1px solid var(--panel-border)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                           title="Account Menu & Profile Settings"
                       >

                          {avatar && avatar !== 'default.png' ? (

                              <SafeAvatar src={avatar} name={user?.name || 'User'} size={32} />

                          ) : (

                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9em', fontWeight: 700, flexShrink: 0 }}>

                                  {user?.name?.charAt(0)}

                              </div>

                          )}

                          <div className="topbar-user-info" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>

                              <span className="topbar-user-name" style={{ fontSize: '0.88em', fontWeight: 700 }}>{user?.name}</span>

                              <span className="topbar-user-pos" style={{ fontSize: '0.72em', color: 'var(--text-muted)' }}>{user?.position || (user?.role === 'admin' ? 'Administrator' : 'Team Member')}</span>

                          </div>

                       </div>



                       {profileMenuOpen && (

                           <div style={{ position: 'absolute', top: '55px', right: '0', width: '240px', background: 'var(--panel-bg, #0f172a)', backdropFilter: 'blur(20px)', border: '1px solid var(--panel-border, rgba(255,255,255,0.15))', borderRadius: '18px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)', zIndex: 9999, overflow: 'hidden', padding: '8px' }}>

                               <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--panel-border)', marginBottom: '4px' }}>

                                   <div style={{ fontWeight: 800, fontSize: '0.92em', color: 'var(--text-main)' }}>{user?.name}</div>

                                   <div style={{ fontSize: '0.78em', color: '#a855f7', fontWeight: 700, marginTop: '2px' }}>

                                       🏷️ {user?.position || (user?.role === 'admin' ? 'System Administrator' : 'Staff Member')}

                                   </div>

                               </div>

                               

                               <Link 

                                   href="/profile" 

                                   onClick={() => setProfileMenuOpen(false)}

                                   style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.88em', fontWeight: 600, transition: 'background 0.15s' }}

                               >

                                   <User size={18} color="#3b82f6" /> Identity Profile

                               </Link>



                               {isAllowedMDFreeSlots && (

                                   <Link 

                                       href="/admin/md-free-slots" 

                                       onClick={() => setProfileMenuOpen(false)}

                                       style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.88em', fontWeight: 600, transition: 'background 0.15s' }}

                                   >

                                       <Calendar size={18} color="#a855f7" /> MD Free Slots

                                   </Link>

                               )}



                               <div style={{ borderTop: '1px solid var(--panel-border)', marginTop: '4px', paddingTop: '4px' }}>

                                   <button 

                                       onClick={() => { setProfileMenuOpen(false); handleLogout(); }}

                                       style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', borderRadius: '10px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: 'none', fontSize: '0.88em', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}

                                   >

                                       <LogOut size={18} color="#ef4444" /> Log Out

                                   </button>

                               </div>

                           </div>

                       )}

                   </div>



                </div>

            </header>

            

            <div className="content-area" style={{ display: 'flex', flexDirection: 'column', minHeight: pathname === '/chat' ? 'calc(100dvh - 75px)' : 'calc(100vh - 85px)' }}>

                <div style={{ flex: 1, display: pathname === '/chat' ? 'flex' : undefined, flexDirection: pathname === '/chat' ? 'column' : undefined }}>

                    {children}

                </div>

                {pathname !== '/chat' && (
                    <footer className="app-footer" style={{ 
                        marginTop: 'auto', 
                        padding: '24px 20px', 
                        borderTop: '1px solid var(--panel-border)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        color: 'var(--text-muted)', 
                        fontSize: '0.85em',
                        background: 'var(--panel-bg)',
                        backdropFilter: 'blur(10px)'
                    }}>

                        <div>
                            &copy; {new Date().getFullYear()} Feenix System. All rights reserved.
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#3b82f6'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Privacy Policy</a>
                            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#3b82f6'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Terms of Service</a>
                            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#3b82f6'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Support</a>
                        </div>

                    </footer>
                )}

            </div>

        </main>

        {showInstallModal && (
            <div 
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.78)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}
                onClick={() => setShowInstallModal(false)}
            >
                <div 
                    style={{
                        background: 'var(--panel-bg, #0f172a)',
                        border: '1px solid var(--panel-border, rgba(255,255,255,0.15))',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '460px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '22px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        color: 'var(--text-main, #f8fafc)',
                        position: 'relative'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                                src="/feenix-icon.png" 
                                alt="Feenix" 
                                style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
                            />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 700 }}>Feenix Mobile App</h3>
                                <p style={{ margin: 0, fontSize: '0.78em', color: 'var(--text-muted, #94a3b8)' }}>Install on your phone</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowInstallModal(false)}
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '18px' }}>
                        <button
                            onClick={() => setInstallTab('ios')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                border: 'none',
                                borderRadius: '9px',
                                fontWeight: 700,
                                fontSize: '0.86em',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: installTab === 'ios' ? '#2563eb' : 'transparent',
                                color: installTab === 'ios' ? '#fff' : 'var(--text-muted, #94a3b8)'
                            }}
                        >
                            <Apple size={16} /> <span>iPhone / iOS</span>
                        </button>
                        <button
                            onClick={() => setInstallTab('android')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                border: 'none',
                                borderRadius: '9px',
                                fontWeight: 700,
                                fontSize: '0.86em',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: installTab === 'android' ? '#10b981' : 'transparent',
                                color: installTab === 'android' ? '#fff' : 'var(--text-muted, #94a3b8)'
                            }}
                        >
                            <Smartphone size={16} /> <span>Android</span>
                        </button>
                    </div>

                    {/* iOS Tab Content */}
                    {installTab === 'ios' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: '#60a5fa', fontSize: '0.9em' }}>
                                    <span>🌟 ක්‍රමය 1: Safari හරහා (ඉතා පහසුයි)</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82em', color: 'var(--text-main, #e2e8f0)', lineHeight: '1.4' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75em', flexShrink: 0, fontWeight: 700 }}>1</span>
                                        <span>iPhone එකේ <strong>Safari</strong> Browser එකෙන් <strong>portal.hivelankan.com</strong> විවෘත කරන්න.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75em', flexShrink: 0, fontWeight: 700 }}>2</span>
                                        <span>තිරයේ පහළ ඇති <strong>Share</strong> බොත්තම (<Share size={13} style={{display:'inline', verticalAlign:'middle'}}/>) ඔබන්න.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75em', flexShrink: 0, fontWeight: 700 }}>3</span>
                                        <span>මෙනුවෙන් <strong>&ldquo;Add to Home Screen&rdquo;</strong> (➕) තෝරන්න.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75em', flexShrink: 0, fontWeight: 700 }}>4</span>
                                        <span>ඉහළ දකුණු කෙළවරේ ඇති <strong>&ldquo;Add&rdquo;</strong> ඔබන්න.</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px', padding: '6px 10px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', fontSize: '0.75em', color: '#93c5fd' }}>
                                    ✨ Safari address bar නොමැතිව සාමාන්‍ය App එකක් ලෙස Full Screen ක්‍රියා කරයි!
                                </div>
                            </div>

                            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: '#fb7185', fontSize: '0.9em' }}>
                                    <Apple size={16} /> <span>ක්‍රමය 2: iOS Configuration Profile</span>
                                </div>
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.4' }}>
                                    Apple WebClip Profile මගින් Home Screen එකට App Icon එක එක් කරගන්න:
                                </p>
                                <a 
                                    href="/feenix.mobileconfig" 
                                    download="feenix.mobileconfig"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: '#e11d48',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85em',
                                        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                                    }}
                                >
                                    <Download size={16} /> Download iOS Profile (.mobileconfig)
                                </a>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.74em', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.3' }}>
                                    Download පසු: iPhone <strong>Settings</strong> &gt; <strong>Profile Downloaded</strong> &gt; <strong>Install</strong> තෝරන්න.
                                </p>
                            </div>

                            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: '#a78bfa', fontSize: '0.9em' }}>
                                    <Apple size={16} /> <span>ක්‍රමය 3: iOS .ipa Package File</span>
                                </div>
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.4' }}>
                                    AltStore / Sideloadly මගින් iPhone එකට Sideload කිරීමට .ipa Package එක:
                                </p>
                                <a 
                                    href="/FeenixPortal.ipa" 
                                    download="FeenixPortal.ipa"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: '#7c3aed',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85em',
                                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                                    }}
                                >
                                    <Download size={16} /> Download FeenixPortal.ipa
                                </a>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.72em', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.3' }}>
                                    ⚠️ සටහන: Apple iOS හි .ipa file එකක් click කර කෙලින්ම run කළ නොහැක. එය PC එකක් හරහා Sideloadly / AltStore මගින් sign කර install කළ යුතුය.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Android Tab Content */}
                    {installTab === 'android' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: '#34d399', fontSize: '0.9em' }}>
                                    <span>🤖 Native Android APK</span>
                                </div>
                                <p style={{ margin: '0 0 12px 0', fontSize: '0.82em', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.4' }}>
                                    Android සඳහා වෙනම නිමවූ Release APK එක Download කරගන්න:
                                </p>
                                <a 
                                    href="/FeenixPortal.apk" 
                                    download="FeenixPortal.apk"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '11px 14px',
                                        borderRadius: '10px',
                                        background: '#059669',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.88em',
                                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                                    }}
                                >
                                    <Download size={16} /> Download FeenixPortal.apk (8 MB)
                                </a>
                                <div style={{ marginTop: '10px', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', fontSize: '0.74em', color: '#6ee7b7' }}>
                                    💡 Download වූ පසු Open කර &ldquo;Allow from this source&rdquo; ලබාදී Install කරගන්න.
                                </div>
                            </div>

                            {deferredPrompt && (
                                <button
                                    onClick={() => {
                                        deferredPrompt.prompt();
                                        deferredPrompt.userChoice.then(() => setShowInstallModal(false));
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85em',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <CheckCircle2 size={16} /> Install Web App Directly
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

    </div>

  );

}

