'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';

export default function MonthlyOpsViewer({ tasks = [], fetchData, workers = [] }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const toYearMonth = (dateStr) => {
        if (!dateStr) return null;
        const str = String(dateStr);
        if (str.includes('T')) return str.split('T')[0].slice(0, 7);
        if (str.length >= 7 && str.includes('-')) return str.slice(0, 7);
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
        } catch (e) {
            return null;
        }
    };

    const toYearMonthDay = (dateStr) => {
        if (!dateStr) return null;
        const str = String(dateStr);
        if (str.includes('T')) return str.split('T')[0];
        if (str.length === 10 && str.includes('-')) return str;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
        } catch (e) {
            return null;
        }
    };

    const today = new Date();
    const currentYear = today.getFullYear();
    const todayKey = today.toISOString().slice(0, 7);
    
    // Collect months safely
    const yearsWithData = new Set([currentYear]);
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeWorkers = Array.isArray(workers) ? workers : [];

    safeTasks.forEach(t => {
        if (!t) return;
        const key = toYearMonth(t.created_at) || toYearMonth(t.due_date);
        if (key) {
            const yr = parseInt(key.split('-')[0]);
            if (!isNaN(yr)) yearsWithData.add(yr);
        }
    });

    const allMonths = [];
    [...yearsWithData].sort().reverse().forEach(year => {
        for (let m = 12; m >= 1; m--) {
            allMonths.push(`${year}-${String(m).padStart(2, '0')}`);
        }
    });

    const [activeMonth, setActiveMonth] = useState(todayKey);

    const handlePrevMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const prevD = new Date(yr, mo - 2, 1);
        const prevStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(prevStr)) {
            allMonths.push(prevStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(prevStr);
    };

    const handleNextMonth = () => {
        const [yr, mo] = activeMonth.split('-').map(Number);
        const nextD = new Date(yr, mo, 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
        if (!allMonths.includes(nextStr)) {
            allMonths.push(nextStr);
            allMonths.sort().reverse();
        }
        setActiveMonth(nextStr);
    };

    const getTaskCardTheme = (task) => {
        if (!task) return { bg: 'transparent', color: 'inherit', border: 'none' };
        const currentStatus = task.status;
        switch (currentStatus) {
            case 'Completed':
            case 'Approved':
                return {
                    bg: isLight ? '#dcfce7' : 'rgba(16,185,129,0.15)',
                    color: isLight ? '#15803d' : '#86efac',
                    border: isLight ? '1px solid #86efac' : '1px solid rgba(16,185,129,0.3)'
                };
            case 'Having Changes':
                return {
                    bg: isLight ? '#fee2e2' : 'rgba(239,68,68,0.15)',
                    color: isLight ? '#b91c1c' : '#fca5a5',
                    border: isLight ? '1px solid #f87171' : '1px solid rgba(239,68,68,0.4)'
                };
            case 'In Progress':
                return {
                    bg: isLight ? '#fef3c7' : 'rgba(245,158,11,0.15)',
                    color: isLight ? '#b45309' : '#fde68a',
                    border: isLight ? '1px solid #fcd34d' : '1px solid rgba(245,158,11,0.35)'
                };
            case 'Change Making':
                return {
                    bg: isLight ? '#f3e8ff' : 'rgba(168,85,247,0.15)',
                    color: isLight ? '#7e22ce' : '#d8b4fe',
                    border: isLight ? '1px solid #c084fc' : '1px solid rgba(168,85,247,0.35)'
                };
            case 'Pending Approval':
                return {
                    bg: isLight ? '#ede9fe' : 'rgba(139,92,246,0.15)',
                    color: isLight ? '#6d28d9' : '#c4b5fd',
                    border: isLight ? '1px solid #a78bfa' : '1px solid rgba(139,92,246,0.35)'
                };
            case 'Assigned':
            default:
                return {
                    bg: isLight ? '#e0f2fe' : 'rgba(2,132,199,0.15)',
                    color: isLight ? '#0369a1' : '#7dd3fc',
                    border: isLight ? '1px solid #7dd3fc' : '1px solid rgba(2,132,199,0.35)'
                };
        }
    };

    const getStatusSelectTheme = (status) => {
        switch (status) {
            case 'Completed':
            case 'Approved':
                return { bg: isLight ? '#ecfdf5' : 'rgba(16,185,129,0.18)', color: isLight ? '#16a34a' : '#4ade80', border: isLight ? '#86efac' : 'rgba(16,185,129,0.4)' };
            case 'Having Changes':
                return { bg: isLight ? '#fef2f2' : 'rgba(239,68,68,0.18)', color: isLight ? '#dc2626' : '#f87171', border: isLight ? '#fca5a5' : 'rgba(239,68,68,0.4)' };
            case 'In Progress':
                return { bg: isLight ? '#fffbeb' : 'rgba(245,158,11,0.18)', color: isLight ? '#d97706' : '#fbbf24', border: isLight ? '#fcd34d' : 'rgba(245,158,11,0.4)' };
            case 'Change Making':
                return { bg: isLight ? '#faf5ff' : 'rgba(168,85,247,0.18)', color: isLight ? '#9333ea' : '#c084fc', border: isLight ? '#d8b4fe' : 'rgba(168,85,247,0.4)' };
            case 'Pending Approval':
                return { bg: isLight ? '#f5f3ff' : 'rgba(139,92,246,0.18)', color: isLight ? '#7c3aed' : '#a78bfa', border: isLight ? '#c4b5fd' : 'rgba(139,92,246,0.4)' };
            case 'Assigned':
            default:
                return { bg: isLight ? '#f0f9ff' : 'rgba(2,132,199,0.18)', color: isLight ? '#0284c7' : '#38bdf8', border: isLight ? '#7dd3fc' : 'rgba(2,132,199,0.4)' };
        }
    };

    const [activeWorker, setActiveWorker] = useState(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({});
    
    // Modal State
    const [taskDetailsModal, setTaskDetailsModal] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const opsTableScrollRef = useRef(null);
    const scrollOpsTable = (offset) => { opsTableScrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' }); };
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskForm, setEditTaskForm] = useState({});
    
    // Projects State
    const [projects, setProjects] = useState([]);
    
    // Quick Assign Modal for Empty Cells
    const [quickAssignModal, setQuickAssignModal] = useState({ open: false, date: '', employee_id: '', project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' });
    const [quickAssignSubmitting, setQuickAssignSubmitting] = useState(false);
    
    useEffect(() => {
        fetch('/api/projects').then(r=>r.json()).then(d => {
            if(d && d.success) setProjects(d.projects || []);
        }).catch(()=>{});
    }, []);

    // Filter tasks for active month safely
    const monthTasks = safeTasks.filter(t => t && ((toYearMonth(t.due_date) || toYearMonth(t.created_at)) === activeMonth));

    // Sort workers alphabetically
    const sortedWorkers = [...safeWorkers].sort((a,b) => (a?.name || '').localeCompare(b?.name || ''));

    // Filter tasks by active worker
    const displayTasks = activeWorker ? monthTasks.filter(t => t && t.employee_id === activeWorker) : monthTasks;

    // Group by Day -> { 'YYYY-MM-DD': [tasks...] }
    const dayMap = {};
    displayTasks.forEach(t => {
        if (!t) return;
        const dayKey = toYearMonthDay(t.due_date) || toYearMonthDay(t.created_at);
        if (!dayKey) return;
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(t);
    });

    let maxTasksInDay = 10;
    const dayCounts = Object.values(dayMap).map(a => Array.isArray(a) ? a.length : 0);
    if (dayCounts.length > 0) {
        const peak = Math.max(...dayCounts);
        if (!isNaN(peak) && peak > 10) maxTasksInDay = peak;
    }

    const parts = (activeMonth || todayKey).split('-');
    const y = parseInt(parts[0]) || currentYear;
    const m = parseInt(parts[1]) || (today.getMonth() + 1);
    const daysInMonth = new Date(y, m, 0).getDate();

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await fetch('/api/tasks', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId, status: newStatus })
            });
            if(fetchData) fetchData();
        } catch (e) {}
    };

    const handleQuickAssignSubmit = async (e) => {
        e.preventDefault();
        if (!quickAssignModal.date || !quickAssignModal.title || !quickAssignModal.employee_id) {
            return alert('Please fill in Title, Worker, and Date.');
        }
        setQuickAssignSubmitting(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: quickAssignModal.title.trim(),
                    description: quickAssignModal.description || '',
                    employee_id: quickAssignModal.employee_id,
                    due_date: quickAssignModal.date,
                    project_id: quickAssignModal.project_id || null,
                    category: quickAssignModal.category || 'Other',
                    status: quickAssignModal.status || 'Assigned'
                })
            }).then(r => r.json());

            if (res && res.success) {
                setQuickAssignModal({ open: false, date: '', employee_id: '', project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' });
                if (fetchData) fetchData();
            } else {
                alert(res?.error || 'Failed to assign task');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setQuickAssignSubmitting(false);
        }
    };

    const handleSchedule = async () => {
        if (!scheduleForm.date || !scheduleForm.title || !scheduleForm.employee_id) return alert('Please fill Date, Title, and Worker.');
        
        let attachmentUrl = '';
        if (scheduleForm.file) {
            const formData = new FormData();
            formData.append('file', scheduleForm.file);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json());
            if(uploadRes && uploadRes.success) attachmentUrl = uploadRes.url;
        }

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: scheduleForm.title, 
                    description: scheduleForm.description || '',
                    employee_id: scheduleForm.employee_id, 
                    due_date: scheduleForm.date, 
                    attachment: attachmentUrl,
                    project_id: scheduleForm.project_id || null,
                    category: scheduleForm.category || 'Other'
                })
            }).then(r => r.json());
            
            if (res && res.success) {
                setScheduleOpen(false);
                setScheduleForm({});
                if (fetchData) fetchData();
            }
        } catch (e) {}
    };

    const handleAdminDelete = async (taskId) => {
        if(!confirm('Are you sure you want to completely delete this task?')) return;
        try {
            const res = await fetch('/api/tasks', { 
                method: 'DELETE', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ task_id: taskId }) 
            }).then(r=>r.json());
            if(res && res.success) {
                setTaskDetailsModal(null);
                if(fetchData) fetchData();
            } else {
                alert(res?.error || 'Failed to delete task');
            }
        } catch (err) {
            alert('Error deleting task: ' + err.message);
        }
    };

    const handleAdminReschedule = async (taskId) => {
        if(!rescheduleDate) return alert('Select a new date first.');
        try {
            const res = await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ task_id: taskId, due_date: rescheduleDate, status: taskDetailsModal?.status }) }).then(r=>r.json());
            if(res && res.success) {
                setTaskDetailsModal(null);
                if(fetchData) fetchData();
            }
        } catch (e) {}
    };

    const handleFullEditSave = async () => {
        if (!taskDetailsModal) return;
        try {
            const res = await fetch('/api/tasks', { 
                method: 'PUT', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ 
                    task_id: taskDetailsModal.id, 
                    title: editTaskForm.title,
                    description: editTaskForm.description,
                    category: editTaskForm.category,
                    status: editTaskForm.status,
                    due_date: editTaskForm.due_date
                }) 
            }).then(r=>r.json());

            if(res && res.success) {
                setTaskDetailsModal(null);
                setIsEditingTask(false);
                if(fetchData) fetchData();
            } else {
                alert(res?.error || 'Failed to update task.');
            }
        } catch (e) {
            alert('Error updating task: ' + e.message);
        }
    };

    return (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', padding: '0', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--panel-border)', marginBottom: '40px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Controls */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, display: 'flex', flexDirection: 'column', gap: '12px', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)' }}>
                {/* Top Row: Title + Month Picker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2em' }}>
                            📅
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25em', fontWeight: 800, color: 'var(--text-main)' }}>Team Operations Flow</h2>
                            <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Daily slot capacity tracking</span>
                        </div>
                    </div>

                    {/* Month Picker */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                        borderRadius: '12px',
                        padding: '2px',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Previous Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ◀
                        </button>

                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select 
                                value={activeMonth} 
                                onChange={(e) => setActiveMonth(e.target.value)}
                                style={{
                                    padding: '7px 32px 7px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.7)',
                                    color: isLight ? '#0f172a' : '#f8fafc',
                                    fontWeight: 700,
                                    fontSize: '0.92em',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    minWidth: '150px',
                                    textAlign: 'center'
                                }}
                            >
                                {allMonths.map(mStr => {
                                    const [yr, mo] = mStr.split('-');
                                    const name = MONTH_NAMES[parseInt(mo) - 1];
                                    return (
                                        <option
                                            key={mStr}
                                            value={mStr}
                                            style={{
                                                background: isLight ? '#ffffff' : '#1e293b',
                                                color: isLight ? '#0f172a' : '#f8fafc',
                                                fontWeight: 600,
                                                padding: '6px'
                                            }}
                                        >
                                            {name} {yr}
                                        </option>
                                    );
                                })}
                            </select>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={isLight ? '#475569' : '#94a3b8'}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Next Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#334155' : '#cbd5e1',
                                cursor: 'pointer',
                                padding: '6px 9px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85em',
                                fontWeight: 800,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ▶
                        </button>
                    </div>
                </div>

                {/* Sub Row: Horizontal Slot Navigation Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: '2px 0', width: '100%' }}>
                    <button 
                        type="button" 
                        onClick={() => scrollOpsTable(-500)} 
                        title="Scroll Left"
                        style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 800, fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        ◀ Prev
                    </button>

                    <button 
                        type="button" 
                        onClick={() => { if(opsTableScrollRef.current) opsTableScrollRef.current.scrollLeft = 0; }} 
                        style={{ flexShrink: 0, padding: '7px 12px', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: '0.8em' }}
                    >
                        Slots 1-3
                    </button>

                    <button 
                        type="button" 
                        onClick={() => { if(opsTableScrollRef.current) opsTableScrollRef.current.scrollLeft = 900; }} 
                        style={{ flexShrink: 0, padding: '7px 12px', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: '0.8em' }}
                    >
                        Slots 4-6
                    </button>

                    <button 
                        type="button" 
                        onClick={() => { if(opsTableScrollRef.current) opsTableScrollRef.current.scrollLeft = 1800; }} 
                        style={{ flexShrink: 0, padding: '7px 12px', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: '0.8em' }}
                    >
                        Slots 7-10
                    </button>

                    <button 
                        type="button" 
                        onClick={() => scrollOpsTable(500)} 
                        title="Scroll Right"
                        style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 800, fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        Next ▶
                    </button>
                </div>
            </div>

            {/* Quick Schedule Inline Form */}
            {scheduleOpen && (
                <div style={{ padding: '20px 24px', background: isLight ? '#f0fdf4' : 'rgba(16,185,129,0.04)', borderBottom: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16,185,129,0.2)'}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, color: '#10b981', fontWeight: 800 }}>⚡ Assign New Operation Task</h4>
                        <button onClick={()=>setScheduleOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: '1.1em' }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <input type="date" value={scheduleForm.date || ''} onChange={e=>setScheduleForm(p=>({...p, date: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }} />
                        <input type="text" placeholder="Operation Title *" value={scheduleForm.title || ''} onChange={e=>setScheduleForm(p=>({...p, title: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }} />
                        <select value={scheduleForm.employee_id || ''} onChange={e=>setScheduleForm(p=>({...p, employee_id: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="">Select Assignee *</option>
                            {sortedWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.position || 'Worker'})</option>)}
                        </select>
                        <select value={scheduleForm.project_id || ''} onChange={e=>{
                            setScheduleForm(prev=>({...prev, project_id: e.target.value}));
                        }} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="">No Project (Optional)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={scheduleForm.category || ''} onChange={e=>setScheduleForm(p=>({...p, category: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em' }}>
                            <option value="Other">Other Category</option>
                            <option value="Graphic">Graphic</option>
                            <option value="Video">Video</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                        <textarea placeholder="Task Description / Content (Optional)" value={scheduleForm.description || ''} onChange={e=>setScheduleForm(p=>({...p, description: e.target.value}))} style={{ padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9em', flex: 1, minHeight: '60px', resize: 'vertical' }}></textarea>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="file" onChange={e=>setScheduleForm(p=>({...p, file: e.target.files[0]}))} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }} />
                            <button onClick={handleSchedule} style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9em' }}>
                                Save Task ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

           {/* Spreadsheet Grid Wrapper */}
            <div ref={opsTableScrollRef} className="ops-table-scroll-container" style={{ overflowX: 'auto', maxHeight: '650px', overflowY: 'auto', position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0, background: isLight ? '#ffffff' : 'var(--panel-bg)', scrollbarWidth: 'thin' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '145px' }} />
                        {Array.from({ length: maxTasksInDay }, (_, idx) => (
                            <col key={idx} style={{ width: '325px' }} />
                        ))}
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={{ width: '145px', boxSizing: 'border-box', padding: '12px 14px', textAlign: 'left', position: 'sticky', left: 0, background: isLight ? '#f1f5f9' : 'var(--table-header-bg, rgba(15, 23, 42, 0.95))', backdropFilter: 'blur(10px)', zIndex: 11, color: isLight ? '#475569' : 'var(--text-muted)', fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, borderRight: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, boxShadow: isLight ? '2px 0 5px rgba(0,0,0,0.03)' : 'none' }}>Date</th>
                            {Array.from({ length: maxTasksInDay }, (_, colIndex) => (
                                <th key={colIndex} style={{ width: '325px', boxSizing: 'border-box', padding: '12px 14px', textAlign: 'left', background: isLight ? '#f1f5f9' : 'var(--table-header-bg, rgba(15, 23, 42, 0.95))', backdropFilter: 'blur(10px)', color: isLight ? '#475569' : 'var(--text-muted)', fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, borderRight: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'}` }}>
                                    Slot {colIndex + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({length: daysInMonth}, (_, i) => {
                            const dStr = String(i+1).padStart(2, '0');
                            const dayKey = `${activeMonth}-${dStr}`;
                            const dateObj = new Date(dayKey + 'T12:00:00');
                            const dayName = DAY_NAMES[dateObj.getDay()] || 'Day';
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                            const isToday = dayKey === new Date().toISOString().split('T')[0];
                            const baseBg = isToday ? (isLight ? '#f0fdf4' : 'rgba(16,185,129,0.05)') : (isWeekend ? (isLight ? '#fafafa' : 'rgba(255,255,255,0.02)') : (isLight ? '#ffffff' : 'transparent'));
                            const tasksForDay = dayMap[dayKey] || [];
                            
                            return (
                                <tr key={i} style={{ background: baseBg, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = isLight ? '#f8fafc' : 'var(--row-hover-bg, rgba(255,255,255,0.04))'} onMouseLeave={e => e.currentTarget.style.background = baseBg}>
                                    <td style={{ width: '145px', boxSizing: 'border-box', padding: '10px 14px', borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'var(--table-border, rgba(255,255,255,0.04))'}`, borderRight: `1px solid ${isLight ? '#f1f5f9' : 'var(--table-border, rgba(255,255,255,0.04))'}`, textAlign: 'left', position: 'sticky', left: 0, background: isToday ? (isLight ? '#dcfce7' : 'var(--today-bg, rgba(16,35,42,0.97))') : (isWeekend ? (isLight ? '#f8fafc' : 'var(--weekend-bg, rgba(15, 23, 42, 0.95))') : (isLight ? '#ffffff' : 'var(--date-col-bg, rgba(15, 23, 42, 0.8))')), backdropFilter: 'blur(10px)', zIndex: 2, color: isToday ? (isLight ? '#15803d' : '#10b981') : (isLight ? '#1e293b' : 'var(--date-col-text, #e2e8f0)'), fontWeight: isToday ? 800 : 600, fontSize: '0.88em', boxShadow: isLight ? '2px 0 5px rgba(0,0,0,0.03)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.15em', fontWeight: 800, color: isToday ? (isLight ? '#15803d' : '#10b981') : (isLight ? '#0f172a' : 'inherit') }}>{dStr}</span>
                                            <span style={{ color: isToday ? (isLight ? '#16a34a' : '#34d399') : (isLight ? '#64748b' : 'var(--text-muted)'), fontSize: '0.85em', fontWeight: 600 }}>{dayName}</span>
                                            {isToday && <span style={{ fontSize: '0.68em', background: isLight ? '#16a34a' : 'rgba(16,185,129,0.2)', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px' }}>TODAY</span>}
                                        </div>
                                    </td>
                                    
                                    {Array.from({length: maxTasksInDay}, (_, colIndex) => {
                                        const task = tasksForDay[colIndex];
                                        const cardTheme = getTaskCardTheme(task);
                                        const selTheme = task ? getStatusSelectTheme(task.status) : null;

                                        return (
                                            <td key={colIndex} style={{ width: '325px', boxSizing: 'border-box', padding: '5px 8px', borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'var(--table-border, rgba(255,255,255,0.04))'}`, borderRight: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)'}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {task ? (
                                                        <div 
                                                            onClick={() => { setTaskDetailsModal(task); setRescheduleDate(toYearMonthDay(task.due_date)); setIsEditingTask(false); }}
                                                            style={{ 
                                                                padding: '7px 12px', 
                                                                background: cardTheme.bg, 
                                                                border: cardTheme.border, 
                                                                borderRadius: '10px', 
                                                                width: '185px', 
                                                                minWidth: '185px',
                                                                maxWidth: '185px',
                                                                boxSizing: 'border-box',
                                                                whiteSpace: 'nowrap', 
                                                                overflow: 'hidden', 
                                                                textOverflow: 'ellipsis', 
                                                                fontSize: '0.85em', 
                                                                fontWeight: 700, 
                                                                color: cardTheme.color, 
                                                                transition: 'all 0.15s', 
                                                                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none', 
                                                                cursor: 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'space-between',
                                                                gap: '6px',
                                                                flexShrink: 0
                                                            }} 
                                                            title={task.title}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isLight ? '0 4px 10px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.3)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'; }}
                                                        >
                                                            <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{task.title}</span>
                                                            {(task.description || task.attachment) && (
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.8 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* Empty Task Title Cell - Click to Add Task */
                                                        <div 
                                                            onClick={() => setQuickAssignModal({ open: true, date: dayKey, employee_id: activeWorker || (sortedWorkers[0]?.id || ''), project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' })}
                                                            style={{ 
                                                                width: '185px', 
                                                                minWidth: '185px',
                                                                maxWidth: '185px',
                                                                height: '34px',
                                                                boxSizing: 'border-box',
                                                                borderRadius: '10px', 
                                                                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`, 
                                                                background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)', 
                                                                cursor: 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                color: isLight ? '#475569' : '#cbd5e1', 
                                                                fontSize: '0.84em', 
                                                                fontWeight: 700, 
                                                                transition: 'all 0.15s', 
                                                                flexShrink: 0
                                                            }} 
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = isLight ? '#eff6ff' : 'rgba(59,130,246,0.08)'; e.currentTarget.style.color = '#2563eb'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = isLight ? '#475569' : '#cbd5e1'; }}
                                                            title={`Click to Assign Task for ${dayKey}`}
                                                        >
                                                            <span>+ Add Task</span>
                                                        </div>
                                                    )}

                                                    {/* Task Status Dropdown */}
                                                    <div style={{ position: 'relative', width: '120px', minWidth: '120px', maxWidth: '120px', boxSizing: 'border-box', flexShrink: 0 }}>
                                                        {task && selTheme ? (
                                                            <select 
                                                                value={task.status}
                                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '6px 20px 6px 8px', 
                                                                    border: `1px solid ${selTheme.border}`, 
                                                                    borderRadius: '10px', 
                                                                    fontSize: '0.8em', 
                                                                    fontWeight: 700, 
                                                                    cursor: 'pointer',
                                                                    background: selTheme.bg,
                                                                    color: selTheme.color,
                                                                    outline: 'none', 
                                                                    appearance: 'none', 
                                                                    transition: 'all 0.2s',
                                                                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                                                                }}
                                                            >
                                                                <option value="Assigned" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 600 }}>📌 Assigned</option>
                                                                <option value="In Progress" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#d97706' : '#fbbf24', fontWeight: 600 }}>⚡ In Progress</option>
                                                                <option value="Pending Approval" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#7c3aed' : '#a78bfa', fontWeight: 600 }}>🔔 Approval</option>
                                                                <option value="Having Changes" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#dc2626' : '#f87171', fontWeight: 600 }}>↩ Has Changes</option>
                                                                <option value="Approved" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#16a34a' : '#4ade80', fontWeight: 600 }}>✓ Approved</option>
                                                                <option value="Completed" style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#16a34a' : '#4ade80', fontWeight: 600 }}>✅ Completed</option>
                                                            </select>
                                                        ) : (
                                                            <select 
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setQuickAssignModal({ 
                                                                            open: true, 
                                                                            date: dayKey, 
                                                                            employee_id: activeWorker || (sortedWorkers[0]?.id || ''), 
                                                                            project_id: '', 
                                                                            category: 'Graphic', 
                                                                            title: '', 
                                                                            description: '', 
                                                                            status: val 
                                                                        });
                                                                    }
                                                                }}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '6px 20px 6px 8px', 
                                                                    borderRadius: '10px', 
                                                                    fontSize: '0.8em', 
                                                                    fontWeight: 700, 
                                                                    cursor: 'pointer',
                                                                    background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                                                                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                                                                    color: isLight ? '#64748b' : 'var(--text-muted)',
                                                                    outline: 'none', 
                                                                    appearance: 'none', 
                                                                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.02)' : 'none'
                                                                }}
                                                            >
                                                                <option value="" disabled>Select ▾</option>
                                                                <option value="Assigned">📌 Assign</option>
                                                                <option value="In Progress">⚡ In Progress</option>
                                                                <option value="Completed">✅ Done</option>
                                                            </select>
                                                        )}
                                                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7em', color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.3)' }}>▼</span>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bottom Worker Filter Tabs (High Contrast) */}
            <div style={{ display: 'flex', padding: '16px 24px', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.15)' }}>
                <div 
                    onClick={() => setActiveWorker(null)}
                    style={{
                        padding: '10px 20px', fontSize: '0.92em', fontWeight: 800,
                        background: activeWorker === null ? (isLight ? '#3b82f6' : 'linear-gradient(135deg, #3b82f6, #6366f1)') : (isLight ? '#ffffff' : 'rgba(255,255,255,0.04)'),
                        color: activeWorker === null ? '#ffffff' : (isLight ? '#334155' : '#94a3b8'),
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                        border: activeWorker === null ? '1px solid #2563eb' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                        boxShadow: activeWorker === null ? '0 4px 12px rgba(59,130,246,0.25)' : (isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none')
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    All Operations
                </div>
                {sortedWorkers.map(w => {
                    const isActive = activeWorker === w.id;
                    const wCount = monthTasks.filter(t => t && t.employee_id === w.id).length;
                    return (
                        <div 
                            key={w.id}
                            onClick={() => setActiveWorker(w.id)}
                            style={{
                                padding: '10px 18px', fontSize: '0.9em', fontWeight: isActive ? 800 : 600,
                                background: isActive ? (isLight ? '#3b82f6' : 'rgba(59,130,246,0.25)') : (isLight ? '#ffffff' : 'rgba(255,255,255,0.04)'),
                                color: isActive ? '#ffffff' : (isLight ? '#1e293b' : '#cbd5e1'),
                                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                border: isActive ? '1px solid #2563eb' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`,
                                display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                                boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.2)' : (isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none')
                            }}
                        >
                            <span>{w.name}</span>
                            <span style={{ 
                                fontSize: '0.78em', 
                                fontWeight: 800,
                                padding: '2px 8px', 
                                borderRadius: '20px', 
                                background: isActive ? (isLight ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.3)') : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'), 
                                color: isActive ? '#ffffff' : (isLight ? '#475569' : '#94a3b8') 
                            }}>
                                {wCount}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Task Details / Edit Full Modal */}
            {taskDetailsModal && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px', margin: 0, boxSizing: 'border-box' }}
                    onClick={() => { setTaskDetailsModal(null); setIsEditingTask(false); }}
                >
                    <div 
                        style={{ background: isLight ? '#ffffff' : '#1e293b', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {!isEditingTask ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25em', fontWeight: 800, color: 'var(--text-main)', flex: 1, paddingRight: '10px' }}>
                                        {taskDetailsModal.title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => {
                                                setEditTaskForm({
                                                    title: taskDetailsModal.title || '',
                                                    category: taskDetailsModal.category || 'Graphic',
                                                    status: taskDetailsModal.status || 'Assigned',
                                                    due_date: toYearMonthDay(taskDetailsModal.due_date) || '',
                                                    description: taskDetailsModal.description || ''
                                                });
                                                setIsEditingTask(true);
                                            }}
                                            style={{ padding: '6px 12px', background: isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)', color: '#3b82f6', border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button 
                                            onClick={() => setTaskDetailsModal(null)} 
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2em', padding: '0 4px', lineHeight: 1 }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                
                                <div style={{ color: isLight ? '#64748b' : 'var(--text-muted)', fontSize: '0.88em', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.85em', fontWeight: 700, background: isLight ? '#e0f2fe' : 'rgba(59,130,246,0.15)', color: isLight ? '#0284c7' : '#60a5fa' }}>{taskDetailsModal.status}</span>
                                    <span>Assigned to: <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{taskDetailsModal.worker_name || 'Worker'}</strong></span>
                                    {taskDetailsModal.project_id && <span style={{ background: isLight ? '#eff6ff' : 'rgba(96,165,250,0.1)', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Project ID: {taskDetailsModal.project_id}</span>}
                                    {taskDetailsModal.category && <span style={{ background: isLight ? '#faf5ff' : 'rgba(168,85,247,0.1)', color: '#9333ea', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{taskDetailsModal.category}</span>}
                                </div>

                                {taskDetailsModal.description && (
                                    <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', marginBottom: '18px', fontSize: '0.92em', color: isLight ? '#334155' : 'var(--text-main)', whiteSpace: 'pre-wrap', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}`, lineHeight: 1.5 }}>
                                        {taskDetailsModal.description}
                                    </div>
                                )}

                                {taskDetailsModal.attachment && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <a href={taskDetailsModal.attachment} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.1)', color: '#2563eb', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)'}`, fontSize: '0.9em' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                            View Attachment
                                        </a>
                                    </div>
                                )}

                                {taskDetailsModal.worker_note && (
                                    <div style={{ background: isLight ? '#fefce8' : 'rgba(234, 179, 8, 0.05)', borderLeft: '4px solid #eab308', padding: '12px 15px', borderRadius: '0 10px 10px 0', marginBottom: '18px', fontSize: '0.9em' }}>
                                        <strong style={{ color: isLight ? '#a16207' : '#fde047', display: 'block', marginBottom: '4px' }}>Designer Note:</strong>
                                        <span style={{ color: isLight ? '#475569' : 'var(--text-main)' }}>{taskDetailsModal.worker_note}</span>
                                    </div>
                                )}

                                {/* Admin / Reschedule Controls */}
                                <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : 'var(--panel-border)'}`, paddingTop: '18px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>RESCHEDULE DATE</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="date" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, borderRadius: '8px', background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : 'var(--text-main)', fontSize: '0.9em', outline: 'none' }} />
                                            <button onClick={() => handleAdminReschedule(taskDetailsModal.id)} style={{ padding: '8px 16px', background: isLight ? '#eff6ff' : 'rgba(59,130,246,0.1)', color: '#2563eb', border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9em' }}>Update</button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAdminDelete(taskDetailsModal.id)} style={{ padding: '8px 16px', background: isLight ? '#fee2e2' : 'rgba(239,68,68,0.1)', color: '#dc2626', border: `1px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        Delete
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <h3 style={{ margin: '0 0 6px 0', color: '#3b82f6', fontWeight: 800 }}>Edit Operation Details</h3>
                                
                                <div>
                                    <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)' }}>TITLE</label>
                                    <input type="text" value={editTaskForm.title} onChange={e=>setEditTaskForm({...editTaskForm, title: e.target.value})} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', marginTop: '4px', boxSizing: 'border-box' }} />
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)' }}>CATEGORY</label>
                                        <select value={editTaskForm.category} onChange={e=>setEditTaskForm({...editTaskForm, category: e.target.value})} style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', marginTop: '4px', boxSizing: 'border-box' }}>
                                            <option value="Graphic">Graphic</option>
                                            <option value="Video">Video</option>
                                            <option value="Content">Content</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)' }}>STATUS</label>
                                        <select value={editTaskForm.status} onChange={e=>setEditTaskForm({...editTaskForm, status: e.target.value})} style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', marginTop: '4px', boxSizing: 'border-box' }}>
                                            <option value="Assigned">Assigned</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Pending Approval">Pending Approval</option>
                                            <option value="Having Changes">Having Changes</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)' }}>DUE DATE</label>
                                    <input type="date" value={editTaskForm.due_date} onChange={e=>setEditTaskForm({...editTaskForm, due_date: e.target.value})} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', marginTop: '4px', boxSizing: 'border-box' }} />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)' }}>DESCRIPTION / GUIDELINES</label>
                                    <textarea rows={3} value={editTaskForm.description} onChange={e=>setEditTaskForm({...editTaskForm, description: e.target.value})} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', marginTop: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button onClick={()=>setIsEditingTask(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: 'transparent', color: isLight ? '#64748b' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={handleFullEditSave} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save Changes ✓</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Assign Operation Modal */}
            {quickAssignModal.open && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px', margin: 0, boxSizing: 'border-box' }}
                    onClick={() => setQuickAssignModal({ open: false, date: '', employee_id: '', project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' })}
                >
                    <div 
                        style={{ background: isLight ? '#ffffff' : '#1e293b', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--panel-border)'}`, borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2em', fontWeight: 800, color: 'var(--text-main)' }}>
                                ⚡ Quick Assign Operation
                            </h3>
                            <button 
                                onClick={() => setQuickAssignModal({ open: false, date: '', employee_id: '', project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' })} 
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2em', padding: '0 4px', lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleQuickAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>DATE</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={quickAssignModal.date} 
                                    onChange={e => setQuickAssignModal({ ...quickAssignModal, date: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>OPERATION TITLE *</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g., Summer Promo Post #1"
                                    value={quickAssignModal.title} 
                                    onChange={e => setQuickAssignModal({ ...quickAssignModal, title: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>ASSIGNEE *</label>
                                    <select 
                                        required
                                        value={quickAssignModal.employee_id} 
                                        onChange={e => setQuickAssignModal({ ...quickAssignModal, employee_id: e.target.value })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                    >
                                        <option value="">Select Assignee</option>
                                        {sortedWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.position || 'Worker'})</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>CATEGORY</label>
                                    <select 
                                        value={quickAssignModal.category} 
                                        onChange={e => setQuickAssignModal({ ...quickAssignModal, category: e.target.value })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                    >
                                        <option value="Graphic">Graphic</option>
                                        <option value="Video">Video</option>
                                        <option value="Content">Content</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>PROJECT (OPTIONAL)</label>
                                <select 
                                    value={quickAssignModal.project_id} 
                                    onChange={e => setQuickAssignModal({ ...quickAssignModal, project_id: e.target.value })}
                                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                >
                                    <option value="">No Project Attached</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>INITIAL STATUS</label>
                                <select 
                                    value={quickAssignModal.status} 
                                    onChange={e => setQuickAssignModal({ ...quickAssignModal, status: e.target.value })}
                                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box' }}
                                >
                                    <option value="Assigned">📌 Assigned</option>
                                    <option value="In Progress">⚡ In Progress</option>
                                    <option value="Completed">✅ Completed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8em', fontWeight: 700, color: isLight ? '#64748b' : 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>DESCRIPTION / GUIDELINES (OPTIONAL)</label>
                                <textarea 
                                    rows={2} 
                                    placeholder="Add guidelines or client comments..."
                                    value={quickAssignModal.description} 
                                    onChange={e => setQuickAssignModal({ ...quickAssignModal, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: isLight ? '#fff' : 'var(--input-bg)', color: isLight ? '#0f172a' : '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setQuickAssignModal({ open: false, date: '', employee_id: '', project_id: '', category: 'Graphic', title: '', description: '', status: 'Assigned' })}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${isLight ? '#cbd5e1' : 'var(--input-border)'}`, background: 'transparent', color: isLight ? '#64748b' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={quickAssignSubmitting}
                                    style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: quickAssignSubmitting ? 0.7 : 1 }}
                                >
                                    {quickAssignSubmitting ? 'Assigning...' : 'Deploy Operation ✓'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
