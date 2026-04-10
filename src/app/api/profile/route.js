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
        const [rows] = await pool.query("SELECT * FROM employees WHERE id=?", [user.id]);
        return NextResponse.json({ profile: rows[0] });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
  
export async function PUT(req) {
    const user = getUser(req);
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const { name, email, phone, password, profile_picture } = await req.json();

      let query = "UPDATE employees SET name=?, email=?, phone=?, password=?";
      let params = [name, email, phone, password];

      if(profile_picture) {
          query += ", profile_picture=?";
          params.push(profile_picture);
      }

      query += " WHERE id=?";
      params.push(user.id);

      await pool.query(query, params);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
