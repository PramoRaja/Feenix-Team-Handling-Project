'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
    LayoutDashboard, Users, FileWarning, User, LogOut, Hexagon, Bell, 
    Sun, Moon, Calendar, MessageCircle, Briefcase, ClipboardList, 
    Table, Award, Smartphone, Download, X, Menu, Apple, CheckCircle2 
} from 'lucide-react';
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

export default function AppLayout({ children, user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [alertsList, setAlertsList] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [avatar, setAvatar] = useState(user?.profile_picture || null);
  const [unreadChat, setUnreadChat] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTab, setInstallTab] = useState('ios');

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setInstallTab(isIOS ? 'ios' : 'android');

      const handleBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/adminData').then(r => r.json()).then(d => {
          setUnread(d.unread_count || 0);
          setAlertsList((d.alerts || []).slice(0, 5));
      }).catch(() => {});
    }

    if (user) {
      fetch('/api/chat?unread=1').then(r => r.json()).then(d => setUnreadChat(d.unread || 0)).catch(() => {});
      
      const chatInterval = setInterval(() => {
          fetch('/api/chat?unread=1').then(r => r.json()).then(d => setUnreadChat(d.unread || 0)).catch(() => {});
      }, 5000);

      return () => clearInterval(chatInterval);
    }
  }, [user]);

  useEffect(() => {
    if (user?.profile_picture) {
       setAvatar(user.profile_picture);
    } else if (user) {
       fetch('/api/profile').then(r => r.json()).then(d => {
           if (!d.error && d.profile) setAvatar(d.profile.profile_picture);
       }).catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
    router.push('/');
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') setDeferredPrompt(null);
      });
    } else {
      setShowInstallModal(true);
    }
  };

  // Role & permission calculations for worker links
  const userPos = (user?.position || '').toLowerCase();
  const isManagingDirector = userPos.includes('managing director') || userPos.includes('(md)') || userPos === 'md';
  const isStrategist = userPos.includes('strategist') || userPos.includes('team lead') || userPos.includes('account manager') || userPos === 'am';
  const isCustomerService = userPos.includes('customer service') || userPos.includes('(cs)') || userPos === 'cs';
  const isCreativeLead = userPos.includes('creative lead') || userPos.includes('graphic qa');
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

  // System Administrator: Original clean 7 links
  // Workers: Dashboard and their permitted tools
  const links = user?.role === 'admin' ? [
     { name: 'Workspace', path: '/admin/dashboard', icon: <LayoutDashboard size={20}/> },
     { name: 'Assign Operation', path: '/admin/assign', icon: <Briefcase size={20}/> },
     { name: 'Operation Registry', path: '/operations', icon: <ClipboardList size={20}/> },
     { name: 'System Logs', path: '/alerts', icon: <FileWarning size={20}/> },
     { name: 'Company Schedule', path: '/calendar', icon: <Calendar size={20}/> },
     { name: 'Team Chat', path: '/chat', icon: <MessageCircle size={20}/>, badge: unreadChat },
     { name: 'My Identity', path: '/profile', icon: <User size={20}/> }
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
     { name: 'My Identity', path: '/profile', icon: <User size={20}/> }
  ];

  const getPageTitle = () => {
    if (pathname === '/admin/dashboard' || pathname === '/worker/dashboard' || pathname === '/dashboard') return 'Overview';
    if (pathname === '/profile') return 'Identity Profile';
    if (pathname === '/alerts') return user?.role === 'admin' ? 'System Logs' : 'Notifications';
    if (pathname === '/admin/assign') return 'Assign Operation';
    if (pathname === '/operations') return 'Operation Registry';
    if (pathname === '/calendar') return 'Company Schedule';
    if (pathname === '/chat') return 'Team Chat';
    if (pathname === '/admin/tracker') return 'Project Tracker';
    if (pathname === '/admin/post-scheduling') return 'Post Scheduling';
    if (pathname === '/admin/job-schedule') return 'Job Schedule';
    if (pathname === '/admin/md-free-slots') return 'Shooting Schedule';
    if (pathname === '/leaves') return 'Leave Portal';
    return 'Overview';
  };

  return (
    <div className="app-layout">
        {mobileNavOpen && (
            <div 
                className="mobile-backdrop" 
                onClick={() => setMobileNavOpen(false)}
            />
        )}

        {/* Sidebar Navigation */}
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
            
            <div className="subtext" style={{ fontSize: '0.75em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '15px' }}>
                Navigation
            </div>
            
            {links.map(l => {
                const isActive = pathname === l.path || (l.path === '/admin/dashboard' && pathname === '/dashboard');
                return (
                    <Link 
                        key={l.path} 
                        href={l.path} 
                        onClick={() => setMobileNavOpen(false)} 
                        className={`sidebar-link ${isActive ? 'active' : ''}`} 
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center' }}>{l.icon}</span> 
                        <span>{l.name}</span>
                        {l.badge > 0 && (
                            <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 700, padding: '0 4px' }}>
                                {l.badge}
                            </span>
                        )}
                    </Link>
                );
            })}

            {/* Sidebar Bottom Footer: Clean Terminate Session + Mobile-only install actions */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               
               {/* Mobile-only app installation links (Strictly hidden on desktop website) */}
               <div className="mobile-install-actions">
                   <button 
                      onClick={handleInstallClick} 
                      className="sidebar-link" 
                      style={{ width: '100%', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', cursor: 'pointer', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', textAlign: 'left', fontFamily: 'inherit' }}
                   >
                      <Smartphone size={18}/> <span>{deferredPrompt ? '📲 Install App' : '📱 Mobile App'}</span>
                   </button>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                     <a 
                        href="/FeenixPortal.apk" 
                        download="FeenixPortal.apk"
                        className="sidebar-link" 
                        style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', cursor: 'pointer', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 6px', textDecoration: 'none', fontSize: '0.8em' }}
                     >
                        <Download size={14}/> <span>Android</span>
                     </a>
                     <button 
                        onClick={() => { setInstallTab('ios'); setShowInstallModal(true); }}
                        className="sidebar-link" 
                        style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '10px', cursor: 'pointer', color: '#fb7185', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 6px', fontSize: '0.8em', fontFamily: 'inherit' }}
                     >
                        <Apple size={14}/> <span>iPhone</span>
                     </button>
                   </div>
               </div>

               {/* Terminate Session Button (Clean and consistent) */}
               <button 
                  onClick={handleLogout} 
                  className="sidebar-link" 
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px' }}
               >
                  <LogOut size={18}/> Terminate Session
               </button>
            </div>
        </aside>

        {/* Main Content Area */}
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
                    <h2 className="topbar-title" style={{ margin: 0, fontSize: '1.4em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getPageTitle()}
                    </h2>
                </div>

                <div className="topbar-right">
                   <button onClick={toggleTheme} className="btn-icon" title="Toggle Theme">
                       {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
                   </button>

                   {user?.role === 'admin' && (
                       <div style={{ position: 'relative' }}>
                           <button 
                               onClick={() => { 
                                   setAlertOpen(!alertOpen); 
                                   if (unread > 0) { 
                                       fetch('/api/adminData', { method: 'PUT' }); 
                                       setUnread(0); 
                                   } 
                               }} 
                               className="btn-icon"
                               title="Leader Alerts"
                           >
                               <Bell size={20} />
                               {unread > 0 && (
                                   <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.65em', padding: '2px 6px', borderRadius: '50%', fontWeight: 'bold' }}>
                                       {unread}
                                   </span>
                               )}
                           </button>

                           {alertOpen && (
                               <div style={{ position: 'absolute', top: '55px', right: '0', width: '350px', background: 'var(--panel-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--panel-border)', borderRadius: '16px', boxShadow: 'var(--card-shadow)', zIndex: 100, overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
                                   <div style={{ padding: '15px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                       <strong style={{ fontSize: '1em' }}>Leader Alerts</strong>
                                       <Link href="/alerts" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75em', border: 'none', background: 'var(--glow-1)', color: '#3b82f6' }} onClick={() => setAlertOpen(false)}>
                                           View System Logs
                                       </Link>
                                   </div>
                                   <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                       {alertsList.length > 0 ? alertsList.map(a => (
                                           <div key={a.id} style={{ padding: '15px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', fontSize: '0.9em', display: 'flex', flexDirection: 'column', gap: '5px', background: a.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.05)' }}>
                                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                   <strong style={{ color: '#60a5fa' }}>{a.name}</strong>
                                                   <span style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                               </div>
                                               <div style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>{a.message}</div>
                                           </div>
                                       )) : (
                                           <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending approvals or alerts.</div>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>
                   )}

                   {/* User Profile Pill */}
                   <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }} title="View Identity Profile">
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.05)', padding: '5px 14px', borderRadius: '30px', border: '1px solid var(--panel-border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <SafeAvatar src={avatar} name={user?.name || 'User'} size={32} />
                          <span style={{ fontSize: '0.9em', fontWeight: 600 }}>{user?.name}</span>
                       </div>
                   </Link>
                </div>
            </header>

            <div className="content-area">
                {children}
            </div>
        </main>

        {/* Mobile App Install Modal (Only accessible on mobile via mobile drawer) */}
        {showInstallModal && (
            <div 
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
                onClick={() => setShowInstallModal(false)}
            >
                <div 
                    style={{
                        background: 'var(--panel-bg, #0f172a)',
                        border: '1px solid var(--panel-border, rgba(255, 255, 255, 0.15))',
                        borderRadius: '24px',
                        maxWidth: '460px',
                        width: '100%',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setShowInstallModal(false)}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                        <img src="/feenix-logo.png" alt="FEENIX" style={{ height: '24px', width: 'auto' }} />
                        <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 800, color: 'var(--text-main)' }}>Install Feenix App</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px' }}>
                        <button
                            onClick={() => setInstallTab('ios')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: installTab === 'ios' ? '#3b82f6' : 'transparent',
                                color: installTab === 'ios' ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <Apple size={16} /> iPhone / iPad
                        </button>
                        <button
                            onClick={() => setInstallTab('android')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: installTab === 'android' ? '#10b981' : 'transparent',
                                color: installTab === 'android' ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <span>🤖</span> Android
                        </button>
                    </div>

                    {installTab === 'ios' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.9em', marginBottom: '6px' }}>
                                    Safari &gt; Share &gt; Add to Home Screen
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                    iPhone හි Safari browser එකෙන් මෙම වෙබ් අඩවිය විවෘත කර, පහළ Share icon එක ඔබා &ldquo;Add to Home Screen&rdquo; තෝරන්න.
                                </p>
                            </div>
                            <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <a 
                                    href="/feenix.mobileconfig" 
                                    download="feenix.mobileconfig"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#e11d48', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.85em' }}
                                >
                                    <Download size={16} /> Download iOS Profile (.mobileconfig)
                                </a>
                            </div>
                        </div>
                    )}

                    {installTab === 'android' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '14px' }}>
                                <a 
                                    href="/FeenixPortal.apk" 
                                    download="FeenixPortal.apk"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px 14px', borderRadius: '10px', background: '#059669', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.88em' }}
                                >
                                    <Download size={16} /> Download FeenixPortal.apk (8 MB)
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
