# 🚀 Deployment Guide — DownloadAnywhere

> **Stack:** React + Vite (Frontend) · Node.js + Express + Socket.IO (Backend) · yt-dlp · FFmpeg

---

## ⚠️ The Core Problem You Must Understand First

When you run the app **locally**, the flow is simple:

```
Browser → Backend → yt-dlp downloads to C:\Users\ASUS GAMING\Downloads
                                  ↓
                   User opens their Downloads folder ✅
```

When you deploy to **Render**, the flow is completely different:

```
Browser → Backend on Render → yt-dlp downloads to /tmp/downloads on Render's server
                                         ↓
                   File is stuck on Render's machine — NOT your PC ❌
```

**Solution:** After `yt-dlp` finishes, the backend must **stream the file directly to the browser** so the user's browser receives it as a download. The file in `/tmp` on Render is just a temporary buffer.

---

## 🔧 Step 1: Fix the File-Serving Problem (Most Important)

### 1a. Add a file-serve endpoint to the backend

In [`backend/src/app.js`](file:///e:/video%20downloader/Video-downloader-website/backend/src/app.js), add this route **after** your existing API routes:

```js
// Serve downloaded files back to the browser
app.get('/api/download/file', (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  // Prevent path traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(DOWNLOAD_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }

  // Stream file to browser and delete from /tmp after sending
  res.download(filePath, safeFilename, (err) => {
    if (!err) {
      fs.unlink(filePath, () => {});
    }
  });
});
```

### 1b. Update the frontend: socket URL → env variable

In [`LandingPage.jsx`](file:///e:/video%20downloader/Video-downloader-website/frontend/src/components/LandingPage.jsx), around line 43:

```js
// ❌ BEFORE
const socketClient = io('http://localhost:5000', { withCredentials: true });

// ✅ AFTER
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socketClient = io(BACKEND_URL, { withCredentials: true });
```

Also replace every `http://localhost:5000` API call elsewhere in the file with `BACKEND_URL`.

### 1c. Update download-complete to trigger a browser download

In the same file, find the `download-complete` socket handler and add the file fetch:

```js
socketClient.on('download-complete', (data) => {
  setSuccess(data.message || 'Download completed successfully!');
  setIsDownloading(false);
  setProgressData(null);
  setDownloadStatus(null);
  setUrl('');
  setPlaylistInfo(null);

  // ✅ NEW: stream file from server → browser's download
  if (data.filename) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const a = document.createElement('a');
    a.href = `${BACKEND_URL}/api/download/file?filename=${encodeURIComponent(data.filename)}`;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
});
```

---

## 🛠 Step 2: Handle yt-dlp + FFmpeg on Render

Render's Linux servers don't have `yt-dlp` or `ffmpeg` pre-installed. Choose one option:

### Option A — Dockerfile (Recommended, most reliable)

Create `Dockerfile` at the **project root**:

```dockerfile
FROM node:20-slim

# Install ffmpeg + tools
RUN apt-get update && apt-get install -y \
    ffmpeg curl python3 \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/src ./src

RUN mkdir -p /tmp/downloads

EXPOSE 5000
CMD ["node", "src/app.js"]
```

Create `.dockerignore` at root:

```
node_modules
**/node_modules
.git
frontend
*.md
.env
```

On Render, set **Environment → Docker** instead of Node.

---

### Option B — Build script (Simpler, no Docker needed)

Create `backend/build.sh`:

```bash
#!/bin/bash
set -e
npm install
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o ./yt-dlp
chmod a+rx ./yt-dlp
mkdir -p /tmp/downloads
```

Update [`ytDlpService.js`](file:///e:/video%20downloader/Video-downloader-website/backend/src/services/ytDlpService.js) — replace `'yt-dlp'` with a path variable:

```js
const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';
// ...
const child = spawn(YT_DLP_PATH, finalArgs, { env: process.env });
```

Set Render env var: `YT_DLP_PATH=./yt-dlp`

---

## ☁️ Step 3: Deploy the Backend to Render

### 3a. Push to GitHub

```bash
git add .
git commit -m "feat: add file-serve endpoint + env-based URLs"
git push
```

### 3b. Render Dashboard Setup

1. [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub repo
3. Fill in:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Environment | `Node` (or `Docker` if using Option A) |
| Build Command | `npm install` (or `bash build.sh` for Option B) |
| Start Command | `node src/app.js` |
| Instance Type | Free |

4. Add **Environment Variables**:

| Key | Value |
|---|---|
| `PORT` | `5000` |
| `DOWNLOAD_DIR` | `/tmp/downloads` |
| `CORS_ORIGIN` | *(your Vercel URL — set after step 4)* |
| `NODE_ENV` | `production` |
| `YT_DLP_PATH` | `./yt-dlp` *(only Option B)* |

5. Click **Create Web Service** → copy your URL:  
   `https://downloader-backend-xxxx.onrender.com`

> ⏰ **Render Free Tier:** Sleeps after 15 min of inactivity (~50s to wake). A paid tier ($7/mo) or a keep-alive ping service avoids this.

---

## 🌐 Step 4: Deploy the Frontend to Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Configure:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. Add **Environment Variables**:

| Key | Value |
|---|---|
| `VITE_BACKEND_URL` | `https://downloader-backend-xxxx.onrender.com` |

4. Click **Deploy** → copy your Vercel URL
5. **Go back to Render** → update `CORS_ORIGIN` to your Vercel URL → Redeploy

---

## 📦 Bonus: ZIP for Playlist Downloads

Playlists download multiple files. Bundle them into one ZIP for the user.

```bash
cd backend && npm install archiver
```

```js
import archiver from 'archiver';

app.get('/api/download/zip', (req, res) => {
  const { folder } = req.query;
  if (!folder) return res.status(400).json({ error: 'folder required' });

  const folderPath = path.join(DOWNLOAD_DIR, path.basename(folder));
  if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Not found' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(folder)}.zip"`);

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();

  archive.on('end', () => {
    fs.rm(folderPath, { recursive: true, force: true }, () => {});
  });
});
```

Then in the frontend `download-complete` handler for playlists, call `/api/download/zip?folder=<playlist_title>`.

---

## 🔑 Environment Variables Reference

### Local development

**`backend/.env`** *(never commit)*
```env
PORT=5000
DOWNLOAD_DIR=C:\Users\ASUS GAMING\Downloads
CORS_ORIGIN=http://localhost:5173
```

**`frontend/.env.local`** *(never commit)*
```env
VITE_BACKEND_URL=http://localhost:5000
```

### Production (set in dashboards)

**Render (Backend)**
```env
PORT=5000
DOWNLOAD_DIR=/tmp/downloads
CORS_ORIGIN=https://your-project.vercel.app
NODE_ENV=production
YT_DLP_PATH=./yt-dlp   # only if using Option B
```

**Vercel (Frontend)**
```env
VITE_BACKEND_URL=https://downloader-backend-xxxx.onrender.com
```

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  User's Browser                     │
│  Vercel → React + Vite                              │
│                                                     │
│  1. POST /api/download/video  ──────────────────►  │
│  2.  ◄── 202 Accepted                              │
│  3.  ◄── Socket.IO progress events                 │
│  4.  ◄── download-complete {filename}              │
│  5. GET /api/download/file?filename=X  ──────────► │
│  6.  ◄── File stream → saved to Downloads ✅       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS + WebSocket (wss://)
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Render Server                      │
│  Node.js + Express + Socket.IO                      │
│                                                     │
│  yt-dlp  ──►  /tmp/downloads/video.mp4             │
│  ffmpeg  ──►  merges video + audio                  │
│  Socket.IO ──► streams progress to browser         │
│  GET /file ──► streams file to browser, deletes    │
│                                                     │
│  Installed via Docker:                              │
│  ✅ Node 20   ✅ yt-dlp   ✅ ffmpeg                 │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Deployment Checklist

- [ ] `/api/download/file` streaming endpoint added to `app.js`
- [ ] Frontend `download-complete` handler triggers `<a>.click()` download
- [ ] Socket.IO URL uses `import.meta.env.VITE_BACKEND_URL`
- [ ] All `http://localhost:5000` API calls replaced with `BACKEND_URL`
- [ ] `Dockerfile` created at root *(Option A)*  
   OR `backend/build.sh` created + `YT_DLP_PATH` in `ytDlpService.js` *(Option B)*
- [ ] Code pushed to GitHub (`.env` excluded by `.gitignore` ✅)
- [ ] Backend deployed on Render with all env vars
- [ ] Frontend deployed on Vercel with `VITE_BACKEND_URL`
- [ ] Render `CORS_ORIGIN` updated to Vercel URL → redeployed
- [ ] End-to-end test: download a YouTube video in production ✅
