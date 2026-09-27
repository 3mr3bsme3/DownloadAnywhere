import { spawn } from 'child_process';
import path from 'path';
import { parseProgress } from '../utils/progressParser.js';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\ASUS GAMING\\Downloads';
const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';

/**
 * Normalizes YouTube channel URLs to target the '/videos' tab,
 * ensuring yt-dlp lists actual videos instead of tab names.
 */
export const normalizeChannelUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Check if it's a channel format: @username, channel/ID, c/Name, user/Name
      const isChannel = 
        pathParts[0]?.startsWith('@') ||
        pathParts[0] === 'channel' ||
        pathParts[0] === 'c' ||
        pathParts[0] === 'user';
        
      if (isChannel) {
        const lastPart = pathParts[pathParts.length - 1];
        const tabs = ['videos', 'shorts', 'streams', 'featured', 'playlists', 'live'];
        if (!tabs.includes(lastPart.toLowerCase())) {
          url.pathname = '/' + [...pathParts, 'videos'].join('/');
          return url.toString();
        }
      }
    }
  } catch (e) {
    // Return original url on error
  }
  return urlStr;
};

/**
 * Core helper to run yt-dlp using child_process.spawn.
 * Feeds stdout and stderr streams into progress parser and sends events via Socket.IO.
 */
const runYtDlp = (args, socketId, io, jobType) => {
  return new Promise((resolve, reject) => {
    const finalArgs = ['--js-runtimes', 'node', ...args];
    console.log(`[Service] Spawning: ${YT_DLP_PATH} ${finalArgs.join(' ')}`);
    
    const child = spawn(YT_DLP_PATH, finalArgs, { env: process.env });
    let currentFilename = '';
    let folderName = '';    // tracks subfolder for playlist/channel jobs
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
            // For playlist/channel jobs, extract the subfolder from the raw path
            if (jobType === 'playlist' || jobType === 'channel') {
              const rawPath = parsed.rawPath || '';
              const relPath = rawPath.replace(DOWNLOAD_DIR, '').replace(/^[\/\\]+/, '');
              const parts = relPath.split(/[\/\\]/);
              if (parts.length >= 2) folderName = parts[0];
            }
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
          filename: currentFilename,
          folderName: folderName || null   // non-null for playlist/channel jobs
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
  const targetUrl = normalizeChannelUrl(url);
  return new Promise((resolve, reject) => {
    console.log(`[Service] Fetching playlist metadata for: ${targetUrl}`);
    
    const child = spawn(YT_DLP_PATH, [
      '--js-runtimes', 'node',
      '--dump-single-json',
      '--flat-playlist',
      targetUrl
    ], { env: process.env });

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
 * Download an entire or filtered playlist (Video or Audio).
 */
export const startPlaylistDownload = async (url, quality = '1080', format = 'mp3', downloadMode = 'video', socketId, io, selectedItems = '') => {
  const outputPattern = path.join(DOWNLOAD_DIR, '%(playlist)s', '%(playlist_index)s - %(title)s.%(ext)s');
  let args = [];

  if (downloadMode === 'audio') {
    const audioFormat = format.toLowerCase();
    const formatsSupportingThumbnail = ['mp3', 'm4a', 'flac', 'opus', 'alac'];
    const shouldEmbed = formatsSupportingThumbnail.includes(audioFormat);

    args = [
      '-x',
      '--audio-format', audioFormat,
      '-o', outputPattern,
      '--yes-playlist'
    ];

    if (shouldEmbed) {
      args.push('--embed-thumbnail');
    }
  } else {
    const heightLimit = parseInt(quality, 10) || 1080;
    const formatStr = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`;
    args = [
      '-f', formatStr,
      '-o', outputPattern,
      '--yes-playlist'
    ];
  }

  if (selectedItems) {
    args.push('--playlist-items', selectedItems);
  }

  args.push(url);

  return runYtDlp(args, socketId, io, 'playlist');
};

/**
 * Download all or filtered videos from a channel (Video or Audio).
 */
export const startChannelDownload = async (url, quality = '1080', format = 'mp3', downloadMode = 'video', socketId, io, selectedItems = '') => {
  const targetUrl = normalizeChannelUrl(url);
  const outputPattern = path.join(DOWNLOAD_DIR, '%(channel)s', '%(title)s.%(ext)s');
  let args = [];

  if (downloadMode === 'audio') {
    const audioFormat = format.toLowerCase();
    const formatsSupportingThumbnail = ['mp3', 'm4a', 'flac', 'opus', 'alac'];
    const shouldEmbed = formatsSupportingThumbnail.includes(audioFormat);

    args = [
      '-x',
      '--audio-format', audioFormat,
      '-o', outputPattern
    ];

    if (shouldEmbed) {
      args.push('--embed-thumbnail');
    }
  } else {
    const heightLimit = parseInt(quality, 10) || 1080;
    const formatStr = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]`;
    args = [
      '-f', formatStr,
      '-o', outputPattern
    ];
  }

  if (selectedItems) {
    args.push('--playlist-items', selectedItems);
  }

  args.push(targetUrl);

  return runYtDlp(args, socketId, io, 'channel');
};
