import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secret_feenix_key_123';

export async function POST(req) {
  try {
    const { action, ...data } = await req.json();

    if (action === 'register') {
      const { name, email, phone, position, password, role } = data;
      const [result] = await pool.query(
        "INSERT INTO employees (name, email, phone, position, password, role) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, phone, position, password, role]
      );
      return NextResponse.json({ success: true, message: 'Registered Successfully!' });
    }

    if (action === 'login') {
      const { email, password } = data;
      const [rows] = await pool.query(
        "SELECT * FROM employees WHERE email=? AND password=?",
        [email, password]
      );

      if (rows.length > 0) {
        const user = rows[0];
        
        // Update last_active
        await pool.query("UPDATE employees SET last_active=CURRENT_TIMESTAMP WHERE id=?", [user.id]);

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
        
        response.cookies.set('token', token, { httpOnly: true, path: '/' });
        return response;
      } else {
        return NextResponse.json({ error: 'Invalid Login Credentials!' }, { status: 401 });
      }
    }

    // Logout Action
    if (action === 'logout') {
        const response = NextResponse.json({ success: true });
        response.cookies.delete('token');
        return response;
    }

    return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Middleware or route guard to verify tokens directly from cookies
export async function GET(req) {
    const token = req.cookies.get('token')?.value;
    if(!token) return NextResponse.json({ authenticated: false }, { status: 401 });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return NextResponse.json({ authenticated: true, user: decoded });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
