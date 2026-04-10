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
    if(user.role === 'admin'){
        const [rows] = await pool.query("SELECT t.*, e.name as worker_name, a.name as assigner_name FROM tasks t LEFT JOIN employees e ON t.employee_id = e.id LEFT JOIN employees a ON t.assigner_id = a.id ORDER BY t.created_at DESC");
        return NextResponse.json({ tasks: rows });
    } else {
        const [rows] = await pool.query("SELECT t.*, a.name as assigner_name FROM tasks t LEFT JOIN employees a ON t.assigner_id = a.id WHERE t.employee_id=? ORDER BY t.created_at DESC", [user.id]);
        return NextResponse.json({ tasks: rows });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getUser(req);
  if(!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, description, employee_id, due_date, attachment } = await req.json();
    const [result] = await pool.query(
      "INSERT INTO tasks (title, description, employee_id, due_date, attachment, assigner_id) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, employee_id, due_date, attachment || '', user.id]
    );

    await pool.query("INSERT INTO notifications (worker_id, task_id, message) VALUES (?, ?, ?)", 
        [employee_id, result.insertId, `New Task Assigned: ${title}. Due: ${due_date}.`]
    );

    return NextResponse.json({ success: true, taskId: result.insertId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
    const user = getUser(req);
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { task_id, status, worker_note } = await req.json();
        let check;
        if (user.role === 'admin') {
             [check] = await pool.query("SELECT * FROM tasks WHERE id=?", [task_id]);
        } else {
             [check] = await pool.query("SELECT * FROM tasks WHERE id=? AND employee_id=?", [task_id, user.id]);
        }
        
        if(check.length === 0) return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
        
        const old_status = check[0].status;
        const new_note = worker_note !== undefined ? worker_note : check[0].worker_note;

        await pool.query("UPDATE tasks SET status=?, worker_note=? WHERE id=?", [status, new_note, task_id]);

        let msg = `Updated project '${check[0].title}' Status -> ${status}`;
        if (user.role === 'worker') {
            if(old_status === 'Assigned' && status === 'In Progress') msg = `Started working on project: ${check[0].title}`;
            else if(status === 'Pending Approval') msg = `Requested approval for project: ${check[0].title}`;
            else if(status === 'Completed' && old_status !== 'Completed') msg = `Completed the project: ${check[0].title}`;
            else if(worker_note) msg = `Updated project '${check[0].title}' with notes: ${worker_note.substring(0,50)}...`;
        } else {
            if(status === 'Approved') msg = `Admin approved project: ${check[0].title}`;
            else msg = `Admin updated project '${check[0].title}' status to: ${status}`;
        }

        await pool.query("INSERT INTO notifications (worker_id, task_id, message) VALUES (?, ?, ?)", [check[0].employee_id, task_id, msg]);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
