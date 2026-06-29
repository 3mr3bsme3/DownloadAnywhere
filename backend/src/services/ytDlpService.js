import { spawn } from 'child_process';
import path from 'path';
import { parseProgress } from '../utils/progressParser.js';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\ASUS GAMING\\Downloads';

/**
 * Core helper to run yt-dlp using child_process.spawn.
 * Feeds stdout and stderr streams into progress parser and sends events via Socket.IO.
 */
const runYtDlp = (args, socketId, io, jobType) => {
  return new Promise((resolve, reject) => {
    console.log(`[Service] Spawning: yt-dlp ${args.join(' ')}`);
    
    const child = spawn('yt-dlp', args);
    let currentFilename = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || ''; // Keep trailing partial line

      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Parse the stdout line
        const parsed = parseProgress(line);
        if (parsed) {
          if (parsed.type === 'destination') {
            currentFilename = parsed.filename;
            io.to(socketId).emit('download-status', {
              jobType,
              status: 'downloading',
              filename: currentFilename,
              message: `Downloading: ${currentFilename}`
            });
          } else if (parsed.type === 'progress') {
            io.to(socketId).emit('download-progress', {
              jobType,
              filename: currentFilename,
              percentage: parsed.percentage,
              size: parsed.size,
              speed: parsed.speed,
              eta: parsed.eta,
              status: parsed.status
            });
          } else if (parsed.type === 'playlist-item') {
            io.to(socketId).emit('download-status', {
              jobType,
              status: 'playlist-progress',
              currentItem: parsed.currentItem,
              totalItems: parsed.totalItems,
              message: `Processing item ${parsed.currentItem} of ${parsed.totalItems}`
            });
          } else if (parsed.type === 'status') {
            io.to(socketId).emit('download-status', {
              jobType,
              status: 'merging',
              filename: currentFilename,
              message: parsed.status
            });
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        console.warn(`[yt-dlp stderr] ${line}`);
        
        // Broadcast warnings/non-fatal errors
        io.to(socketId).emit('download-warning', {
          jobType,
          message: line
        });
      }
    });

    child.on('close', (code) => {
      console.log(`[Service] yt-dlp exited with code ${code}`);
      if (code === 0) {
        io.to(socketId).emit('download-complete', {
          jobType,
          success: true,
          message: 'Download completed successfully!',
          filename: currentFilename
        });
        resolve();
      } else {
        const errorMsg = `yt-dlp process exited with error code ${code}`;
        io.to(socketId).emit('download-error', {
          jobType,
          success: false,
          message: errorMsg
        });
        reject(new Error(errorMsg));
      }
    });

    child.on('error', (err) => {
      console.error('[Service] Process error:', err);
      io.to(socketId).emit('download-error', {
        jobType,
        success: false,
        message: `Failed to launch download utility: ${err.message}`
      });
      reject(err);
    });
  });
};

/**
 * Download a single video.
 */
export const startVideoDownload = async (url, quality = '1080', socketId, io) => {
  const heightLimit = parseInt(quality, 10) || 1080;
  
  // Format query: best video matching size + best audio, or best unified download matching quality
  const formatStr = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`;
  const outputPattern = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');

  const args = [
    '-f', formatStr,
    '-o', outputPattern,
    url
  ];

  return runYtDlp(args, socketId, io, 'video');
};

/**
 * Download audio only.
 */
export const startAudioDownload = async (url, format = 'mp3', socketId, io) => {
  const audioFormat = format.toLowerCase();
  const outputPattern = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');

  // Embed artwork for formats that support it (mp3, m4a, flac, opus, alac)
  const formatsSupportingThumbnail = ['mp3', 'm4a', 'flac', 'opus', 'alac'];
  const shouldEmbed = formatsSupportingThumbnail.includes(audioFormat);

  const args = [
    '-x',
    '--audio-format', audioFormat,
    '-o', outputPattern
  ];

  if (shouldEmbed) {
    args.push('--embed-thumbnail');
  }

  args.push(url);

  return runYtDlp(args, socketId, io, 'audio');
};

/**
 * Fetch flat playlist/channel metadata (video title, index, id, url).
 */
export const fetchPlaylistInfo = (url) => {
  return new Promise((resolve, reject) => {
    console.log(`[Service] Fetching playlist metadata for: ${url}`);
    
    const child = spawn('yt-dlp', [
      '--dump-single-json',
      '--flat-playlist',
      url
    ]);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutData);
          const title = parsed.title || 'Playlist / Channel';
          
          const entries = (parsed.entries || []).map((entry, index) => {
            let thumbnail = '';
            if (entry.thumbnail) {
              thumbnail = entry.thumbnail;
            } else if (entry.thumbnails && entry.thumbnails.length > 0) {
              thumbnail = entry.thumbnails[0].url;
            }
            
            return {
              id: entry.id,
              title: entry.title || `Video ${index + 1}`,
              url: entry.url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : ''),
              index: entry.playlist_index || (index + 1),
              thumbnail
            };
          });

          resolve({ title, entries });
        } catch (err) {
          reject(new Error(`Failed to parse playlist metadata JSON: ${err.message}`));
        }
      } else {
        console.error(`[Service] yt-dlp metadata extraction stderr: ${stderrData}`);
        reject(new Error(`yt-dlp failed to fetch playlist info (exit code ${code}).`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Download an entire or filtered playlist.
 */
export const startPlaylistDownload = async (url, quality = '1080', socketId, io, selectedItems = '') => {
  const heightLimit = parseInt(quality, 10) || 1080;
  const formatStr = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`;
  const outputPattern = path.join(DOWNLOAD_DIR, '%(playlist)s', '%(playlist_index)s - %(title)s.%(ext)s');

  const args = [
    '-f', formatStr,
    '-o', outputPattern,
    '--yes-playlist'
  ];

  if (selectedItems) {
    args.push('--playlist-items', selectedItems);
  }

  args.push(url);

  return runYtDlp(args, socketId, io, 'playlist');
};

/**
 * Download all or filtered videos from a channel.
 */
export const startChannelDownload = async (url, quality = '1080', socketId, io, selectedItems = '') => {
  const heightLimit = parseInt(quality, 10) || 1080;
  const formatStr = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`;
  const outputPattern = path.join(DOWNLOAD_DIR, '%(channel)s', '%(title)s.%(ext)s');

  const args = [
    '-f', formatStr,
    '-o', outputPattern
  ];

  if (selectedItems) {
    args.push('--playlist-items', selectedItems);
  }

  args.push(url);

  return runYtDlp(args, socketId, io, 'channel');
};
