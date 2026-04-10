import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    
    // Save locally
    const uploadPath = path.join(process.cwd(), 'public', 'uploads');
    
    // Create directory mechanism (handled asynchronously avoiding Next issues)
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    await writeFile(path.join(uploadPath, filename), buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
  }
}
