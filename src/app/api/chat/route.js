import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secret_feenix_key_123';

function getUser(req) {
    const token = req.cookies.get('token')?.value;
    if(!token) return null;
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// GET: fetch conversation between me and another person, or get unread count
export async function GET(req) {
    const user = getUser(req);
    if(!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withId = searchParams.get('with');
    const unreadOnly = searchParams.get('unread');

    try {
        if(unreadOnly) {
            // Total unread across all conversations
            const [rows] = await pool.query(
                "SELECT COUNT(id) as count FROM messages WHERE receiver_id=? AND is_read=0",
                [user.id]
            );
            return NextResponse.json({ unread: rows[0].count });
        }

        if(withId) {
            // Mark messages from that person as read
            await pool.query(
                "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0",
                [withId, user.id]
            );

            // Fetch full conversation
            const [messages] = await pool.query(
                `SELECT m.*, e.name as sender_name, e.profile_picture as sender_pic
                 FROM messages m 
                 JOIN employees e ON m.sender_id = e.id
                 WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
                 ORDER BY m.created_at ASC`,
                [user.id, withId, withId, user.id]
            );
            return NextResponse.json({ messages });
        }

        // Get conversation list — last message per person + unread count
        const [threads] = await pool.query(
            `SELECT e.id, e.name, e.position, e.profile_picture,
                (SELECT COUNT(*) FROM messages WHERE sender_id=e.id AND receiver_id=? AND is_read=0) as unread,
                (SELECT message FROM messages WHERE (sender_id=? AND receiver_id=e.id) OR (sender_id=e.id AND receiver_id=?) ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE (sender_id=? AND receiver_id=e.id) OR (sender_id=e.id AND receiver_id=?) ORDER BY created_at DESC LIMIT 1) as last_at
             FROM employees e
             WHERE e.id != ?
             ORDER BY last_at DESC, e.name ASC`,
            [user.id, user.id, user.id, user.id, user.id, user.id]
        );

        return NextResponse.json({ threads });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: send a message
export async function POST(req) {
    const user = getUser(req);
    if(!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const { receiver_id, message, attachment } = await req.json();
        if(!receiver_id || (!message?.trim() && !attachment)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, message, attachment) VALUES (?, ?, ?, ?)",
            [user.id, receiver_id, message?.trim() || '', attachment || null]
        );
        return NextResponse.json({ success: true });
    } catch(err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
