/**
 * Parses yt-dlp console output line by line to extract download progress.
 */
export const parseProgress = (line) => {
  // Regex to match standard yt-dlp download progress:
  // e.g. "[download]  12.5% of ~45.23MiB at  4.56MiB/s ETA 00:08"
  // or   "[download]   0.1% of 348.24MiB at  2.45MiB/s ETA 02:22"
  const progressRegex = /\[download\]\s+([\d.]+)%\s+of\s+(?:~)?([\d.\w]+)\s+at\s+([\d.\w/]+)\s+ETA\s+([\d:]+)/i;
  const progressMatch = line.match(progressRegex);
  
  if (progressMatch) {
    return {
      type: 'progress',
      percentage: parseFloat(progressMatch[1]),
      size: progressMatch[2],
      speed: progressMatch[3],
      eta: progressMatch[4],
      status: 'downloading'
    };
  }

  // Regex to match simple 100% completion line:
  // e.g. "[download] 100% of 45.23MiB in 00:08"
  const completeRegex = /\[download\]\s+100%\s+of\s+([\d.\w]+)\s+in\s+([\d:]+)/i;
  const completeMatch = line.match(completeRegex);
  if (completeMatch) {
    return {
      type: 'progress',
      percentage: 100,
      size: completeMatch[1],
      speed: '0B/s',
      eta: '00:00',
      status: 'downloading'
    };
  }

  // Regex to match playlist item count:
  // e.g. "[download] Downloading item 2 of 10"
  const playlistItemRegex = /\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/i;
  const playlistMatch = line.match(playlistItemRegex);
  if (playlistMatch) {
    return {
      type: 'playlist-item',
      currentItem: parseInt(playlistMatch[1], 10),
      totalItems: parseInt(playlistMatch[2], 10)
    };
  }

  // Extract filename from Destination line:
  // e.g. "[download] Destination: C:\Users\ASUS GAMING\Downloads\video.mp4"
  if (line.includes('[download] Destination:')) {
    const filePath = line.substring(line.indexOf('Destination:') + 12).trim();
    const filename = filePath.split(/[/\\]/).pop().replace(/^"|"$/g, '');
    return {
      type: 'destination',
      rawPath: filePath,    // full path, used by service to extract subfolder
      filename
    };
  }
  
  // Extract filename from Alreadydownloaded line:
  // e.g. "[download] C:\Users\ASUS GAMING\Downloads\video.mp4 has already been downloaded"
  if (line.includes('has already been downloaded') && line.includes('[download]')) {
    const cleanLine = line.replace('[download]', '').replace('has already been downloaded', '').trim();
    const filename = cleanLine.split(/[/\\]/).pop().replace(/^"|"$/g, '');
    return {
      type: 'destination',
      rawPath: cleanLine,
      filename
    };
  }

  // Detect FFmpeg merging / post-processing:
  // e.g. "[Merger] Merging formats into..."
  // or   "[ExtractAudio] Destination: ..."
  if (line.includes('[Merger]') || line.includes('[ffmpeg]') || line.includes('[ExtractAudio]')) {
    return {
      type: 'status',
      status: 'Merging video and audio / Converting format...'
    };
  }

  return null;
};
