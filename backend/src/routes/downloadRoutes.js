import express from 'express';
import { 
  downloadVideo, 
  downloadAudio, 
  downloadPlaylist, 
  downloadChannel 
} from '../controllers/downloadController.js';

const router = express.Router();

router.post('/video', downloadVideo);
router.post('/audio', downloadAudio);
router.post('/playlist', downloadPlaylist);
router.post('/channel', downloadChannel);

export default router;
