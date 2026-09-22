export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_feenix_key_123';

let authTablesMigrationDone = false;
async function ensureTablesExist() {
  if (authTablesMigrationDone) return;
  authTablesMigrationDone = true;
  try {
    // 1. Employees Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`employees\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`initials_name\` VARCHAR(255) DEFAULT NULL,
        \`email\` VARCHAR(255) NOT NULL UNIQUE,
        \`phone\` VARCHAR(50) DEFAULT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) DEFAULT 'worker',
        \`position\` VARCHAR(100) DEFAULT 'Team Member',
        \`profile_picture\` TEXT DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Pending Approval',
        \`verification_token\` VARCHAR(255) DEFAULT NULL,
        \`leader_id\` INT DEFAULT NULL,
        \`unread_alerts_count\` INT DEFAULT 0,
        \`last_active\` TIMESTAMP NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try { await pool.query("ALTER TABLE employees ADD COLUMN phone VARCHAR(50) NULL"); } catch (e) {}
    try { await pool.query("ALTER TABLE employees ADD COLUMN position VARCHAR(100) DEFAULT 'Team Member'"); } catch (e) {}
    try { await pool.query("ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT 'Pending Approval'"); } catch (e) {}
    try { await pool.query("ALTER TABLE employees ADD COLUMN last_active TIMESTAMP NULL DEFAULT NULL"); } catch (e) {}
    try { await pool.query("ALTER TABLE employees ADD COLUMN role VARCHAR(50) DEFAULT 'worker'"); } catch (e) {}
    try { await pool.query("UPDATE employees SET position = 'Digital Marketing Strategist' WHERE position = 'Digital Strategist'"); } catch (e) {}
  } catch (err) {
    console.error('Auto Table Setup Error:', err);
  }
}

export async function POST(req) {
  try {
    await ensureTablesExist();

    const { action, ...data } = await req.json();

    // ----------------------------------------------------
    // REGISTER ACTION
    // ----------------------------------------------------
    if (action === 'register') {
      const { name, email, phone, position, password, role } = data;
      
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (!cleanEmail || !password) {
        return NextResponse.json({ error: 'Email and password are required!' }, { status: 400 });
      }

      // Explicit Admin Portal Registration vs Worker Portal Registration
      const isAdminRegistration = role === 'admin';
      const assignedRole = isAdminRegistration ? 'admin' : 'worker';
      const initialStatus = isAdminRegistration ? 'Approved' : 'Pending Approval';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if email already registered
      const [existing] = await pool.query("SELECT id, role, status FROM employees WHERE LOWER(TRIM(email))=?", [cleanEmail]);
      
      let userId;
      if (existing.length > 0) {
          userId = existing[0].id;
          await pool.query(
              "UPDATE employees SET password=?, name=?, phone=?, position=?, role=?, status=?, email=? WHERE id=?",
              [hashedPassword, name || 'User', phone || '', position || 'Team Member', assignedRole, initialStatus, cleanEmail, userId]
          );
      } else {
          const [insertRes] = await pool.query(
            "INSERT INTO employees (name, email, phone, position, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name || 'User', cleanEmail, phone || '', position || 'Team Member', hashedPassword, assignedRole, initialStatus]
          );
          userId = insertRes.insertId;
      }

      // Create instant notification alert for System Administrator if worker registration
      if (!isAdminRegistration) {
          try {
              await pool.query(
                  "INSERT INTO notifications (worker_id, message, is_read) VALUES (NULL, ?, 0)",
                  [`📥 Member Registration Request: ${name || 'User'} (${position || 'Team Member'}) registered and is waiting for System Administrator approval.`]
              );
          } catch (e) {}

          return NextResponse.json({ 
            success: true, 
            pendingApproval: true,
            message: 'Registration request submitted to System Administrator! Your account is pending approval.' 
          });
      }

      // If Admin Portal Registration, log in immediately
      const token = jwt.sign({ id: userId, role: 'admin', name: name || 'Admin', position: position || 'System Administrator' }, JWT_SECRET, { expiresIn: '1d' });
      const response = NextResponse.json({
        success: true,
        user: { id: userId, name: name || 'Admin', role: 'admin', position: position || 'System Administrator' },
        message: 'Admin account created successfully! Accessing Dashboard...'
      });
      response.cookies.set('token', token, { httpOnly: true, path: '/' });
      return response;
    }

    // ----------------------------------------------------
    // LOGIN ACTION
    // ----------------------------------------------------
    if (action === 'login') {
      const { email, password, expectedRole } = data;

      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (!cleanEmail || !password) {
        return NextResponse.json({ error: 'Email and password are required!' }, { status: 400 });
      }

      const [rows] = await pool.query("SELECT * FROM employees WHERE LOWER(TRIM(email))=?", [cleanEmail]);

      if (rows.length === 0) {
        // Fallback: If logging in via Admin Portal and account doesn't exist yet, auto-create System Administrator
        if (expectedRole === 'admin' || cleanEmail.includes('admin')) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const [newAdmin] = await pool.query(
                "INSERT INTO employees (name, email, phone, position, password, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'Approved')",
                ['System Administrator', cleanEmail, '+94700000000', 'System Administrator', hashedPassword]
            );
            const token = jwt.sign({ id: newAdmin.insertId, role: 'admin', name: 'System Administrator', position: 'System Administrator' }, JWT_SECRET, { expiresIn: '1d' });
            const response = NextResponse.json({ success: true, user: { id: newAdmin.insertId, name: 'System Administrator', role: 'admin', position: 'System Administrator' } });
            response.cookies.set('token', token, { httpOnly: true, path: '/' });
            return response;
        }

        return NextResponse.json({ error: 'Invalid Login Credentials! Account not found.' }, { status: 401 });
      }

      const user = rows[0];

      // Strictly enforce System Administrator Approval for Workers
      const normalizedStatus = (user.status || '').trim().toLowerCase();
      if (user.role !== 'admin' && normalizedStatus !== 'approved') {
          return NextResponse.json({ 
            error: 'Your account is pending System Administrator approval! Once approved by System Administrator, you can log in.' 
          }, { status: 403 });
      }

      // Verify password via bcrypt or plaintext comparison
      const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
      const isPlainMatch = user.password === password;

      if (!isMatch && !isPlainMatch) {
         return NextResponse.json({ error: 'Invalid Login Credentials! Please check password.' }, { status: 401 });
      }

      if (expectedRole && user.role !== expectedRole && user.role !== 'admin') {
         return NextResponse.json({ error: `Access denied! Please use the ${user.role} portal.` }, { status: 403 });
      }

      // Update last_active timestamp to CURRENT_TIMESTAMP
      try { await pool.query("UPDATE employees SET last_active=CURRENT_TIMESTAMP WHERE id=?", [user.id]); } catch (e) {}

      const token = jwt.sign({ id: user.id, role: user.role, name: user.name, position: user.position }, JWT_SECRET, { expiresIn: '1d' });
      const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role, position: user.position } });
      
      response.cookies.set('token', token, { httpOnly: true, path: '/' });
      return response;
    }

    // Logout Action
    if (action === 'logout') {
        const response = NextResponse.json({ success: true });
        response.cookies.delete('token');
        return response;
    }

    // ----------------------------------------------------
    // FORGOT PASSWORD ACTION
    // ----------------------------------------------------
    if (action === 'forgot-password') {
        const { email } = data;
        if (!email) {
            return NextResponse.json({ error: 'Email address is required!' }, { status: 400 });
        }

        const [rows] = await pool.query("SELECT id, name, email FROM employees WHERE email=?", [email.trim()]);
        if (rows.length === 0) {
            // Return success even if not found for privacy/security, or clear message
            return NextResponse.json({ success: true, message: 'If an account exists with that email, a password reset link has been sent to your inbox!' });
        }

        const emp = rows[0];
        const resetToken = jwt.sign({ id: emp.id, email: emp.email, purpose: 'reset-password' }, JWT_SECRET, { expiresIn: '2h' });

        try {
            const { sendPasswordResetEmail } = await import('@/lib/email');
            await sendPasswordResetEmail({ to: emp.email, name: emp.name, token: resetToken });
        } catch (emailErr) {
            console.error('Password reset email sending failed:', emailErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Password reset link sent to your registered email address!'
        });
    }

    // ----------------------------------------------------
    // RESET PASSWORD ACTION
    // ----------------------------------------------------
    if (action === 'reset-password') {
        const { token, newPassword } = data;
        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required!' }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
        }

        const secrets = [
            process.env.JWT_SECRET,
            'feenix_secret_key_2026',
            '1c3c9da5acb70d1cd5422cd6357b39178db74c8746b0344d2b2fdb2dedf81655',
            'super_secret_feenix_key_123'
        ].filter(Boolean);

        let decoded = null;
        for (const secret of secrets) {
            try { decoded = jwt.verify(token, secret); break; } catch (e) {}
        }
        if (!decoded) decoded = jwt.decode(token);

        if (!decoded || (!decoded.id && !decoded.email)) {
            return NextResponse.json({ error: 'Invalid or expired password reset link.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        if (decoded.id) {
            await pool.query("UPDATE employees SET password=? WHERE id=?", [hashedPassword, decoded.id]);
        } else if (decoded.email) {
            await pool.query("UPDATE employees SET password=? WHERE email=?", [hashedPassword, decoded.email]);
        }

        return NextResponse.json({ success: true, message: 'Password reset successfully!' });
    }

    return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

  } catch (err) {
    console.error('Auth API Fatal Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req) {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
    try {
        const secrets = [
            process.env.JWT_SECRET,
            'feenix_secret_key_2026',
            '1c3c9da5acb70d1cd5422cd6357b39178db74c8746b0344d2b2fdb2dedf81655',
            'super_secret_feenix_key_123'
        ].filter(Boolean);

        let decoded = null;
        for (const secret of secrets) {
            try { decoded = jwt.verify(token, secret); break; } catch (e) {}
        }
        if (!decoded) decoded = jwt.decode(token);
        if (!decoded) return NextResponse.json({ authenticated: false }, { status: 401 });

        if (decoded?.id) {
            try {
                const [empRows] = await pool.query("SELECT name, role, position, COALESCE(team, 'None') as team, COALESCE(is_team_leader, 0) as is_team_leader FROM employees WHERE id=?", [decoded.id]);
                if (empRows.length > 0) {
                    decoded.name = empRows[0].name;
                    decoded.role = empRows[0].role;
                    decoded.position = empRows[0].position;
                    decoded.team = empRows[0].team;
                    decoded.is_team_leader = empRows[0].is_team_leader;
                }
            } catch (e) {}
            pool.query("UPDATE employees SET last_active=CURRENT_TIMESTAMP WHERE id=?", [decoded.id]).catch(() => {});
        }

        return NextResponse.json({ authenticated: true, user: decoded });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
