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
  X
} from 'lucide-react';
import { getSocket } from '../services/socket';

export default function ScreenPlayer({ roomId = 'SING', onSwitchMode }) {
  const socket = getSocket();
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [customHost, setCustomHost] = useState('');
  const [isEditingHost, setIsEditingHost] = useState(false);

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

  // Listen to postMessage from YouTube Iframe for song end / state changes
  useEffect(() => {
    const handleWindowMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'onStateChange') {
          // info 0: ENDED
          if (data.info === 0) {
            console.log('Video ended, skipping to next song');
            socket.emit('song-ended', { roomId });
          } else if (data.info === 1) {
            socket.emit('screen-sync', { roomId, playerState: 'playing' });
          } else if (data.info === 2) {
            socket.emit('screen-sync', { roomId, playerState: 'paused' });
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
    });

    socket.on('control-action', ({ action, value }) => {
      if (!iframeRef.current?.contentWindow) return;
      try {
        if (action === 'play') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
            '*'
          );
        } else if (action === 'pause') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
            '*'
          );
        } else if (action === 'restart') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
            '*'
          );
        } else if (action === 'seek' && typeof value === 'number') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [value, true] }),
            '*'
          );
        }
      } catch (err) {
        console.error('Failed to postMessage to YouTube iframe:', err);
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

  // Tell YouTube iframe to listen for postMessages as soon as it loads
  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      } catch {}
    }
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
              src={`https://www.youtube.com/embed/${currentSong.id}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
              title={currentSong.title}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 absolute inset-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
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
                  I-scan ang QR code gamit ang Phone 2 aron makapili ug makatukar og kanta!
                </p>
              </div>

              {/* Large Standby QR Code */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl transition-transform hover:scale-105">
                <QRCodeSVG value={remoteUrl} size={180} level="M" />
              </div>

              <div className="space-y-2 w-full max-w-sm">
                <div className="text-xs uppercase tracking-widest text-gray-400">
                  O ablihi kini sa browser sa phone:
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
                  ⚠️ Siguroa nga ang Phone ug Screen naka-connect sa SAME Wi-Fi!
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
              I-scan kining dako nga QR code gamit ang camera sa imong phone aron makapili ug makatukar og kanta!
            </p>

            <div className="p-5 bg-white rounded-3xl inline-block shadow-2xl transition-transform hover:scale-105">
              <QRCodeSVG value={remoteUrl} size={220} level="M" />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                O ablihi kini sa browser sa phone:
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
    </div>
  );
}
