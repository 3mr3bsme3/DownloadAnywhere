import { 
  startVideoDownload, 
  startAudioDownload, 
  startPlaylistDownload, 
  startChannelDownload 
} from '../services/ytDlpService.js';

export const downloadVideo = async (req, res, next) => {
  try {
    const { url, quality, socketId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    // Run download in background so HTTP response is instant and non-blocking
    startVideoDownload(url, quality, socketId, io).catch((err) => {
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
    const { url, format, socketId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startAudioDownload(url, format, socketId, io).catch((err) => {
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
    const { url, quality, socketId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startPlaylistDownload(url, quality, socketId, io).catch((err) => {
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
    const { url, quality, socketId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startChannelDownload(url, quality, socketId, io).catch((err) => {
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
