import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secret_feenix_key_123';

function getUser(req) {
    const token = req.cookies.get('token')?.value;
    if(!token) return null;
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export async function GET(req) {
    const user = getUser(req);
    if(!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    
    try {
        const [rows] = await pool.query("SELECT attendance_status, attendance_date FROM employees WHERE id=?", [user.id]);
        return NextResponse.json({ attendance: rows[0] });
    } catch(err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    const user = getUser(req);
    if(!user || user.role !== 'worker') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { status } = await req.json(); // 'Present' or 'Leave'
        const rawDate = new Date();
        const date = rawDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        await pool.query("UPDATE employees SET attendance_status=?, attendance_date=? WHERE id=?", [status, date, user.id]);
        
        if (status === 'Leave') {
            await pool.query("INSERT INTO notifications (worker_id, task_id, message) VALUES (?, ?, ?)", 
               [user.id, null, `Notified absence (On Leave) for ${date}.`]
            );
        }

        return NextResponse.json({ success: true, status, date });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
