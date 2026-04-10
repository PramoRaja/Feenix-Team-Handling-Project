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
        const [rows] = await pool.query("SELECT * FROM company_holidays ORDER BY holiday_date ASC");
        return NextResponse.json({ holidays: rows });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    const user = getUser(req);
    if(!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { date, reason } = await req.json();
        const [result] = await pool.query(
            "INSERT INTO company_holidays (holiday_date, reason) VALUES (?, ?)",
            [date, reason]
        );
        return NextResponse.json({ success: true, id: result.insertId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    const user = getUser(req);
    if(!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await pool.query("DELETE FROM company_holidays WHERE id=?", [id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
