# Universal Downloader - Project Plan & Specifications

This repository contains a full-stack media extraction application featuring a modern React frontend and a Node.js + Express backend powered by `yt-dlp` and `FFmpeg`.

---

## 📂 Project Structure

```
Video-downloader-website/
├── frontend/             # React (Vite) client
│   ├── src/
│   │   ├── components/   # UI components (LandingPage.jsx)
│   │   ├── App.jsx       # App entrypoint
│   │   └── index.css     # Tailwind CSS styling and theme
├── backend/              # Node.js + Express server
│   ├── src/
│   │   ├── controllers/  # Route controllers (downloadController.js)
│   │   ├── routes/       # API routes (downloadRoutes.js)
│   │   ├── services/     # Core yt-dlp child process spawn logic
│   │   ├── utils/        # Output parsers and helpers
│   │   └── app.js        # Server entrypoint and Socket.IO initialization
│   └── .env              # Environment configuration
```

---

## 🚀 Features & Implementation Roadmap

### 📦 Phase 1: Express Backend Boilerplate
- Scaffold the backend directory.
- Enable CORS, parsing middleware, and environment variables.
- Auto-create destination directories if necessary.
- **Dependencies**: `express`, `cors`, `dotenv`, `socket.io`.

### ⚡ Phase 2: Downloader API (yt-dlp + FFmpeg Integration)
Using `child_process.spawn()`, execute `yt-dlp` commands natively on Windows.

#### 1. Download Video
- **Endpoint**: `POST /api/download/video`
- **Quality Options**: `2160` (4K), `1440` (2K), `1080` (Full HD), `720`, `480`, `360`, `240`, `144`.
- **Command Structure**:
  ```bash
  yt-dlp -f "bestvideo[height<=QUALITY]+bestaudio/best[height<=QUALITY]" -o "C:\Users\ASUS GAMING\Downloads\%(extractor)s\%(uploader)s\%(title)s.%(ext)s" "URL"
  ```

#### 2. Download Playlist
- **Endpoint**: `POST /api/download/playlist`
- **Location**: Creates a folder named after the playlist.
- **Command Structure**:
  ```bash
  yt-dlp -f "bestvideo[height<=QUALITY]+bestaudio/best[height<=QUALITY]" -o "C:\Users\ASUS GAMING\Downloads\%(playlist)s\%(playlist_index)s - %(title)s.%(ext)s" "URL"
  ```

#### 3. Download Channel
- **Endpoint**: `POST /api/download/channel`
- **Location**: Creates a folder named after the channel uploader.
- **Command Structure**:
  ```bash
  yt-dlp -f "bestvideo[height<=QUALITY]+bestaudio/best[height<=QUALITY]" -o "C:\Users\ASUS GAMING\Downloads\%(channel)s\%(title)s.%(ext)s" "URL"
  ```

#### 4. Download Audio
- **Endpoint**: `POST /api/download/audio`
- **Formats**: `m4a`, `mp3`, `flac`, `wav`, `aac`, `opus`, `vorbis`, `alac`.
- **Thumbnail Handling**: Passes `--embed-thumbnail` for supported formats; skips if format (e.g. WAV) doesn't support embedded artwork.
- **Command Structure**:
  ```bash
  yt-dlp -x --audio-format FORMAT --embed-thumbnail -o "C:\Users\ASUS GAMING\Downloads\%(title)s.%(ext)s" "URL"
  ```

---

### 🎨 Phase 3: Connect Frontend UI
- Integrate selectors inside [LandingPage.jsx](file:///e:/video%20downloader/Video-downloader-website/frontend/src/components/LandingPage.jsx):
  - **Type Selector**: Video, Audio, Playlist, Channel.
  - **Quality Selector**: Displayed dynamically for Video, Playlist, or Channel selection.
  - **Format Selector**: Displayed dynamically for Audio selection.
- Implement UI validations, success/error prompts, and loaders.

---

### 📡 Phase 4: Socket.IO Live Progress Streams
- Read `stdout` & `stderr` from the running `yt-dlp` child process.
- **Parser Logic**: Extract progress percentage, current speed, ETA, and active filename from `yt-dlp` console output.
- **WebSocket Broadcast**: Emit real-time events (`download-progress`, `download-status`, `download-complete`, `download-error`) to the frontend.
- **Dynamic Frontend Updates**:
  - Render progress bars.
  - Show "Merging video and audio..." when FFmpeg begins post-processing.
  - Support concurrent downloads without crashing the node process.
