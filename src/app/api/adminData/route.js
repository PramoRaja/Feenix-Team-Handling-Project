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
    if(!user || user.role !== 'admin') return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  
    try {
        // We'll return 3 things: active workers list, unread alerts count, and all alerts.
        const [workers] = await pool.query("SELECT * FROM employees WHERE role='worker' ORDER BY name ASC");
        
        // Notifications
        const [unreadRow] = await pool.query("SELECT COUNT(id) as c FROM notifications WHERE is_read=0");
        const unread_count = unreadRow[0].c;

        const [alerts] = await pool.query("SELECT n.*, e.name FROM notifications n LEFT JOIN employees e ON n.worker_id = e.id ORDER BY n.created_at DESC");

        return NextResponse.json({ workers, unread_count, alerts });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    // mark alerts read
    const user = getUser(req);
    if(!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await pool.query("UPDATE notifications SET is_read=1");
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    const user = getUser(req);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { workerId } = await req.json();
        if (!workerId) return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 });

        // Ensure the absolute deletion of a worker's trace
        await pool.query("DELETE FROM messages WHERE sender_id=? OR receiver_id=?", [workerId, workerId]);
        await pool.query("DELETE FROM notifications WHERE worker_id=?", [workerId]);
        await pool.query("DELETE FROM tasks WHERE employee_id=? OR assigner_id=?", [workerId, workerId]);
        const [result] = await pool.query("DELETE FROM employees WHERE id=? AND role='worker'", [workerId]);

        if (result.affectedRows === 0) {
             return NextResponse.json({ error: 'Worker not found or cannot be deleted' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Node terminated successfully.' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    const user = getUser(req);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        if (body.action === 'assignLeader') {
            await pool.query("UPDATE employees SET assigned_leader_id=? WHERE id=?", [body.leaderId || null, body.workerId]);
            return NextResponse.json({ success: true, message: 'Team Leader assigned successfully.' });
        }
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
