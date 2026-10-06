import path from 'path';
import fs from 'fs';
import { 
  startVideoDownload, 
  startAudioDownload, 
  startPlaylistDownload, 
  startChannelDownload,
  fetchPlaylistInfo
} from '../services/ytDlpService.js';

export const getPlaylistInfo = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const info = await fetchPlaylistInfo(url);
    res.json({ 
      success: true, 
      ...info 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to extract playlist information.' 
    });
  }
};

export const downloadVideo = async (req, res, next) => {
  try {
    const { url, quality, socketId, downloadDir } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startVideoDownload(url, quality, socketId, io, downloadDir).catch((err) => {
      console.error(`Background video download failed: ${err.message}`);
    });

    res.status(202).json({ 
      success: true, 
      message: 'Video download started.',
      socketId 
    });
  } catch (err) {
    next(err);
  }
};

export const downloadAudio = async (req, res, next) => {
  try {
    const { url, format, socketId, downloadDir } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startAudioDownload(url, format, socketId, io, downloadDir).catch((err) => {
      console.error(`Background audio download failed: ${err.message}`);
    });

    res.status(202).json({ 
      success: true, 
      message: 'Audio download started.',
      socketId 
    });
  } catch (err) {
    next(err);
  }
};

export const downloadPlaylist = async (req, res, next) => {
  try {
    const { url, quality, format, downloadMode, socketId, selectedItems, downloadDir } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startPlaylistDownload(url, quality, format, downloadMode, socketId, io, selectedItems, downloadDir).catch((err) => {
      console.error(`Background playlist download failed: ${err.message}`);
    });

    res.status(202).json({ 
      success: true, 
      message: 'Playlist download started.',
      socketId 
    });
  } catch (err) {
    next(err);
  }
};

export const downloadChannel = async (req, res, next) => {
  try {
    const { url, quality, format, downloadMode, socketId, selectedItems, downloadDir } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startChannelDownload(url, quality, format, downloadMode, socketId, io, selectedItems, downloadDir).catch((err) => {
      console.error(`Background channel download failed: ${err.message}`);
    });

    res.status(202).json({ 
      success: true, 
      message: 'Channel download started.',
      socketId 
    });
  } catch (err) {
    next(err);
  }
};

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\ASUS GAMING\\Downloads';

export const serveFile = (req, res, next) => {
  try {
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ success: false, message: 'filename query parameter is required.' });
    }

    // Resolve the absolute path and ensure it stays inside DOWNLOAD_DIR
    const resolvedDir = path.resolve(DOWNLOAD_DIR);
    const filePath = path.resolve(resolvedDir, filename);

    if (!filePath.startsWith(resolvedDir + path.sep) && filePath !== resolvedDir) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Let the browser trigger a Save-As dialog with the original filename
    res.download(filePath, path.basename(filePath), (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
};
