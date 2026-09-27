# Deployment Guide for DownloadAnywhere

To deploy this website completely for free, you will need to split the deployment into two parts: the **Frontend** (your React/Vite app) and the **Backend** (your Node.js server that runs Socket.io and the downloading logic).

Here is the best "100% free" stack for this exact type of project:

## ⚠️ Critical Step Before Deploying

Currently, your frontend is hardcoded to look for the backend on your local computer. If you deploy it like this, it won't work on the internet. Before pushing to GitHub, you need to change this to point to your new live backend URL using environment variables.

In `frontend/src/components/LandingPage.jsx`, locate the socket connection:
```javascript
const socketClient = io('http://localhost:5000', {
  withCredentials: true
});
```

Change it to:
```javascript
// Vite uses import.meta.env for environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const socketClient = io(BACKEND_URL, {
  withCredentials: true
});
```

## 1. The Backend (Node.js + WebSockets)
Since your app uses WebSockets (`socket.io`), you need a backend provider that supports long-running processes. **Render** is the best fully free option.

**How to deploy to Render:**
1. Create a free account on [GitHub](https://github.com/) and upload your entire project there.
2. Go to [Render](https://render.com/) and sign in with GitHub.
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Set the following configuration:
   - **Root Directory:** (If your backend is in a specific folder, put it here, otherwise leave blank)
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js` (or whatever your main backend file is)
6. Select the **Free instance type** at the bottom and click **Create Web Service**. 

*(Note: Render's free tier goes to sleep after 15 minutes of inactivity and takes about 50 seconds to wake up on the next request).*

Copy the live URL Render gives you (e.g., `https://my-downloader-backend.onrender.com`). You will need this for the frontend.

## 2. The Frontend (React + Vite)
For the frontend, the best free options are **Vercel** or **Netlify**. They are incredibly fast, completely free for hobby projects, and automatically deploy when you push to GitHub.

**How to deploy to Vercel:**
1. Go to [Vercel](https://vercel.com/) and sign up with your GitHub account.
2. Click **Add New Project**, select your GitHub repository, and click **Import**.
3. In the **Framework Preset**, Vercel should automatically detect **Vite**.
4. In the **Root Directory** setting, click Edit and select your `frontend` folder.
5. Open the **Environment Variables** section and add:
   - **Name:** `VITE_BACKEND_URL`
   - **Value:** Your Render backend URL (e.g., `https://my-downloader-backend.onrender.com`)
6. Click **Deploy**. Your frontend will be live in less than a minute!
