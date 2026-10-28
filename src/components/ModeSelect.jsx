import React, { useState, useEffect } from 'react';
import { Tv, Smartphone, Mic2, Sparkles, Wifi } from 'lucide-react';

export default function ModeSelect({ onSelectMode, defaultRoom = 'SING' }) {
  const [roomId, setRoomId] = useState(defaultRoom);
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    fetch('/api/server-info')
      .then((res) => res.json())
      .then((data) => setServerInfo(data))
      .catch((err) => console.log('Server info fetch failed:', err));
  }, []);

  const handleSelect = (mode) => {
    const cleanRoom = (roomId || 'SING').toUpperCase().trim();
    onSelectMode(mode, cleanRoom);
  };

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-6 z-10">
        {/* App Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-rose-600 to-purple-600 rounded-2xl shadow-lg neon-glow-pink mb-2">
            <Mic2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
            Party Karaoke
          </h1>
          <p className="text-gray-400 text-sm">
            Dual-Phone Setup: 1 for Screen & Lyrics, 1 for Remote Search & Queue!
          </p>
        </div>

        {/* Room Code Input */}
        <div className="glass-panel p-4 rounded-2xl space-y-2 border border-white/10">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Room Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="e.g. SING"
              maxLength={8}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 font-bold tracking-widest text-lg text-center text-rose-400 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Device Selection Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleSelect('screen')}
            className="w-full group glass-panel hover:bg-white/10 p-5 rounded-2xl border border-white/10 transition-all text-left flex items-start gap-4 active:scale-[0.98]"
          >
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Tv className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">Phone 1: Screen Mode</h3>
                <span className="text-xs bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-medium">
                  Lyrics Display
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Plays YouTube Karaoke video, displays lyrics & shows the room QR code.
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelect('remote')}
            className="w-full group glass-panel hover:bg-white/10 p-5 rounded-2xl border border-white/10 transition-all text-left flex items-start gap-4 active:scale-[0.98]"
          >
            <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-colors">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">Phone 2: Remote Control</h3>
                <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                  Search & Queue
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Auto-karaoke search, reserve songs, save favorites & control player.
              </p>
            </div>
          </button>
        </div>

        {/* Server WiFi connection info */}
        {serverInfo && (
          <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-400 flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>
              Connect both phones to same WiFi: <strong className="text-white">{serverInfo.localUrl}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

