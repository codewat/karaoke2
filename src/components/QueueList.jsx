import React, { useState } from 'react';
import {
  ListMusic,
  Trash2,
  ChevronUp,
  ChevronDown,
  Music,
  Disc3,
  Sparkles,
  Play,
  AlertTriangle,
  X,
  FastForward
} from 'lucide-react';

export default function QueueList({
  currentSong,
  queue = [],
  onRemoveFromQueue,
  onMoveQueueItem,
  onPlayNow,
  onSwitchToSearch
}) {
  const [songToPlayNow, setSongToPlayNow] = useState(null);

  const handleConfirmPlayNow = () => {
    if (songToPlayNow?.idKey) {
      onPlayNow(songToPlayNow.idKey);
      setSongToPlayNow(null);
    }
  };

  return (
    <div className="space-y-4 pb-48">
      {/* Current Song Card */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Disc3 className="w-3.5 h-3.5 animate-spin text-rose-500" />
          <span>Now Singing</span>
        </div>

        {currentSong ? (
          <div className="glass-panel p-3.5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 to-purple-950/20 flex items-center gap-3">
            <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black/60 flex-shrink-0">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                <span>{currentSong.author}</span>
                {currentSong.addedBy && (
                  <span className="text-rose-400 font-medium">· Reserved by {currentSong.addedBy}</span>
                )}
              </div>
            </div>
            <div className="flex items-end gap-0.5 h-4 px-2">
              <span className="w-1 bg-rose-500 rounded-full animate-bar-1" />
              <span className="w-1 bg-cyan-400 rounded-full animate-bar-2" />
              <span className="w-1 bg-purple-500 rounded-full animate-bar-3" />
            </div>
          </div>
        ) : (
          <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center text-gray-400 text-xs">
            Walay kanta nga nag-play sa pagkakaron. Pili o i-queue ang imong kanta!
          </div>
        )}
      </div>

      {/* Up Next Queue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <ListMusic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Song Queue ({queue.length})</span>
          </div>
          {queue.length > 0 && (
            <span className="text-[11px] text-gray-400">
              💡 Tap any song to skip & play now
            </span>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-3">
            <div className="p-3 bg-white/5 rounded-2xl inline-block text-gray-400">
              <Music className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm font-semibold text-gray-300">Walay naka-reserba nga kanta.</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Pangita og kanta sa Search tab aron ma-add sa listahan!
            </p>
            <button
              onClick={onSwitchToSearch}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-transform inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pangita og Kanta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((song, index) => (
              <div
                key={song.idKey || index}
                className="glass-panel p-3 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex items-center gap-2.5 group"
              >
                {/* Index badge / Play now icon */}
                <button
                  onClick={() => setSongToPlayNow(song)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-rose-600 group-hover:text-white text-gray-400 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 transition-colors"
                  title="Play this song now"
                >
                  <span className="group-hover:hidden">{index + 1}</span>
                  <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block" />
                </button>

                {/* Thumbnail & Title (clickable to play now) */}
                <div
                  onClick={() => setSongToPlayNow(song)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="relative w-14 h-11 rounded-lg overflow-hidden bg-black/60 flex-shrink-0">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                      {song.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{song.duration}</span>
                      {song.addedBy && <span>· {song.addedBy}</span>}
                    </div>
                  </div>
                </div>

                {/* Move & Remove Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Dedicated Quick Play button */}
                  <button
                    onClick={() => setSongToPlayNow(song)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-600 text-gray-300 hover:text-white transition-all active:scale-95 text-[11px] flex items-center gap-1"
                    title="Play this song now"
                  >
                    <FastForward className="w-3.5 h-3.5 text-rose-400 hover:text-white" />
                  </button>

                  <div className="flex flex-col">
                    <button
                      onClick={() => onMoveQueueItem(song.idKey, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-20 text-gray-300 hover:text-white"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onMoveQueueItem(song.idKey, 'down')}
                      disabled={index === queue.length - 1}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-20 text-gray-300 hover:text-white"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveFromQueue(song.idKey)}
                    className="p-2 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-xl transition-colors"
                    title="Remove song"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Warning Modal */}
      {songToPlayNow && (
        <div
          onClick={() => setSongToPlayNow(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-5 sm:p-6 rounded-3xl max-w-sm w-full space-y-4 border border-rose-500/30 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Stop Current Song?</span>
              </div>
              <button
                onClick={() => setSongToPlayNow(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300">
              Gusto ba nimo <strong>i-stop ang kasamtangang nag-play</strong> nga kanta ug <strong>ipatukar dayon</strong> kining kantaha?
            </p>

            {/* Selected Song Preview */}
            <div className="p-3 bg-black/50 rounded-2xl border border-white/10 flex items-center gap-3">
              <img
                src={songToPlayNow.thumbnail}
                alt={songToPlayNow.title}
                className="w-14 h-11 rounded-xl object-cover bg-black flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-rose-400">Play Now:</div>
                <h5 className="text-xs font-bold text-white truncate">{songToPlayNow.title}</h5>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{songToPlayNow.author}</p>
              </div>
            </div>

            {/* If there's a currently playing song, show it too */}
            {currentSong && (
              <div className="text-[11px] text-gray-400 px-1 flex items-center gap-1.5">
                <span className="text-amber-400 font-semibold">Mo-stop:</span>
                <span className="truncate flex-1">{currentSong.title}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSongToPlayNow(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-xs text-gray-200 active:scale-95 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmPlayNow}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 font-semibold text-xs text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
