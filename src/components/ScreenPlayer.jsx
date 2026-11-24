import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize,
  Minimize,
  QrCode,
  Music,
  Users,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  X,
  Settings
} from 'lucide-react';
import { getSocket } from '../services/socket';
import SettingsModal from './SettingsModal';

export default function ScreenPlayer({ roomId = 'SING', onSwitchMode }) {
  const socket = getSocket();
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [customHost, setCustomHost] = useState('');
  const [isEditingHost, setIsEditingHost] = useState(false);

  const [localPlayerState, setLocalPlayerState] = useState('idle');
  const [needsActivation, setNeedsActivation] = useState(false);
  const activationTimerRef = useRef(null);
  const lastReportedStateRef = useRef(null);

  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch server info to get local WiFi IP (e.g. 10.0.0.172:3000)
  useEffect(() => {
    fetch('/api/server-info')
      .then((res) => res.json())
      .then((data) => {
        setServerInfo(data);
        if (data.localIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          setCustomHost(`${data.localIp}:${data.port || 3000}`);
        }
      })
      .catch((err) => console.log('Server info fetch error:', err));
  }, []);

  const hostToUse = customHost || (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && serverInfo?.localIp
      ? `${serverInfo.localIp}:${serverInfo.port || 3000}`
      : window.location.host
  );

  const remoteUrl = `${window.location.protocol}//${hostToUse}/?mode=remote&room=${roomId}`;

  // YouTube Iframe API handshake: must be { event: 'listening' }
  const sendHandshake = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      } catch (err) {}
    }
  };

  // Helper to reliably send commands to YouTube Iframe
  // args MUST be an array for YouTube's Function.prototype.apply
  const sendYouTubeCommand = (func, args = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: func,
            args: Array.isArray(args) ? args : [args]
          }),
          '*'
        );
      } catch (err) {
        console.error('Failed to postMessage to YouTube iframe:', err);
      }
    }
  };

  // Activate audio context and trigger video playback
  const activateAndPlay = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume();
      }
    } catch {}

    sendHandshake();
    sendYouTubeCommand('unMute');
    sendYouTubeCommand('setVolume', [100]);
    sendYouTubeCommand('playVideo');
    setNeedsActivation(false);
    if (activationTimerRef.current) clearTimeout(activationTimerRef.current);
  };

  // Global TV remote / touch / click interaction to satisfy browser autoplay policy
  useEffect(() => {
    const handleGlobalInteraction = (e) => {
      if (e.type === 'click' || e.type === 'touchstart' || e.type === 'tv-remote-play') {
        activateAndPlay();
      } else if (e.type === 'keydown') {
        // TV remote keys: Enter, Space, DPAD_CENTER (23), or MediaPlayPause (179)
        if (['Enter', ' ', 'MediaPlayPause', 'MediaPlay'].includes(e.key) || [13, 32, 23, 179].includes(e.keyCode)) {
          activateAndPlay();
        }
      }
    };

    window.addEventListener('click', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);
    window.addEventListener('keydown', handleGlobalInteraction);
    window.addEventListener('tv-remote-play', handleGlobalInteraction);

    return () => {
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
      window.removeEventListener('tv-remote-play', handleGlobalInteraction);
    };
  }, [currentSong]);

  // Listen to postMessage from YouTube Iframe for song end / state changes
  useEffect(() => {
    const handleWindowMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // YouTube onReady event
        if (data.event === 'onReady') {
          sendYouTubeCommand('setPlaybackQuality', ['hd720']);
          sendYouTubeCommand('setPlaybackQualityRange', ['medium', 'hd720']);
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [100]);
          sendYouTubeCommand('playVideo');
        }

        // YouTube onStateChange or infoDelivery events
        let stateCode = null;
        if (data.event === 'onStateChange') {
          stateCode = data.info;
        } else if (data.event === 'infoDelivery' && data.info?.playerState !== undefined) {
          stateCode = data.info.playerState;
        }

        // Deduplicate state transitions to prevent flooding WebSocket and TV CPU
        if (stateCode !== null && stateCode !== lastReportedStateRef.current) {
          lastReportedStateRef.current = stateCode;

          if (stateCode === 0) {
            // ENDED
            console.log('Video ended, skipping to next song');
            setLocalPlayerState('ended');
            socket.emit('song-ended', { roomId });
          } else if (stateCode === 1) {
            // PLAYING
            setLocalPlayerState('playing');
            setNeedsActivation(false);
            if (activationTimerRef.current) clearTimeout(activationTimerRef.current);
            socket.emit('screen-sync', { roomId, playerState: 'playing' });
          } else if (stateCode === 2) {
            // PAUSED
            setLocalPlayerState('paused');
            socket.emit('screen-sync', { roomId, playerState: 'paused' });
          } else if (stateCode === 3) {
            // BUFFERING
            setLocalPlayerState('buffering');
            socket.emit('screen-sync', { roomId, playerState: 'buffering' });
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [roomId]);

  // Socket room connection
  useEffect(() => {
    socket.emit('join-room', { roomId, role: 'screen', deviceName: 'Screen Display' });

    socket.on('room-state', (room) => {
      setQueue(room.queue || []);
      setConnectedDevices(room.connectedDevices || 1);
      setCurrentSong(room.currentSong || null);
    });

    socket.on('play-song', (song) => {
      setCurrentSong(song || null);
      if (song?.id) {
        lastReportedStateRef.current = null;
        setLocalPlayerState('buffering');
        setNeedsActivation(false);

        // If browser blocks unmuted autoplay without gesture, prompt user after 2.5s
        if (activationTimerRef.current) clearTimeout(activationTimerRef.current);
        activationTimerRef.current = setTimeout(() => {
          setNeedsActivation(true);
        }, 2500);

        setTimeout(() => {
          sendHandshake();
          sendYouTubeCommand('setPlaybackQuality', ['hd720']);
          sendYouTubeCommand('setPlaybackQualityRange', ['medium', 'hd720']);
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('playVideo');
        }, 400);
      } else {
        lastReportedStateRef.current = null;
        setLocalPlayerState('idle');
        setNeedsActivation(false);
      }
    });

    socket.on('control-action', ({ action, value }) => {
      if (action === 'play') {
        activateAndPlay();
      } else if (action === 'pause') {
        sendYouTubeCommand('pauseVideo');
      } else if (action === 'restart') {
        sendYouTubeCommand('seekTo', [0, true]);
        activateAndPlay();
      } else if (action === 'seek' && typeof value === 'number') {
        sendYouTubeCommand('seekTo', [value, true]);
      }
    });

    socket.on('devices-count', (count) => {
      setConnectedDevices(count);
    });

    return () => {
      socket.off('room-state');
      socket.off('play-song');
      socket.off('control-action');
      socket.off('devices-count');
    };
  }, [roomId]);

  // Tell YouTube iframe to listen for postMessages and immediately autoplay
  const handleIframeLoad = () => {
    sendHandshake();
    sendYouTubeCommand('setPlaybackQuality', ['hd720']);
    sendYouTubeCommand('setPlaybackQualityRange', ['medium', 'hd720']);
    sendYouTubeCommand('unMute');
    sendYouTubeCommand('setVolume', [100]);
    sendYouTubeCommand('playVideo');

    // Subsequent retries ensure autoplay kicks in even if YouTube JS was still loading
    setTimeout(() => {
      sendHandshake();
      sendYouTubeCommand('setPlaybackQuality', ['hd720']);
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('playVideo');
    }, 400);

    setTimeout(() => {
      sendHandshake();
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('playVideo');
    }, 1200);

    setTimeout(() => {
      sendHandshake();
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('playVideo');
    }, 2200);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const nextSong = queue[0];

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-black text-white flex flex-col select-none overflow-hidden"
    >
      {/* Top Floating HUD Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2.5">
          {/* Room Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Room:</span>
            <span className="text-rose-400 font-mono tracking-wider font-bold">{roomId}</span>
          </div>

          {/* Connected Remotes Count */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md text-xs text-gray-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{connectedDevices} device{connectedDevices > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Center: Now Playing Title (Keeps bottom clear for lyrics!) */}
        {currentSong && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-rose-500/30 text-xs text-white max-w-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold text-rose-400">Now Singing:</span>
            <span className="truncate font-medium">{currentSong.title}</span>
          </div>
        )}

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Up Next Badge */}
          {nextSong && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-xs text-rose-200">
              <span className="font-bold text-rose-400">Next:</span>
              <span className="truncate max-w-[160px]">{nextSong.title}</span>
            </div>
          )}

          {/* Skip Song Button (accessible on screen) */}
          {currentSong && (
            <button
              onClick={() => socket.emit('player-control', { roomId, action: 'skip' })}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 text-gray-200"
              title="Skip to next song"
            >
              <SkipForward className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          )}

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-gray-200"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-gray-200"
            title="Settings & App Download"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Switch Mode */}
          <button
            onClick={onSwitchMode}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Floating Corner QR Code (Always visible to scan directly, click to maximize) */}
      <div
        onClick={() => setShowQRModal(true)}
        className="absolute top-14 right-3 z-30 group cursor-pointer glass-panel p-2 rounded-2xl border border-white/20 bg-black/85 hover:bg-black shadow-2xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 select-none backdrop-blur-md"
        title="I-click aron mo-maximize ang QR Code"
      >
        <div className="p-1.5 bg-white rounded-xl shadow-md">
          <QRCodeSVG value={remoteUrl} size={68} level="M" />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-300 group-hover:text-rose-400 transition-colors">
          <QrCode className="w-3 h-3 text-cyan-400" />
          <span>Scan to Join</span>
        </div>
      </div>

      {/* Main Screen Content */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        {/* Active YouTube Video Player */}
        {currentSong ? (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
            <iframe
              ref={iframeRef}
              key={currentSong.idKey || currentSong.id}
              src={`https://www.youtube.com/embed/${currentSong.id}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&origin=${encodeURIComponent(window.location.origin)}`}
              title={currentSong.title}
              loading="eager"
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 absolute inset-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />

            {/* Tap / Click prompt if browser blocks autoplay before first user gesture */}
            {needsActivation && localPlayerState !== 'playing' && (
              <div
                onClick={activateAndPlay}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer transition-all hover:bg-black/50 p-6 text-center select-none"
              >
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white shadow-2xl flex flex-col items-center gap-4 animate-pulse border border-white/30 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    <Play className="w-8 h-8 fill-white ml-1" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black">Click Screen or Press OK to Sing!</h3>
                    <p className="text-xs sm:text-sm text-rose-100 mt-1">
                      Web browsers need 1 tap or TV remote OK to enable audio. Or press Play on your phone remote!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Standby / Idle Screen when no song is playing */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0c0d14] via-[#121324] to-[#090a10] z-10">
            {/* Ambient glowing circles */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-rose-600/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-lg w-full flex flex-col items-center space-y-5 z-10">
              <div className="p-4 bg-gradient-to-tr from-rose-600 to-purple-600 rounded-3xl shadow-xl neon-glow-pink">
                <Music className="w-12 h-12 text-white animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-rose-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
                  Ready to Sing!
                </h1>
                <p className="text-gray-300 text-sm sm:text-base">
                  Scan the QR code with Phone 2 to search and queue songs!
                </p>
              </div>

              {/* Large Standby QR Code */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl transition-transform hover:scale-105">
                <QRCodeSVG value={remoteUrl} size={180} level="M" />
              </div>

              <div className="space-y-2 w-full max-w-sm">
                <div className="text-xs uppercase tracking-widest text-gray-400">
                  Or open this URL in your phone browser:
                </div>
                {isEditingHost ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customHost}
                      onChange={(e) => setCustomHost(e.target.value)}
                      placeholder="e.g. 10.0.0.172:3000"
                      className="flex-1 bg-black/60 border border-rose-500 rounded-xl px-3 py-1.5 text-xs text-rose-300 font-mono text-center focus:outline-none"
                    />
                    <button
                      onClick={() => setIsEditingHost(false)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-rose-400 font-mono font-bold text-sm bg-black/60 px-4 py-2 rounded-xl border border-white/10 select-all">
                      {remoteUrl}
                    </div>
                    <button
                      onClick={() => setIsEditingHost(true)}
                      className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl text-xs"
                      title="Edit IP"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-amber-400/90 font-medium">
                  ⚠️ Make sure Phone and Screen are connected to the SAME Wi-Fi network!
                </p>
              </div>

              {/* Queue Preview if queued while idle */}
              {queue.length > 0 && (
                <div className="w-full glass-panel p-4 rounded-2xl border border-white/10 text-left">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                    Coming Up Next ({queue.length}):
                  </div>
                  <div className="space-y-1.5">
                    {queue.slice(0, 3).map((item, i) => (
                      <div key={item.idKey || i} className="flex items-center gap-2 text-sm text-gray-200">
                        <span className="font-mono text-gray-500">{i + 1}.</span>
                        <span className="truncate flex-1 font-medium">{item.title}</span>
                        <span className="text-xs text-gray-400">{item.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Maximized QR Code Modal */}
      {showQRModal && (
        <div
          onClick={() => setShowQRModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-6 sm:p-7 rounded-3xl max-w-sm w-full text-center space-y-4 border border-rose-500/30 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white text-left">Connect Remote Phone</h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Scan this QR code with your phone camera to search & queue songs!
            </p>

            <div className="p-5 bg-white rounded-3xl inline-block shadow-2xl transition-transform hover:scale-105">
              <QRCodeSVG value={remoteUrl} size={220} level="M" />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                Or open this URL in your browser:
              </div>
              <div className="text-xs text-rose-400 font-mono font-bold bg-black/60 p-2.5 rounded-xl border border-white/10 select-all break-all">
                {remoteUrl}
              </div>
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 font-semibold text-xs text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings & App Download Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        roomId={roomId}
      />
    </div>
  );
}
