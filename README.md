# AlgoTube - High-Performance Media Downloader

AlgoTube is a futuristic, dark-themed web application designed to **download** online video and audio streams at maximum speed.

---

## ⚡ Key Features

- **Download Single Video / Audio**: Extract videos up to 8K/4K UHD, or convert streams directly to MP3, M4A, FLAC, and WAV with embedded cover art.
- **Download All Playlist Videos**: Fetch complete playlists, view covers, check/uncheck specific items (or select all), and batch-download them.
- **Download All Channel Videos**: Normalizes channel URLs to fetch and download all channel videos and shorts dynamically.
- **Real-Time Progress Tracker**: Live progress checklist showing which video is downloading, its specific percentage, speed, and overall status (✔️ Success / ❌ Error).
- **Throttling Bypasser**: Uses local Node.js engine decryption (`--js-runtimes node`) to bypass YouTube download speed throttling (locks to max network bandwidth instead of ~40 KB/s).
- **Space-Safe Paths**: Advanced Windows child process execution that fully supports folder paths containing blank spaces.

---

## 🛠️ Technologies Used

- **Frontend**: React (Vite), Tailwind CSS v4, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO Server.
- **Core Engine**: `yt-dlp` (Nightly Builds) & `FFmpeg`.
