import express from 'express';
import { 
  downloadVideo, 
  downloadAudio, 
  downloadPlaylist, 
  downloadChannel,
  getPlaylistInfo,
  serveFile
} from '../controllers/downloadController.js';

const router = express.Router();

router.post('/playlist-info', getPlaylistInfo);
router.post('/video', downloadVideo);
router.post('/audio', downloadAudio);
router.post('/playlist', downloadPlaylist);
router.post('/channel', downloadChannel);
router.get('/file', serveFile);

export default router;
