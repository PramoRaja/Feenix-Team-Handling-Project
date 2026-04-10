'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Calendar as CalendarIcon, Clock, Sun, Trash2, Plus } from 'lucide-react';

export default function CalendarPage() {
    const [user, setUser] = useState(null);
    const [holidays, setHolidays] = useState([]);
    const [form, setForm] = useState({ date: '', reason: '' });
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const router = useRouter();

    const fetchHolidays = () => {
        fetch('/api/calendar').then(r=>r.json()).then(d=>{
            if(d.holidays) setHolidays(d.holidays);
        });
    };

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if(!d.authenticated) router.push('/login');
            else setUser(d.user);
        });
        fetchHolidays();
    }, []);

    const addHoliday = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        });
        if(res.ok) {
            setForm({date: '', reason: ''});
            fetchHolidays();
        }
    };

    const deleteHoliday = async (id) => {
        await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
        fetchHolidays();
    };

    if(!user) return null;

    // Calendar Math
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    
    // Map holidays strings to YYYY-MM-DD
    const holidayMap = {};
    holidays.forEach(h => {
        if(h.holiday_date) {
            const d = new Date(h.holiday_date);
            const str = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            holidayMap[str] = { id: h.id, reason: h.reason };
        }
    });

    const renderCalendar = () => {
        const blanks = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            blanks.push(<td key={`blank-${i}`} className="calendar-day empty"></td>);
        }

        const daysInMonthBlocks = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const currentObj = new Date(year, month, d);
            const dateStr = new Date(currentObj.getTime() - (currentObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            const isSunday = currentObj.getDay() === 0;
            const isCustomHoliday = holidayMap[dateStr];
            
            const isToday = dateStr === new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            let className = "calendar-day";
            if (isToday) className += " today";
            if (isSunday || isCustomHoliday) className += " holiday";

            daysInMonthBlocks.push(
                <td key={`day-${d}`} className={className} title={isCustomHoliday ? isCustomHoliday.reason : (isSunday ? "Sunday Off-Day" : "Work Day")}>
                    <div className="day-number">{d}</div>
                    {(isSunday || isCustomHoliday) && (
                        <div className="day-label" style={{background: isCustomHoliday ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: isCustomHoliday ? '#f59e0b' : '#ef4444'}}>
                           {isCustomHoliday ? isCustomHoliday.reason.substring(0, 15) + (isCustomHoliday.reason.length > 15 ? '...' : '') : "Weekend"}
                        </div>
                    )}
                </td>
            );
        }

        const totalSlots = [...blanks, ...daysInMonthBlocks];
        const rows = [];
        let cells = [];

        totalSlots.forEach((row, i) => {
            if (i % 7 !== 0) {
                cells.push(row);
            } else {
                if (cells.length > 0) rows.push(<tr key={`row-${i}`}>{cells}</tr>);
                cells = [];
                cells.push(row);
            }
            if (i === totalSlots.length - 1) {
                while(cells.length < 7) {
                    cells.push(<td key={`blank-tail-${cells.length}`} className="calendar-day empty"></td>);
                }
                rows.push(<tr key={`row-tail`}>{cells}</tr>);
            }
        });

        return (
            <table className="calendar-table">
                <thead>
                    <tr>
                        <th style={{color:'#ef4444'}}>Sun</th>
                        <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        );
    };

    return (
        <AppLayout user={user}>
            <style jsx global>{`
                .calendar-wrapper { display: flex; gap: 30px; align-items: flex-start; }
                .calendar-main { flex: 1; }
                .calendar-sidebar { width: 320px; display: flex; flexDirection: column; gap: 20px;}
                
                .calendar-table { width: 100%; border-collapse: separate; border-spacing: 8px; }
                .calendar-table th { padding: 15px; text-align: left; color: var(--text-muted); font-weight: 500; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;}
                .calendar-day { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 14px; height: 110px; width: 14.28%; vertical-align: top; padding: 12px; transition: all 0.3s ease; position: relative;}
                .calendar-day:hover { border-color: #3b82f6; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); transform: translateY(-2px);}
                .calendar-day.empty { background: transparent; border-color: transparent; }
                
                .day-number { font-size: 1.2em; font-weight: 600; color: var(--text-main); margin-bottom: 8px; }
                .calendar-day.today { border-color: #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.15); }
                .calendar-day.today .day-number { color: #10b981; }
                
                .calendar-day.holiday { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.02); }
                .calendar-day.holiday .day-number { color: #ef4444; }
                
                .day-label { font-size: 0.7em; font-weight: 600; padding: 4px 8px; border-radius: 6px; text-wrap: wrap; line-height:1.2; word-break: break-word;}
                
                .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .cal-nav-btn { background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--text-main); padding: 8px 16px; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; font-weight: 600;}
                .cal-nav-btn:hover { border-color: #3b82f6; color: #3b82f6; }
            `}</style>
            
            <div className="animate-slide-up calendar-wrapper">
                {/* Main Calendar View */}
                <div className="calendar-main glass-panel" style={{padding:'30px'}}>
                    <div className="cal-header">
                        <h2 style={{margin:0, display:'flex', alignItems:'center', gap:'12px', fontSize:'1.8em'}}>
                           <CalendarIcon color="#3b82f6" size={28}/> 
                           {currentDate.toLocaleString('default', { month: 'long' })} {year}
                        </h2>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button className="cal-nav-btn" onClick={()=>setCurrentDate(new Date(year, month - 1, 1))}>Previous</button>
                            <button className="cal-nav-btn" onClick={()=>setCurrentDate(new Date())}>Today</button>
                            <button className="cal-nav-btn" onClick={()=>setCurrentDate(new Date(year, month + 1, 1))}>Next</button>
                        </div>
                    </div>
                    {renderCalendar()}
                </div>
                
                <div className="calendar-sidebar" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    
                    {/* Schedule Banner */}
                    <div className="glass-panel" style={{padding:'25px', background:'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))', border:'1px solid rgba(59, 130, 246, 0.2)'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'15px'}}>
                            <Clock color="#3b82f6" size={24} />
                            <h3 style={{margin:0, fontSize:'1.2em'}}>Company Schedule</h3>
                        </div>
                        <ul style={{listStyle:'none', padding:0, margin:0, color:'var(--text-main)', fontSize:'0.95em'}}>
                            <li style={{marginBottom:'10px', display:'flex', justifyContent:'space-between'}}>
                                <span style={{color:'var(--text-muted)'}}>Work Days:</span>
                                <strong>Monday - Saturday</strong>
                            </li>
                            <li style={{marginBottom:'10px', display:'flex', justifyContent:'space-between'}}>
                                <span style={{color:'var(--text-muted)'}}>Active Hours:</span>
                                <strong>8:30 AM - 5:00 PM</strong>
                            </li>
                            <li style={{display:'flex', justifyContent:'space-between'}}>
                                <span style={{color:'var(--text-muted)'}}>Off Days:</span>
                                <strong style={{color:'#ef4444'}}>Sunday</strong>
                            </li>
                        </ul>
                    </div>

                    {/* Admin Tools for Custom Vacations */}
                    {user?.role === 'admin' && (
                        <div className="glass-panel" style={{padding:'25px'}}>
                            <h3 style={{marginTop:0, marginBottom:'20px', fontSize:'1.1em', display:'flex', alignItems:'center', gap:'8px'}}><Sun size={18} color="#f59e0b"/> Vacation Manager</h3>
                            <form onSubmit={addHoliday} style={{display:'flex', flexDirection:'column', gap:'15px', marginBottom:'20px'}}>
                                <div>
                                    <label>Add Vacation Date</label>
                                    <input type="date" required value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
                                </div>
                                <div>
                                    <label>Reason / Holiday Name</label>
                                    <input type="text" required placeholder="E.g., Poya Day" value={form.reason} onChange={e=>setForm({...form, reason:e.target.value})} />
                                </div>
                                <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'5px'}}><Plus size={18}/> Assign Holiday</button>
                            </form>
                            
                            <h4 style={{margin:'0 0 10px 0', fontSize:'0.9em', color:'var(--text-muted)', textTransform:'uppercase'}}>Listed Valid Holidays</h4>
                            <div style={{maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
                                {holidays.length > 0 ? holidays.map(h => {
                                     // format date
                                     const d = h.holiday_date ? new Date(h.holiday_date) : null;
                                     const str = d ? new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toLocaleDateString() : '';
                                     return (
                                     <div key={h.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)', padding:'10px 12px', borderRadius:'10px', border:'1px solid var(--panel-border)'}}>
                                         <div>
                                             <div style={{fontWeight:600, fontSize:'0.9em', color:'#f59e0b'}}>{h.reason}</div>
                                             <div style={{fontSize:'0.75em', color:'var(--text-muted)'}}>{str}</div>
                                         </div>
                                         <button onClick={() => deleteHoliday(h.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}} title="Remove"><Trash2 size={16} /></button>
                                     </div>
                                 )}) : <div style={{fontSize:'0.85em', color:'var(--text-muted)'}}>No custom holidays assigned yet.</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
