import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
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

// Health check
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
