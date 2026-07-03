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
    const { url, quality, socketId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

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
    const { url, quality, format, downloadMode, socketId, selectedItems } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startPlaylistDownload(url, quality, format, downloadMode, socketId, io, selectedItems).catch((err) => {
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
    const { url, quality, format, downloadMode, socketId, selectedItems } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const io = req.app.get('io');

    startChannelDownload(url, quality, format, downloadMode, socketId, io, selectedItems).catch((err) => {
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
