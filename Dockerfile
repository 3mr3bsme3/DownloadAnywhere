# ── Base image ─────────────────────────────────────────────────────────────────
FROM node:20-slim

# ── System dependencies: ffmpeg, curl, python3 ─────────────────────────────────
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# ── yt-dlp: download latest release binary ─────────────────────────────────────
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# ── Working directory ──────────────────────────────────────────────────────────
WORKDIR /app

# ── Install Node dependencies (production only) ────────────────────────────────
COPY backend/package*.json ./
RUN npm install --omit=dev

# ── Copy backend source ────────────────────────────────────────────────────────
COPY backend/src ./src

# ── Ensure downloads temp directory exists ─────────────────────────────────────
RUN mkdir -p /tmp/downloads

# ── Expose port ────────────────────────────────────────────────────────────────
EXPOSE 5000

# ── Start the server ───────────────────────────────────────────────────────────
CMD ["node", "src/app.js"]
