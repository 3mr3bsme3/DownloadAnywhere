import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export default function LandingPage() {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const flashlightRef = useRef(null);
  const magButtonRef = useRef(null);

  // Download form states
  const [url, setUrl] = useState('');
  const [downloadType, setDownloadType] = useState('video'); // video, audio, playlist, channel
  const [quality, setQuality] = useState('1080');
  const [audioFormat, setAudioFormat] = useState('mp3');
  
  // WebSocket and Progress states
  const [socket, setSocket] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressData, setProgressData] = useState(null); // percentage, speed, eta, filename, status
  const [downloadStatus, setDownloadStatus] = useState(null); // status, filename, currentItem, totalItems, message
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. WebSocket setup & canvas animations
  useEffect(() => {
    // Connect to backend Socket.IO
    const socketClient = io('http://localhost:5000', {
      withCredentials: true
    });

    socketClient.on('connect', () => {
      console.log('Connected to WebSocket server:', socketClient.id);
    });

    socketClient.on('download-status', (data) => {
      console.log('Status update:', data);
      setDownloadStatus(data);
      if (data.status === 'downloading') {
        setError('');
      }
    });

    socketClient.on('download-progress', (data) => {
      setProgressData(data);
    });

    socketClient.on('download-warning', (data) => {
      console.warn('Warning:', data.message);
    });

    socketClient.on('download-complete', (data) => {
      console.log('Complete:', data);
      setSuccess(data.message || 'Download completed successfully!');
      setIsDownloading(false);
      setProgressData(null);
      setDownloadStatus(null);
      setUrl(''); // clear input on success
    });

    socketClient.on('download-error', (data) => {
      console.error('Error:', data.message);
      setError(data.message || 'Download failed.');
      setIsDownloading(false);
      setProgressData(null);
      setDownloadStatus(null);
    });

    setSocket(socketClient);

    // Particle System
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resize = () => {
      if (heroRef.current && canvas) {
        canvas.width = window.innerWidth;
        canvas.height = heroRef.current.offsetHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(56, 189, 248, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

    const animateParticles = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    // Mouse Following Light (Flashlight)
    const handleMouseMove = (e) => {
      if (!flashlightRef.current || !heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      flashlightRef.current.style.left = `${x}px`;
      flashlightRef.current.style.top = `${y}px`;
      flashlightRef.current.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      if (!flashlightRef.current) return;
      flashlightRef.current.style.opacity = '0';
    };

    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener('mousemove', handleMouseMove);
      heroEl.addEventListener('mouseleave', handleMouseLeave);
    }

    // Magnetic Button Effect
    const magButton = magButtonRef.current;
    const handleMagMouseMove = (e) => {
      if (!magButton) return;
      const rect = magButton.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      magButton.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    };

    const handleMagMouseLeave = () => {
      if (!magButton) return;
      magButton.style.transform = `translate(0px, 0px)`;
    };

    if (magButton) {
      magButton.addEventListener('mousemove', handleMagMouseMove);
      magButton.addEventListener('mouseleave', handleMagMouseLeave);
    }

    // Scroll Reveal Observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => revealObserver.observe(el));

    // Cleanup
    return () => {
      socketClient.disconnect();
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      if (heroEl) {
        heroEl.removeEventListener('mousemove', handleMouseMove);
        heroEl.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (magButton) {
        magButton.removeEventListener('mousemove', handleMagMouseMove);
        magButton.removeEventListener('mouseleave', handleMagMouseLeave);
      }
      revealElements.forEach((el) => revealObserver.unobserve(el));
    };
  }, []);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  const startDownload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProgressData(null);
    setDownloadStatus(null);

    if (!url.trim()) {
      setError('Please enter a valid URL.');
      return;
    }

    // Simple URL validation
    try {
      new URL(url);
    } catch (_) {
      setError('Please enter a valid HTTP/HTTPS URL.');
      return;
    }

    setIsDownloading(true);

    const payload = {
      url,
      socketId: socket ? socket.id : null
    };

    if (downloadType === 'audio') {
      payload.format = audioFormat;
    } else {
      payload.quality = quality;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/download/${downloadType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate download.');
      }

      setDownloadStatus({
        status: 'starting',
        message: data.message || 'Connecting and initializing extraction...'
      });
    } catch (err) {
      setError(err.message || 'Unable to connect to the backend server.');
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-neon-blue/30 overflow-x-hidden min-h-screen flex flex-col">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/40 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
        <div className="max-w-max-width mx-auto px-margin-desktop h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <span className="font-headline-lg text-headline-lg font-bold bg-gradient-to-r from-neon-blue to-aurora-cyan bg-clip-text text-transparent">
              AlgoTube Pro
            </span>
            <div className="hidden md:flex gap-6 items-center">
              <a 
                className="font-body-md text-body-md text-neon-blue border-b-2 border-neon-blue pb-1" 
                href="#dashboard"
                onClick={(e) => handleSmoothScroll(e, '#hero-section')}
              >
                Dashboard
              </a>
              <a 
                className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" 
                href="#features"
                onClick={(e) => handleSmoothScroll(e, '#features-section')}
              >
                Capabilities
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-neon-blue to-aurora-cyan text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-full hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer">
              Upgrade to Pro
            </button>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant hover:text-neon-blue cursor-pointer transition-colors" data-icon="notifications">
                notifications
              </span>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-neon-blue cursor-pointer transition-colors" data-icon="account_circle">
                account_circle
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16 flex-grow">
        {/* Hero Section */}
        <section 
          ref={heroRef}
          className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden px-margin-mobile md:px-margin-desktop py-12" 
          id="hero-section"
        >
          <canvas ref={canvasRef} id="hero-canvas" width="1280" height="921" />
          <div 
            ref={flashlightRef}
            className="mouse-light" 
            id="mouse-flashlight" 
            style={{ left: '1273px', top: '766px', opacity: 0 }}
          />
          <div className="absolute inset-0 z-0">
            <img 
              alt="Cinematic background" 
              className="w-full h-full object-cover opacity-50" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPJ5WvFd-CYUGdWytJl_h4xaZ9RrGBRuF04LjRY_m71kIuG_fmbLXO0jJCfHG3g_m4OiiaWP1eNcttihHq9--AkoMLFrqfEAMvJUcgIRz3AexwqKfDNRPbnKTNp3Yj92TEtAXQx0K7frJfp46_fU_t-m0BqrgK7z-jSVWQPmDEMbjOLk3gDsKnAMPWoXLXSq_8vw06QIrF2RFiFPl05xJGCNxgUPmqQInyJzLuMS4giM3JPom0T2MkOUIS6bzOgDaSBybzJtauu3A"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
          </div>

          <div className="relative z-10 text-center flex flex-col items-center max-w-4xl mx-auto w-full">
            <div className="mb-4 relative animate-float-3d">
              <img 
                alt="AlgoTube Pro 3D Logo" 
                className="w-48 md:w-56 h-auto drop-shadow-[0_0_50px_rgba(56,189,248,0.5)]" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMOaBLakzUSEtRPSCqINFiwgXL9qsaBU-TE7TTttfOxRMxW3zb444YYVq-kxV8mq4P8h_VXFttb3JCYO0zejFKS3gJdPa7xme5dOGPJZ-EG9R7cH2KEgQEh80RX3Opb4DF4c8t-0n1FWEr2ZGqOz7CVSyAAjiEYF6kiwkpGAlUMNxMuWok9kAcRRc_WNG7U_hnN3UE16LQIGpiaQBX2CIjcHEtuRZlfAtZdYNae0o_G-P23bJ5MJJ2j6Rn-ubSsLIEBgGaLZWVivceWg"
              />
            </div>
            
            <h1 className="font-headline-xl text-headline-xl mb-4 text-white text-shadow-glow">
              Neural-Speed Media <span className="bg-gradient-to-r from-neon-blue to-electric-purple bg-clip-text text-transparent">Extraction</span>
            </h1>
            
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl">
              High-performance media pipeline designed for power users. Extract, synchronize, and archive video content across the cloud at light speed.
            </p>
            
            {/* Download Interface Card */}
            <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 md:p-8 text-left mb-8 border border-white/10 relative">
              <h3 className="text-white font-headline-lg text-[18px] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-neon-blue">bolt</span>
                Extraction Control Panel
              </h3>

              {/* Download Type Selector Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6 bg-surface-container-lowest/60 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'video', label: 'Video', icon: 'video_library' },
                  { id: 'audio', label: 'Audio', icon: 'audiotrack' },
                  { id: 'playlist', label: 'Playlist', icon: 'playlist_play' },
                  { id: 'channel', label: 'Channel', icon: 'subscriptions' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (!isDownloading) setDownloadType(type.id);
                    }}
                    disabled={isDownloading}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg text-label-md font-label-md cursor-pointer transition-all ${
                      downloadType === type.id
                        ? 'bg-neon-blue text-on-primary shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{type.icon}</span>
                    <span className="text-[12px] sm:text-[14px]">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Form Input & Action Button */}
              <form onSubmit={startDownload} className="flex flex-col gap-4">
                <div className="relative flex items-center bg-surface-container-low/60 rounded-xl border border-white/10 p-2 pl-4 focus-within:border-neon-blue/60 transition-all">
                  <span className="material-symbols-outlined text-neon-blue mr-2">link</span>
                  <input
                    type="text"
                    disabled={isDownloading}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={
                      downloadType === 'video'
                        ? 'Paste video URL here...'
                        : downloadType === 'audio'
                        ? 'Paste audio/video URL here...'
                        : downloadType === 'playlist'
                        ? 'Paste playlist URL here...'
                        : 'Paste channel URL here...'
                    }
                    className="bg-transparent border-none focus:ring-0 text-white w-full font-body-md placeholder:text-outline-variant outline-none py-2 text-[15px]"
                  />
                </div>

                {/* Conditional Parameter Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quality Selector (shown for Video, Playlist, Channel) */}
                  {downloadType !== 'audio' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-on-surface-variant text-[13px] font-label-md">MAX QUALITY LIMIT</label>
                      <select
                        disabled={isDownloading}
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        className="bg-surface-container-low/80 text-white rounded-xl border border-white/10 p-3 font-body-md outline-none focus:border-neon-blue/50"
                      >
                        <option value="2160">2160p (4K UHD)</option>
                        <option value="1440">1440p (2K QHD)</option>
                        <option value="1080">1080p (Full HD)</option>
                        <option value="720">720p (HD)</option>
                        <option value="480">480p</option>
                        <option value="360">360p</option>
                        <option value="240">240p</option>
                        <option value="144">144p</option>
                      </select>
                    </div>
                  )}

                  {/* Format Selector (shown only for Audio) */}
                  {downloadType === 'audio' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-on-surface-variant text-[13px] font-label-md">AUDIO FORMAT</label>
                      <select
                        disabled={isDownloading}
                        value={audioFormat}
                        onChange={(e) => setAudioFormat(e.target.value)}
                        className="bg-surface-container-low/80 text-white rounded-xl border border-white/10 p-3 font-body-md outline-none focus:border-neon-blue/50"
                      >
                        <option value="mp3">MP3 (Universal compatibility)</option>
                        <option value="m4a">M4A (AAC - Embeds Artwork)</option>
                        <option value="flac">FLAC (Lossless)</option>
                        <option value="wav">WAV (Raw Lossless - No Artwork)</option>
                        <option value="aac">AAC (Advanced Audio Coding)</option>
                        <option value="opus">OPUS (High quality compression)</option>
                        <option value="vorbis">Ogg Vorbis</option>
                        <option value="alac">ALAC (Apple Lossless)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-end justify-end">
                    <button
                      ref={magButtonRef}
                      type="submit"
                      disabled={isDownloading}
                      className="w-full bg-neon-blue text-on-primary py-3 px-8 rounded-xl font-label-md text-label-md hover:bg-aurora-cyan transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">{isDownloading ? 'Extracting...' : 'Extract Media'}</span>
                      <span className="material-symbols-outlined text-[20px] relative z-10" data-icon="bolt">
                        bolt
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Status and Errors Overlay */}
              {error && (
                <div className="mt-4 p-3.5 bg-error-container/20 border border-error-container rounded-xl text-error-container text-body-sm flex items-center gap-2 animate-pulse">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3.5 bg-aurora-cyan/10 border border-aurora-cyan/30 rounded-xl text-aurora-cyan text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>{success}</span>
                </div>
              )}

              {/* Live Progress Panel */}
              {isDownloading && (downloadStatus || progressData) && (
                <div className="mt-6 p-4 bg-surface-container-lowest/80 border border-white/5 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] text-neon-blue font-label-md uppercase tracking-wider">
                        {downloadStatus?.status === 'starting' 
                          ? 'INITIALIZING' 
                          : downloadStatus?.status === 'merging' 
                          ? 'POST-PROCESSING' 
                          : 'EXTRACTING STREAM'}
                      </span>
                      <span className="text-[14px] text-white font-medium line-clamp-1">
                        {downloadStatus?.filename || progressData?.filename || 'Analyzing URL...'}
                      </span>
                    </div>
                    {progressData && (
                      <span className="text-white font-semibold text-[15px] tabular-nums">
                        {progressData.percentage}%
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-blue via-aurora-cyan to-electric-purple transition-all duration-300 rounded-full"
                      style={{ width: `${progressData?.percentage || 0}%` }}
                    />
                  </div>

                  {/* Progress Stats */}
                  {progressData && (
                    <div className="grid grid-cols-3 gap-2 text-center text-on-surface-variant text-[13px] border-t border-white/5 pt-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline-variant font-label-md">SIZE</span>
                        <span className="text-white tabular-nums">{progressData.size || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline-variant font-label-md">SPEED</span>
                        <span className="text-white tabular-nums">{progressData.speed || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline-variant font-label-md">ETA</span>
                        <span className="text-white tabular-nums">{progressData.eta || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {/* Playlist Progress Indicators */}
                  {downloadStatus?.status === 'playlist-progress' && (
                    <div className="text-center text-white text-[13px] border-t border-white/5 pt-2 mt-1 flex justify-between">
                      <span className="text-on-surface-variant">Playlist Job Progress:</span>
                      <span className="font-semibold text-neon-blue">
                        {downloadStatus.currentItem} / {downloadStatus.totalItems} videos
                      </span>
                    </div>
                  )}

                  {/* General status text */}
                  {downloadStatus?.message && !progressData && (
                    <div className="text-center text-[13px] text-on-surface-variant py-1 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-ping" />
                      <span>{downloadStatus.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4 text-on-surface-variant font-label-md text-label-md">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-aurora-cyan text-[18px]" data-icon="check_circle">
                  check_circle
                </span> 
                No Ads
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-aurora-cyan text-[18px]" data-icon="check_circle">
                  check_circle
                </span> 
                8K Resolution
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-aurora-cyan text-[18px]" data-icon="check_circle">
                  check_circle
                </span> 
                Multi-Threaded
              </span>
            </div>
          </div>
        </section>

        {/* Stats Section (Bento Inspired) */}
        <section className="max-w-max-width mx-auto px-margin-desktop py-gutter">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-center items-center text-center reveal active">
              <span className="text-on-surface-variant font-label-md text-label-md mb-2">NETWORK THROUGHPUT</span>
              <div className="text-headline-lg font-headline-lg text-neon-blue">1.2 Gbps</div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neon-blue to-aurora-cyan w-[85%]" />
              </div>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-center items-center text-center reveal active">
              <span className="text-on-surface-variant font-label-md text-label-md mb-2">TOTAL EXTRACTED</span>
              <div className="text-headline-lg font-headline-lg text-white">4.8 PB</div>
              <span className="text-electric-purple font-body-sm text-body-sm mt-2">+240 TB this week</span>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-center items-center text-center reveal active">
              <span className="text-on-surface-variant font-label-md text-label-md mb-2">NODES ONLINE</span>
              <div className="text-headline-lg font-headline-lg text-aurora-cyan">142,000+</div>
              <div className="flex gap-1 mt-4">
                <div className="w-2 h-2 rounded-full bg-aurora-cyan animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-aurora-cyan animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-aurora-cyan animate-pulse delay-150" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features-section" className="max-w-max-width mx-auto px-margin-desktop py-24">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-white mb-4">Core Capabilities</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-neon-blue to-transparent mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group reveal">
              <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center mb-6 border border-neon-blue/20 group-hover:bg-neon-blue/20 transition-colors">
                <span className="material-symbols-outlined text-neon-blue" data-icon="video_file">
                  video_file
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">8K Video Download</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Precision extraction of ultra-high definition content with zero metadata loss.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group reveal">
              <div className="w-12 h-12 rounded-xl bg-electric-purple/10 flex items-center justify-center mb-6 border border-electric-purple/20 group-hover:bg-electric-purple/20 transition-colors">
                <span className="material-symbols-outlined text-electric-purple" data-icon="audio_file">
                  audio_file
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">Lossless Audio</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Extract studio-quality audio in FLAC or WAV formats directly from the stream.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group reveal">
              <div className="w-12 h-12 rounded-xl bg-aurora-cyan/10 flex items-center justify-center mb-6 border border-aurora-cyan/20 group-hover:bg-aurora-cyan/20 transition-colors">
                <span className="material-symbols-outlined text-aurora-cyan" data-icon="playlist_play">
                  playlist_play
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">Smart Playlist</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sync entire channels and playlists with automatic incremental updates.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group reveal">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="dynamic_feed">
                  dynamic_feed
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">Channel Archiving</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Maintain a localized backup of your favorite creators' historical content.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group reveal">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center mb-6 border border-tertiary/20 group-hover:bg-tertiary/20 transition-colors">
                <span className="material-symbols-outlined text-tertiary" data-icon="rocket_launch">
                  rocket_launch
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">Multi-Threaded Speed</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Parallel processing engine that saturates even 10Gbps fiber connections.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-panel p-8 rounded-2xl hover:translate-y-[-8px] transition-all duration-300 group border-neon-blue/30 reveal">
              <div className="w-12 h-12 rounded-xl bg-neon-blue/20 flex items-center justify-center mb-6 border border-neon-blue/40 group-hover:bg-neon-blue/30 transition-colors">
                <span className="material-symbols-outlined text-neon-blue" data-icon="layers">
                  layers
                </span>
              </div>
              <h3 className="font-headline-lg text-[20px] text-white mb-3">Batch Processing</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Queue hundreds of media items and let our neural engine handle the priority.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-max-width mx-auto px-margin-desktop mb-24">
          <div className="relative glass-panel rounded-3xl p-12 md:p-20 overflow-hidden text-center reveal">
            <div className="absolute inset-0 aurora-gradient -z-10" />
            <h2 className="font-headline-xl text-headline-xl md:text-[64px] text-white mb-8">
              Ready to go <span className="text-neon-blue italic">Pro</span>?
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12">
              Join over 1M creators and data archivists who trust AlgoTube Pro for their media pipeline.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button className="bg-white text-background px-12 py-5 rounded-full font-label-md text-label-md hover:shadow-xl transition-all font-bold cursor-pointer">
                Get Started Free
              </button>
              <button className="border border-white/20 text-white px-12 py-5 rounded-full font-label-md text-label-md hover:bg-white/5 backdrop-blur-md transition-all cursor-pointer">
                View Pricing Plans
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto bg-surface-container-lowest border-t border-white/5">
        <div className="max-w-max-width mx-auto px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-label-md text-label-md text-neon-blue">AlgoTube Pro</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">© 2024 AlgoTube Pro. Neural-Link Enabled.</p>
          </div>
          
          <div className="flex gap-8">
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-aurora-cyan transition-colors" href="#terms">
              Terms of Service
            </a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-aurora-cyan transition-colors" href="#privacy">
              Privacy Protocol
            </a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-aurora-cyan transition-colors" href="#api-status">
              API Status
            </a>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:text-neon-blue cursor-pointer transition-colors">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:text-neon-blue cursor-pointer transition-colors">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
