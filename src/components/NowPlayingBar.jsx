import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, Volume2 } from 'lucide-react';

export default function NowPlayingBar({
  currentSong,
  playerState = 'idle',
  onControlAction,
  roomId = 'SING'
}) {
  if (!currentSong) return null;

  const isPlaying = playerState === 'playing';

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-3 sm:px-6">
      <div className="max-w-lg mx-auto glass-panel p-2.5 sm:p-3 rounded-2xl border border-rose-500/30 bg-[#161625]/95 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
        {/* Thumbnail & Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-11 h-9 rounded-lg overflow-hidden bg-black/60 flex-shrink-0">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{currentSong.title}</h4>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="capitalize">{playerState || 'Ready'}</span>
            </div>
          </div>
        </div>

        {/* Remote Control Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Restart */}
          <button
            onClick={() => onControlAction('restart')}
            className="p-2 text-gray-400 hover:text-white rounded-xl transition-colors active:scale-95"
            title="Restart Song"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => onControlAction(isPlaying ? 'pause' : 'play')}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-all active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          {/* Skip */}
          <button
            onClick={() => onControlAction('skip')}
            className="p-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl transition-all active:scale-95"
            title="Skip to Next Song"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

