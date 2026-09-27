import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import downloadRoutes from './routes/downloadRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\ASUS GAMING\\Downloads';

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  try {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    console.log(`Downloads directory created at: ${DOWNLOAD_DIR}`);
  } catch (err) {
    console.error(`Failed to create downloads directory: ${err.message}`);
  }
}

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible throughout the app
app.set('io', io);

// Socket connection listener
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/download', downloadRoutes);

// ── File-serve: stream a single downloaded file to the browser ─────────────
app.get('/api/download/file', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'filename query param is required' });
  }

  // Prevent path traversal — only allow bare filename, no slashes
  const safeFilename = path.basename(filename);
  const filePath = path.join(DOWNLOAD_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }

  // Stream file to browser; delete from /tmp after successful transfer
  res.download(filePath, safeFilename, (err) => {
    if (err) {
      console.error(`[app] Error streaming file: ${err.message}`);
    } else {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.warn(`[app] Could not delete temp file: ${unlinkErr.message}`);
      });
    }
  });
});

// ── ZIP: bundle a playlist/channel subfolder and stream it ──────────────────
app.get('/api/download/zip', (req, res) => {
  const { folder } = req.query;
  if (!folder) {
    return res.status(400).json({ error: 'folder query param is required' });
  }

  // Prevent path traversal
  const safeFolder = path.basename(folder);
  const folderPath = path.join(DOWNLOAD_DIR, safeFolder);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found on server' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFolder}.zip"`);

  const archive = archiver('zip', { zlib: { level: 5 } });

  archive.on('error', (err) => {
    console.error(`[app] Archiver error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP archive' });
    }
  });

  archive.on('end', () => {
    // Clean up the folder after successfully piping all data
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
      if (err) console.warn(`[app] Could not delete temp folder: ${err.message}`);
    });
  });

  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', downloadsDir: DOWNLOAD_DIR });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app, io };
