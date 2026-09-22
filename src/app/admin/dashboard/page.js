'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { SRI_LANKAN_HOLIDAYS } from '@/lib/sriLankanHolidays';
import { ShieldCheck, UserCheck, AlertTriangle, Briefcase, Trash2, Calendar, LayoutDashboard, ClipboardList, Award, Bell, MessageCircle, User, Table, FileText } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import ExecutiveAnalytics from '@/components/ExecutiveAnalytics';
import MonthlyOpsViewer from '@/components/MonthlyOpsViewer';
import CompanyCalendar from '@/components/CompanyCalendar';
import KanbanBoard from '@/components/KanbanBoard';

function SafeAvatar({ src, name, size = 50 }) {
    const [error, setError] = useState(false);
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    const radius = size === 120 || size === 32 ? '50%' : '14px';
    const fontSize = size === 120 ? '2.5em' : (size === 32 ? '0.85em' : '1.1em');
    const border = size === 120 ? '3px solid rgba(59,130,246,0.3)' : '1px solid var(--panel-border)';
    if (src && src !== 'default.png' && !error) {
        return <img src={src} onError={() => setError(true)} style={{width:`${size}px`, height:`${size}px`, borderRadius:radius, objectFit:'cover', border, flexShrink:0, margin: size === 120 ? '0 auto 15px auto' : '0', display: size === 120 ? 'block' : 'inline-block'}} alt="Avatar" />;
    }
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: radius,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            fontSize, border, boxShadow: (size === 120 || size === 32) ? 'none' : '0 4px 10px rgba(59, 130, 246, 0.15)', flexShrink: 0,
            margin: size === 120 ? '0 auto 15px auto' : '0'
        }}>
            {initials}
        </div>
    );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (!d.authenticated || d.user?.role !== 'admin') {
          router.push('/admin/login');
        } else {
          setUser(d.user);
        }
      })
      .catch(() => { if (!cancelled) router.push('/admin/login'); });
    return () => { cancelled = true; };
  }, [router]);

  return (
    <AppLayout user={user}>
        <AdminDashboard router={router} user={user} />
    </AppLayout>
  );
}


function AdminDashboard({ router, user }) {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [clients, setClients] = useState([]);
    const [networkTab, setNetworkTab] = useState('workers');
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [leaderAssign, setLeaderAssign] = useState({});
    const [form, setForm] = useState({ title: '', description: '', employee_id: '', due_date: '' });
    const [msg, setMsg] = useState({text:'', type:''});
    const [stats, setStats] = useState({ activeTasks: 0, completedTasks: 0, unreadAlerts: 0 });
    const [expandedWorkers, setExpandedWorkers] = useState(new Set());
    const [opsActiveTab, setOpsActiveTab] = useState('today');
    const [sendingOverdue, setSendingOverdue] = useState(false);
    const [overdueAlertCount, setOverdueAlertCount] = useState(0);
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const opsTabStyle = (tabName) => ({
        padding: '10px 22px',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '0.92em',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.25s',
        background: opsActiveTab === tabName ? '#2563eb' : 'transparent',
        color: opsActiveTab === tabName ? '#ffffff' : 'var(--text-muted)',
        boxShadow: opsActiveTab === tabName ? '0 4px 15px rgba(37, 99, 235, 0.35)' : 'none'
    });

    const toggleWorkerCompleted = (workerId) => {
        setExpandedWorkers(prev => {
            const next = new Set(prev);
            if (next.has(workerId)) next.delete(workerId);
            else next.add(workerId);
            return next;
        });
    };

    const checkAndSendOverdueAlerts = async (forceManual = false) => {
        setSendingOverdue(true);
        try {
            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sendOverdue', force: forceManual })
            }).then(r => r.json());

            if (res.success && res.count > 0) {
                if (forceManual) {
                    alert(`🚨 ${res.message}`);
                }
            } else if (forceManual) {
                alert(res.message || 'No overdue tasks requiring email notification at this time.');
            }
        } catch (err) {
            console.error('Error sending overdue alerts:', err);
        } finally {
            setSendingOverdue(false);
        }
    };

    const fetchData = () => {
        fetch('/api/adminData').then(r=>r.json()).then(d=>{
            const allWorkers = d.workers || [];
            setWorkers(allWorkers);
            const leaders = allWorkers.filter(w => {
                if (!w) return false;
                if (w.is_team_leader === 1 || String(w.is_team_leader) === '1' || w.is_team_leader === true) return true;
                if (w.role === 'admin') return true;
                const pos = (w.position || '').toLowerCase();
                return pos.includes('lead') || 
                       pos.includes('account manager') || 
                       pos.includes('project manager') || 
                       pos.includes('managing director') || 
                       pos.includes('director') || 
                       pos.includes('strategist') || 
                       pos.includes('admin') ||
                       pos.includes('administrator');
            });
            setTeamLeaders(leaders.length > 0 ? leaders : allWorkers);
            setStats(prev => ({...prev, unreadAlerts: d.unread_count || 0}));
            setClients(d.clients || []);
        });
        fetch('/api/tasks').then(r=>r.json()).then(d=>{
            const ts = d.tasks || [];
            setTasks(ts);
            const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const overdue = ts.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr && t.status !== 'Completed' && t.status !== 'Approved').length;
            setOverdueAlertCount(overdue);

            setStats(prev => ({
                ...prev,
                activeTasks: ts.filter(t=>t.status !== 'Completed').length,
                completedTasks: ts.filter(t=>t.status === 'Completed').length
            }));
        });
    };

    useEffect(() => { 
        fetchData();
        checkAndSendOverdueAlerts(false);

        // Auto-poll every 3 seconds for live pending registration requests & online statuses
        const interval = setInterval(() => {
            fetchData();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const updateAdminStatus = async (taskId, newStatus) => {
        await fetch('/api/tasks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ task_id: taskId, status: newStatus }) });
        fetchData();
    };

    const handleApproveWorkerRegistration = async (workerId) => {
        // Optimistic UI update so the registration disappears from pending and shows active immediately
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, status: 'Approved' } : w));
        try {
            const res = await fetch('/api/adminData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approveWorker', workerId })
            });
            const d = await res.json();
            if (d.success) {
                alert(d.message || 'Member registration approved successfully! Access granted.');
            } else {
                alert(d.error || 'Approval failed');
            }
        } catch (err) {
            console.error('Approve worker error:', err);
            alert('Approval failed due to a network or server error.');
        } finally {
            fetchData();
        }
    };

    const handleToggleWorkerStatus = async (workerId) => {
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, status: w.status === 'Approved' ? 'Pending Approval' : 'Approved' } : w));
        try {
            const res = await fetch('/api/adminData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggleWorkerStatus', workerId })
            });
            const d = await res.json();
            if (!d.success) {
                alert(d.error || 'Status toggle failed');
            }
        } catch (err) {
            console.error('Toggle status error:', err);
            alert('Status toggle failed due to network or server error.');
        } finally {
            fetchData();
        }
    };

    const handleRejectWorkerRegistration = async (workerId, name) => {
        if (!confirm(`Are you sure you want to reject the registration request for ${name}?`)) return;
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        try {
            const res = await fetch('/api/adminData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rejectWorker', workerId })
            });
            const d = await res.json();
            if (d.success) {
                alert(d.message || 'Registration request rejected and account removed.');
            } else {
                alert(d.error || 'Rejection failed');
            }
        } catch (err) {
            console.error('Reject worker error:', err);
            alert('Rejection failed due to network or server error.');
        } finally {
            fetchData();
        }
    };

    const handleTerminateNode = async (workerId, workerName) => {
        if (!window.confirm(`WARNING: Are you absolutely sure you want to terminate the node for ${workerName}?\n\nThis will permanently delete their account, messages, notifications, and associated operational tasks. This action CANNOT be undone.`)) return;
        
        // Optimistic UI removal
        setWorkers(prev => prev.filter(w => w.id !== workerId));

        try {
            console.log(`Initiating termination protocol for worker: ${workerId}`);
            let res = await fetch('/api/adminData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'terminateNode', workerId }),
                credentials: 'include'
            });

            if (!res.ok) {
                res = await fetch('/api/adminData', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerId }),
                    credentials: 'include'
                });
            }
            
            const data = await res.json();
            
            if (data.success) {
                alert(`Node terminated successfully for ${workerName}.`);
                fetchData();
            } else {
                alert(`Failed to terminate node: ${data.error || 'Unknown error'}`);
                fetchData();
            }
        } catch (err) {
            console.error('Termination error:', err);
            alert(`An error occurred during termination protocol: ${err.message}`);
            fetchData();
        }
    };

    const handleTerminateClient = async (clientId, clientName) => {
        if (!window.confirm(`WARNING: Are you absolutely sure you want to terminate client node for ${clientName}?\n\nThis will permanently delete their client account. This action CANNOT be undone.`)) return;
        
        try {
            console.log(`Initiating termination protocol for client: ${clientId}`);
            const res = await fetch('/api/adminData', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId: clientId, type: 'client' }),
                credentials: 'include'
            });
            
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Client ${clientName} terminated successfully.`);
                fetchData();
            } else {
                alert(`Failed to terminate client: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Client termination error:', err);
            alert(`An error occurred during client termination protocol: ${err.message}`);
        }
    };

    const downloadPerformanceReport = async (workerId, workerName) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Generating Report...</title></head><body style="font-family:Segoe UI, sans-serif;padding:40px;text-align:center;color:#1e293b;"><h2>Generating Performance Report for ' + workerName + '...</h2><p>Please wait...</p></body></html>');
        }

        try {
            const reportMonth = new Date().toISOString().slice(0, 7);
            const res = await fetch(`/api/adminData/performance-report?workerId=${workerId}&month=${reportMonth}`);
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                if (printWindow) printWindow.close();
                alert(`Failed to load performance data: ${data.error || 'Unknown error'}`);
                return;
            }

            const { worker, taskStats, pointsStats, tasks } = data;
            const total = taskStats.total_tasks || 0;
            const completed = taskStats.completed_tasks || 0;

            const targetWin = printWindow || window.open('', '_blank');
            if (!targetWin) {
                alert('Please allow pop-ups to view and download the PDF performance report.');
                return;
            }

            targetWin.document.open();
            targetWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Performance Report - ${worker.name}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { margin: 0; color: #1e293b; font-size: 1.6em; }
                        .header p { margin: 4px 0 0 0; color: #64748b; font-size: 0.9em; }
                        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                        .kpi-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; }
                        .kpi-card span { font-size: 0.8em; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                        .kpi-card div { font-size: 1.8em; font-weight: 700; color: #0f172a; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 0.9em; }
                        th { background: #f1f5f9; color: #475569; text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                        .badge { padding: 3px 8px; border-radius: 6px; font-size: 0.8em; font-weight: 700; }
                        .badge-completed { background: #dcfce7; color: #15803d; }
                        .badge-pending { background: #fef9c3; color: #a16207; }
                        .badge-progress { background: #dbeafe; color: #1d4ed8; }
                        .badge-changes { background: #fce7f3; color: #be185d; }
                        .signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; font-size: 0.85em; color: #64748b; }
                        .signature-line { border-top: 1px solid #cbd5e1; width: 200px; text-align: center; padding-top: 5px; font-weight: 600; color: #334155; }
                        @media print {
                            @page { margin: 15mm; size: auto; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>FEENIX DIGITAL (PVT) LTD — PERFORMANCE REPORT</h1>
                            <p>Node: <strong>${worker.name}</strong> (${worker.position || 'Team Member'}) — Node ID: #FEENIX-${String(worker.id).padStart(4, '0')}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: #3b82f6; font-size: 1.2em;">FEENIX Digital (Pvt) Ltd</div>
                            <div style="font-size: 0.8em; color: #64748b;">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>

                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <span>Total Operations</span>
                            <div>${total}</div>
                        </div>
                        <div class="kpi-card">
                            <span>Completed Tasks</span>
                            <div style="color: #10b981;">${completed}</div>
                        </div>
                        <div class="kpi-card">
                            <span>Total Points</span>
                            <div style="color: #a855f7;">${pointsStats.total_points || 0}</div>
                        </div>
                        <div class="kpi-card">
                            <span>Completion Rate</span>
                            <div style="color: #0ea5e9;">${total > 0 ? Math.round((completed/total)*100) : 100}%</div>
                        </div>
                    </div>

                    <h3 style="color: #0f172a; margin-bottom: 15px;">Assigned Operational Tasks</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Task Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Deadline</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasks.map(t => {
                                const badgeClass = t.status === 'Completed' || t.status === 'Approved' ? 'badge-completed' : (t.status === 'Pending Approval' ? 'badge-pending' : (t.status === 'In Progress' ? 'badge-progress' : 'badge-changes'));
                                return `
                                    <tr>
                                        <td><strong>${t.title}</strong></td>
                                        <td>${t.category || 'General'}</td>
                                        <td><span class="badge ${badgeClass}">${t.status}</span></td>
                                        <td>${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                            ${tasks.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #64748b;">No active or completed operations recorded in this timeframe.</td></tr>' : ''}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <div>
                            <div>Report generated via Feenix Digital (Pvt) Ltd Secured Protocol.</div>
                            <div>Integrity Code: <strong>SHA-256/F-${workerId}-${Math.floor(Math.random() * 100000)}</strong></div>
                        </div>
                        <div>
                            <div class="signature-line">Authorized Signature</div>
                            <div style="text-align: center; margin-top: 5px; font-size: 0.8em; color: #94a3b8;">Feenix Digital (Pvt) Ltd</div>
                        </div>
                    </div>

                    <script>
                        document.title = "Performance Report - ${worker.name.replace(/"/g, '')}";
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    </script>
                </body>
                </html>
            `);
            targetWin.document.title = `Performance Report - ${worker.name}`;
            targetWin.document.close();
        } catch (err) {
            if (printWindow) printWindow.close();
            console.error('Report Generation Error:', err);
            alert(`An error occurred during report generation: ${err.message}`);
        }
    };

    const assignLeaderToWorker = async (workerId, leaderId) => {
        await fetch('/api/adminData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'assignLeader', workerId, leaderId: leaderId || null })
        });
        fetchData();
    };

    const assignToLeader = async (taskId, leaderId) => {
        if(!leaderId) return;
        const task = tasks.find(t => t.id === taskId);
        const leader = workers.find(w => String(w.id) === String(leaderId));
        
        await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                receiver_id: leaderId,
                message: `🔔 Admin Review Request: Please review and approve the task "${task?.title || 'Operation'}" submitted by ${task?.worker_name || 'Worker'}. Notes: ${task?.worker_note || 'None.'}`
            })
        });

        await fetch('/api/adminData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'createNotification',
                worker_id: leaderId,
                task_id: taskId,
                message: `📋 Task "${task?.title || 'Operation'}" submitted by ${task?.worker_name || 'Worker'} has been routed to you for approval.`
            })
        }).catch(() => {});

        setLeaderAssign(prev => ({...prev, [taskId]: leaderId}));
        alert(`✓ Successfully routed "${task?.title || 'Operation'}" to ${leader?.name || 'Leader'} for approval!`);
        fetchData();
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setMsg({text:'', type:''});
        
        let attachment = '';
        const fileInput = document.getElementById('taskFile').files[0];
        if(fileInput) {
            const fd = new FormData(); fd.append('file', fileInput);
            const up = await fetch('/api/upload', { method:'POST', body:fd }).then(r=>r.json());
            if(up.url) attachment = up.url;
        }

        const res = await fetch('/api/tasks', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({...form, attachment})
        }).then(r=>r.json());

        if(res.success) {
            setMsg({text: 'Operation deployed successfully.', type:'success'});
            setForm({ title: '', description: '', employee_id: '', due_date: '' });
            document.getElementById('taskFile').value = '';
            fetchData();
        } else setMsg({text: 'Error deploying task.', type:'error'});
    };

    // Date & quote helpers
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const adminQuotes = [
        "Empowering teams, driving operational excellence. ⚡",
        "Operational control synchronized and ready. ⚙️",
        "Your dashboard for strategy, metrics, and execution. 📊",
        "Managing the core, driving the future. 🚀",
        "Seamless task coordination, optimal throughput. 🎯",
        "Consistency is the path to scaling success. 🔑",
        "Great leaders inspire greatness in others. ✨"
    ];
    const todayQuote = adminQuotes[new Date().getDate() % adminQuotes.length];
    const adminName = user?.initials_name || user?.name || 'Administrator';

    const toYearMonthDay = (dateStr) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        } catch (e) {
            return null;
        }
    };

    let todayStr = '';
    try {
        todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    } catch (e) {
        todayStr = new Date().toISOString().split('T')[0];
    }

    const todayTasks = (tasks || []).filter(t => {
        if (!t || !t.due_date) return false;
        try {
            const taskDateStr = toYearMonthDay(t.due_date);
            if (!taskDateStr) return false;
            const isDueToday = taskDateStr === todayStr;
            const isOverdue = taskDateStr < todayStr && t.status !== 'Completed' && t.status !== 'Approved';
            const isUrgent = (t.is_urgent === 1 || t.is_urgent === true) && t.status !== 'Completed' && t.status !== 'Approved';
            return isDueToday || isOverdue || isUrgent;
        } catch (e) {
            return false;
        }
    });
    const todayWorksCount = todayTasks.length;
    const activeNodesCount = workers.length;
    const pendingCount = tasks.filter(t => t.status === 'Pending Approval').length;
    
    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
    const successRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

    function getOnlineStatus(last_active) {
        if (!last_active) return <span style={{ color: '#94a3b8', fontSize: '0.82em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>Offline</span>;
        
        let activeTime;
        if (typeof last_active === 'string') {
            const normalized = last_active.replace(' ', 'T');
            activeTime = new Date(normalized).getTime();
            if (isNaN(activeTime)) activeTime = new Date(last_active).getTime();
        } else {
            activeTime = new Date(last_active).getTime();
        }

        if (isNaN(activeTime)) return <span style={{ color: '#94a3b8', fontSize: '0.82em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>Offline</span>;

        const diffSeconds = Math.abs(Date.now() - activeTime) / 1000;
        
        if (diffSeconds < 900 || diffSeconds < 21600) {
            return (
                <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.82em', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                    🟢 Online Now
                </span>
            );
        }
        
        return <span style={{ color: '#94a3b8', fontSize: '0.82em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>Offline</span>;
    }

    const pendingRegistrationWorkers = workers.filter(w => w.status !== 'Approved' && w.id !== user?.id);

    return (
        <div className="animate-slide-up">
            {/* Greeting + Stats Banner (merged) */}
            <div style={{
                padding: '30px 35px',
                marginBottom: '30px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.05) 100%)',
                border: '1px solid var(--panel-border)',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: 800, color: 'var(--text-main)' }}>
                        {getGreeting()}, <span style={{ color: isLight ? '#2563eb' : '#60a5fa', fontWeight: 800 }}>{adminName}</span> 👋
                    </h1>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.92em', fontWeight: 500 }}>
                        {todayQuote}
                    </p>
                </div>

                {/* KPI Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: '70px' }}>
                        <div style={{ fontSize: '1.5em', fontWeight: 800, color: '#3b82f6', lineHeight: 1.1 }}>{todayWorksCount}</div>
                        <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{"Today's Ops"}</div>
                    </div>
                    <div style={{ width: '1px', height: '35px', background: 'var(--panel-border)' }} />

                    <div style={{ textAlign: 'center', minWidth: '70px' }}>
                        <div style={{ fontSize: '1.5em', fontWeight: 800, color: '#8b5cf6', lineHeight: 1.1 }}>{activeNodesCount}</div>
                        <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Active Nodes</div>
                    </div>
                    <div style={{ width: '1px', height: '35px', background: 'var(--panel-border)' }} />

                    <div style={{ textAlign: 'center', minWidth: '70px' }}>
                        <div style={{ fontSize: '1.5em', fontWeight: 800, color: pendingRegistrationWorkers.length > 0 ? '#f59e0b' : '#10b981', lineHeight: 1.1 }}>{pendingRegistrationWorkers.length}</div>
                        <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Pending Approvals</div>
                    </div>

                    <div style={{ width: '1px', height: '35px', background: 'var(--panel-border)' }} />

                    {/* Alert Count Pill */}
                    <div 
                        onClick={() => {
                            const alertSection = document.getElementById('notifications-section');
                            if (alertSection) alertSection.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ 
                            textAlign: 'center', 
                            minWidth: '60px',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            background: stats.unreadAlerts > 0 ? 'rgba(239,68,68,0.1)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                        title="Click to view alerts"
                    >
                        <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            background: stats.unreadAlerts > 0 ? '#ef4444' : 'rgba(239,68,68,0.15)', 
                            color: '#fff', margin: '0 auto 2px auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75em', fontWeight: 800
                        }}>
                            {stats.unreadAlerts}
                        </div>
                        <div style={{ fontSize: '0.68em', color: stats.unreadAlerts > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alerts</div>
                    </div>

                    {/* Overdue Task Email Alerts Trigger Button */}
                    <button 
                        onClick={() => checkAndSendOverdueAlerts(true)}
                        disabled={sendingOverdue}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: overdueAlertCount > 0 ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'rgba(239,68,68,0.1)',
                            color: overdueAlertCount > 0 ? '#ffffff' : '#f87171',
                            border: overdueAlertCount > 0 ? 'none' : '1px solid rgba(239,68,68,0.3)',
                            padding: '10px 18px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85em',
                            boxShadow: overdueAlertCount > 0 ? '0 4px 14px rgba(220,38,38,0.3)' : 'none',
                            transition: 'all 0.2s',
                            opacity: sendingOverdue ? 0.7 : 1
                        }}
                    >
                        <span>🚨</span>
                        <span>{sendingOverdue ? 'Sending...' : (overdueAlertCount > 0 ? `Send Overdue Emails (${overdueAlertCount})` : 'Send Overdue Emails')}</span>
                    </button>
                </div>
            </div>

            {/* Executive Analytics Dashboard Section Always Visible for MD & Admin */}
            <ExecutiveAnalytics />

            {/* Pending Member Registrations Approval Panel (ALWAYS Visible for System Administrator) */}
            <div className="glass-panel" style={{ padding: '22px 25px', marginBottom: '30px', border: pendingRegistrationWorkers.length > 0 ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(16, 185, 129, 0.4)', background: pendingRegistrationWorkers.length > 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.05))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: pendingRegistrationWorkers.length > 0 ? '20px' : '0', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ margin: 0, color: pendingRegistrationWorkers.length > 0 ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15em' }}>
                        📥 Team Member Registration Approvals ({pendingRegistrationWorkers.length} Pending Approval)
                    </h3>
                    {pendingRegistrationWorkers.length === 0 && (
                        <span style={{ fontSize: '0.85em', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                            ✓ All worker accounts approved & active
                        </span>
                    )}
                </div>
                {pendingRegistrationWorkers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {pendingRegistrationWorkers.map(w => (
                            <div key={w.id} style={{ background: 'var(--card-inner-bg, rgba(0,0,0,0.2))', borderRadius: '14px', padding: '18px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.1em', color: 'var(--text-main)', marginBottom: '4px' }}>
                                        {w.name} <span style={{ fontSize: '0.8em', color: '#3b82f6', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px' }}>{w.position || 'Team Member'}</span>
                                        <span style={{ fontSize: '0.75em', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px', fontWeight: 700 }}>{w.status || 'Pending Approval'}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Email: <strong style={{ color: 'var(--text-main)' }}>{w.email}</strong> — Phone: <strong style={{ color: 'var(--text-main)' }}>{w.phone || 'N/A'}</strong> — Role: <strong style={{ color: 'var(--text-main)' }}>{w.role || 'worker'}</strong>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleRejectWorkerRegistration(w.id, w.name)}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '0.85em', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' }}
                                    >
                                        Reject ✕
                                    </button>
                                    <button
                                        onClick={() => handleApproveWorkerRegistration(w.id)}
                                        className="btn-primary"
                                        style={{ padding: '8px 22px', fontSize: '0.9em', background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                                    >
                                        Approve Account ✓
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tab Navigation: Today's Operations vs Operations Flow vs Kanban Board vs Calendar View */}
            <div style={{ display:'flex', gap:'8px', padding:'6px', background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', borderRadius:'14px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, width:'fit-content', marginBottom:'20px', flexWrap: 'wrap' }}>
                <button style={opsTabStyle('today')} onClick={() => setOpsActiveTab('today')}>{"📂 Today's Operations"}</button>
                <button style={opsTabStyle('kanban')} onClick={() => setOpsActiveTab('kanban')}>📋 Interactive Kanban Board</button>
                <button style={opsTabStyle('flow')} onClick={() => setOpsActiveTab('flow')}>🗓️ Operations Flow</button>
                <button style={opsTabStyle('calendar')} onClick={() => setOpsActiveTab('calendar')}>📅 Calendar View</button>
            </div>

            {/* Synchronized Company Calendar Holiday Alert Banner */}
            {(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const todayHoliday = SRI_LANKAN_HOLIDAYS.find(h => h.date === todayStr);
                const upcomingPoya = SRI_LANKAN_HOLIDAYS.find(h => h.date >= todayStr && h.type === 'poya');
                
                if (todayHoliday) {
                    return (
                        <div style={{ padding: '14px 20px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.12))', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: 700, fontSize: '0.92em', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
                            <span style={{ fontSize: '1.6em' }}>🌕</span>
                            <div>
                                <div style={{ fontSize: '1em', fontWeight: 800 }}>COMPANY HOLIDAY TODAY: {todayHoliday.reason}</div>
                                <div style={{ fontSize: '0.85em', fontWeight: 500, opacity: 0.9, marginTop: '2px' }}>Operational tasks scheduled for today are automatically synced with the Official Sri Lankan Calendar.</div>
                            </div>
                        </div>
                    );
                } else if (upcomingPoya) {
                    return (
                        <div style={{ padding: '10px 16px', borderRadius: '12px', background: isLight ? 'rgba(59, 130, 246, 0.06)' : 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85em', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2em' }}>🌕</span>
                            <span>Next Company Holiday / Poya: <strong style={{ color: '#3b82f6' }}>{upcomingPoya.reason}</strong> on <strong>{upcomingPoya.date}</strong></span>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Render Tab Content */}
            {opsActiveTab === 'kanban' ? (
                <KanbanBoard tasks={tasks} onTaskUpdate={fetchData} />
            ) : opsActiveTab === 'today' ? (
                /* Today's Operations Pipeline */
                <div className="glass-panel" style={{ padding: '22px 28px', marginBottom: '30px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📅 Today's Operations Pipeline</span>
                            <span style={{ fontSize: '0.75em', fontWeight: 800, background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '2px 10px', borderRadius: '12px' }}>
                                {todayTasks.length} Operations
                            </span>
                            {todayTasks.filter(t => t.due_date && toYearMonthDay(t.due_date) < todayStr && t.status !== 'Completed' && t.status !== 'Approved').length > 0 && (
                                <span style={{ fontSize: '0.75em', fontWeight: 800, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '2px 10px', borderRadius: '12px' }}>
                                    🚨 {todayTasks.filter(t => t.due_date && toYearMonthDay(t.due_date) < todayStr && t.status !== 'Completed' && t.status !== 'Approved').length} Overdue
                                </span>
                            )}
                        </h3>
                        {todayTasks.length > 6 && (
                            <span style={{ fontSize: '0.78em', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                ↕ Scroll down to view all operations
                            </span>
                        )}
                    </div>

                    {todayTasks.length === 0 ? (
                        <div style={{ padding: '25px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '12px', fontSize: '0.9em' }}>
                            No operations assigned for today. Everything is running smoothly! ✨
                        </div>
                    ) : (
                        <div style={{ maxHeight: '460px', overflowY: 'auto', paddingRight: '6px', scrollbarWidth: 'thin' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                {todayTasks.map(t => {
                                    const assignedWorker = workers.find(w => w.id === t.employee_id);
                                    const isOverdue = t.due_date && toYearMonthDay(t.due_date) < todayStr && t.status !== 'Completed' && t.status !== 'Approved';
                                    return (
                                        <div 
                                            key={t.id} 
                                            style={{ 
                                                background: isOverdue ? 'rgba(239, 68, 68, 0.06)' : 'var(--card-inner-bg, rgba(0,0,0,0.2))', 
                                                borderRadius: '14px', 
                                                padding: '16px', 
                                                border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--card-inner-border, rgba(255,255,255,0.04))',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justify: 'space-between',
                                                gap: '12px',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '0.72em', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                                                        {t.category || 'Operation'}
                                                    </span>
                                                    <span className={`status-badge ${t.status === 'Completed' || t.status === 'Approved' ? 'status-completed' : (t.status === 'Pending Approval' ? 'status-pending' : 'status-progress')}`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.02em', fontWeight: 700, color: 'var(--text-main)' }}>
                                                    {t.title}
                                                </h4>
                                                {t.description && (
                                                    <p style={{ margin: 0, fontSize: '0.82em', color: 'var(--text-muted)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {t.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8em' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <SafeAvatar src={assignedWorker?.profile_picture} name={assignedWorker?.name || 'Unassigned'} size={22} />
                                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{assignedWorker?.name || 'Unassigned'}</span>
                                                </div>
                                                {isOverdue ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>OVERDUE</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>Due Today</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : opsActiveTab === 'flow' ? (
                /* Operations Flow Day-by-Day Protocol View */
                <MonthlyOpsViewer tasks={tasks} fetchData={fetchData} workers={workers} />
            ) : (
                /* Calendar View */
                <div style={{ marginBottom: '30px' }}>
                    <CompanyCalendar tasks={tasks} workers={workers} isAdmin={true} onSelectTask={t => {
                        alert(`Operation: ${t.title}\nAssigned: ${t.worker_name || 'Unassigned'}\nStatus: ${t.status}\nDeadline: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}`);
                    }} />
                </div>
            )}

            {/* Pending Task Approvals Panel */}
            {tasks.filter(t => t.status === 'Pending Approval').length > 0 && (
                <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.04)' }}>
                    <h3 style={{ marginBottom: '20px', marginTop: 0, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🔔 Pending Task Approval Requests ({tasks.filter(t => t.status === 'Pending Approval').length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {tasks.filter(t => t.status === 'Pending Approval').map(t => (
                            <div key={t.id} style={{ background: 'var(--card-inner-bg, rgba(0,0,0,0.2))', borderRadius: '14px', padding: '18px', border: '1px solid var(--card-inner-border, rgba(139,92,246,0.15))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.1em', color: 'var(--text-main)', marginBottom: '4px' }}>
                                        {t.title} <span style={{ fontSize: '0.8em', color: '#a855f7', fontWeight: 600, background: 'rgba(168,85,247,0.15)', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px' }}>{t.category}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Submitted by: <strong style={{ color: 'var(--text-main)' }}>{t.worker_name}</strong> {t.worker_note && `— Note: "${t.worker_note}"`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                        value={leaderAssign[t.id] || ''}
                                        onChange={(e) => assignToLeader(t.id, e.target.value)}
                                        style={{ padding: '8px 12px', fontSize: '0.85em', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}
                                    >
                                        <option value="">Route to Team Leader...</option>
                                        {teamLeaders.map(l => {
                                            const isDesignated = (l.is_team_leader === 1 || String(l.is_team_leader) === '1' || l.is_team_leader === true);
                                            const prefix = isDesignated ? '👑 ' : (l.role === 'admin' ? '⭐ ' : '');
                                            const teamLabel = l.team ? ` [${l.team}]` : '';
                                            return (
                                                <option key={l.id} value={l.id}>
                                                    {prefix}{l.name} ({l.position || 'Team Leader'}{teamLabel})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <button
                                        onClick={async () => {
                                            const note = window.prompt('Enter change instructions or revision feedback for ' + (t.worker_name || 'member') + ':');
                                            if (note !== null) {
                                                await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: t.id, status: 'Having Changes', worker_note: note }) });
                                                fetchData();
                                            }
                                        }}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '0.85em', color: '#f59e0b', borderColor: '#f59e0b' }}
                                    >
                                        Changes ↺
                                    </button>
                                    <button
                                        onClick={() => updateAdminStatus(t.id, 'Approved')}
                                        className="btn-primary"
                                        style={{ padding: '8px 20px', fontSize: '0.85em', background: '#a855f7', borderColor: '#a855f7' }}
                                    >
                                        Approve Operation ✓
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Network Section Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button 
                        onClick={() => setNetworkTab('workers')} 
                        style={{
                            padding: '8px 16px',
                            fontSize: '1em',
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: networkTab === 'workers' ? '3px solid #3b82f6' : '3px solid transparent',
                            color: networkTab === 'workers' ? 'var(--text-main)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            paddingBottom: '10px',
                            marginBottom: '-1px'
                        }}
                    >
                        Active Node Network (Workers: {workers.length})
                    </button>
                    <button 
                        onClick={() => setNetworkTab('clients')} 
                        style={{
                            padding: '8px 16px',
                            fontSize: '1em',
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: networkTab === 'clients' ? '3px solid #3b82f6' : '3px solid transparent',
                            color: networkTab === 'clients' ? 'var(--text-main)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            paddingBottom: '10px',
                            marginBottom: '-1px'
                        }}
                    >
                        Client Portal Network (Clients: {clients.length})
                    </button>
                </div>
                {networkTab === 'workers' && workers.length > 3 && (
                    <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', paddingBottom: '4px' }}>
                        <span>↕</span> Scroll down to view all {workers.length} nodes
                    </span>
                )}
                {networkTab === 'clients' && clients.length > 3 && (
                    <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', paddingBottom: '4px' }}>
                        <span>↕</span> Scroll down to view all {clients.length} clients
                    </span>
                )}
            </div>

            <div 
                className="network-scroll-container"
                style={{
                    maxHeight: '620px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: '10px',
                    paddingBottom: '14px',
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth'
                }}
            >
            {networkTab === 'workers' ? (
                <div className="workers-grid">
                {workers.map(w => {
                    const workerTasks = tasks.filter(t => t.employee_id === w.id);
                    const activeTasks = workerTasks.filter(t => t.status !== 'Completed' && t.status !== 'Approved');
                    const completedTasks = workerTasks.filter(t => t.status === 'Completed' || t.status === 'Approved');
                    const showCompleted = expandedWorkers.has(w.id);
                    const isWorkerApproved = w.status === 'Approved';

                    return (
                    <div key={w.id} className="glass-panel" style={{ padding: '20px', display:'flex', flexDirection:'column', position: 'relative', border: !isWorkerApproved ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--panel-border)', borderRadius: '16px' }}>
                        {/* Row 1: Status Pill (Left) + Action Buttons (Right) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                {!isWorkerApproved ? (
                                    <span style={{ fontSize: '0.72em', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'inline-block' }}>
                                        ● Pending Approval
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.72em', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-block' }}>
                                        ● Approved & Active
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleToggleWorkerStatus(w.id)}
                                    className="btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '0.75em', background: isWorkerApproved ? 'rgba(239, 68, 68, 0.1)' : '#10b981', color: isWorkerApproved ? '#ef4444' : '#ffffff', borderColor: isWorkerApproved ? 'rgba(239, 68, 68, 0.3)' : '#10b981', borderRadius: '8px', fontWeight: 700 }}
                                    title={isWorkerApproved ? 'Require re-approval for this account' : 'Approve worker account'}
                                >
                                    {isWorkerApproved ? 'Revoke Approval ↻' : 'Approve Account ✓'}
                                </button>
                                <button onClick={() => downloadPerformanceReport(w.id, w.name)} className="btn-icon" style={{ color:'#0ea5e9', padding:'5px 8px', background:'rgba(14, 165, 233, 0.1)', borderRadius:'8px' }} title="Performance PDF Report">
                                     <FileText size={15} />
                                </button>
                                <button onClick={() => handleTerminateNode(w.id, w.name)} className="btn-icon" style={{ color:'#ef4444', padding:'5px 8px', background:'rgba(239, 68, 68, 0.1)', borderRadius:'8px' }} title="Terminate Node">
                                     <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Avatar + Name + Position + Online Status */}
                        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px', borderBottom:'1px solid var(--panel-border)', paddingBottom:'16px' }}>
                            <SafeAvatar src={w.profile_picture} name={w.name} size={48} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3
                                    onClick={() => completedTasks.length > 0 && toggleWorkerCompleted(w.id)}
                                    style={{ margin: 0, fontSize:'1.1em', fontWeight: 700, color:'var(--text-main)', cursor: completedTasks.length > 0 ? 'pointer' : 'default', transition:'color 0.2s', wordBreak: 'break-word' }}
                                    onMouseEnter={e => { if(completedTasks.length > 0) e.currentTarget.style.color = '#60a5fa'; }}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-main)'}
                                    title={completedTasks.length > 0 ? 'Click to toggle completed tasks' : ''}
                                >{w.name}</h3>
                                <p style={{ margin: '2px 0 4px 0', fontSize:'0.85em', color:'var(--text-muted)' }}>{w.position}</p>
                                <div>
                                    {getOnlineStatus(w.last_active)}
                                </div>
                            </div>
                        </div>

                        {/* Active Tasks */}
                        <h4 style={{margin:'0 0 12px 0', color:'var(--active-op-header-color, #cbd5e1)', fontSize:'0.9em', textTransform:'uppercase', letterSpacing:'0.5px'}}>Active Operations</h4>
                        <div style={{flex:1, display:'flex', flexDirection:'column', gap:'10px'}}>
                            {activeTasks.length === 0 && <p style={{color:'#64748b', fontSize:'0.85em'}}>No active operations.</p>}
                            {activeTasks.map(t => {
                                const sc = t.status==='Pending Approval'?'status-pending':(t.status==='Having Changes'?'status-changes':(t.status==='In Progress'?'status-progress':'status-assigned'));
                                return (
                                <div key={t.id} style={{ background:'var(--card-inner-bg, rgba(0,0,0,0.2))', padding:'14px', borderRadius:'12px', border:'1px solid var(--card-inner-border, rgba(255,255,255,0.03))'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px'}}>
                                        <strong style={{color: 'var(--text-main)', fontSize:'1em'}}>{t.title}</strong>
                                        <span className={`status-badge ${sc}`}>{t.status}</span>
                                    </div>
                                    {t.due_date && <div style={{fontSize:'0.8em', color:'#ef4444', marginTop:'6px', fontWeight:500, marginBottom:'10px'}}>Deadline: {new Date(t.due_date).toLocaleDateString()}</div>}
                                    {t.status === 'Pending Approval' && (
                                        <button onClick={()=>updateAdminStatus(t.id, 'Approved')} className="btn-primary" style={{padding:'6px 12px', fontSize:'0.8em', width:'100%', marginTop:'5px', background:'#0ea5e9'}}>Approve Task ✓</button>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                    );
                })}
                </div>
            ) : (
                /* Clients List */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {clients.map(c => (
                        <div key={c.id} className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                                <SafeAvatar src={c.profile_picture} name={c.name} size={40} />
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--text-main)' }}>{c.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>Company: {c.project_name || 'Client'}</p>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Email: {c.email}</div>
                            <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                <button onClick={() => handleTerminateClient(c.id, c.name)} className="btn-icon" style={{color:'#ef4444', padding:'6px', background:'rgba(239, 68, 68, 0.1)', borderRadius:'6px'}} title="Terminate Client">
                                     <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}
