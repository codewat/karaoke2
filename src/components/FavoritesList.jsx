import React from 'react';
import { Heart, Plus, Trash2, Eye } from 'lucide-react';

export default function FavoritesList({
  favorites = [],
  onAddToQueue,
  onRemoveFavorite,
  onSwitchToSearch
}) {
  return (
    <div className="space-y-4 pb-48">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-rose-500" />
          <span>My Favorite Songs ({favorites.length})</span>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-3">
          <div className="p-3 bg-rose-500/10 rounded-2xl inline-block text-rose-400">
            <Heart className="w-8 h-8 mx-auto" />
          </div>
          <p className="text-sm font-semibold text-gray-300">No favorite songs saved yet.</p>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Tap the heart (❤️) icon on any song in Search to save it here for fast 1-tap queuing!
          </p>
          <button
            onClick={onSwitchToSearch}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-transform"
          >
            Search Songs
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((song) => (
            <div
              key={song.id}
              className="glass-panel p-3 rounded-2xl border border-white/5 flex items-center gap-3 group"
            >
              {/* Thumbnail */}
              <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black/60 flex-shrink-0">
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{song.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                  <span>{song.duration}</span>
                  {song.formattedViews && (
                    <span className="text-cyan-400 flex items-center gap-0.5">
                      · <Eye className="w-2.5 h-2.5 inline" /> {song.formattedViews}
                    </span>
                  )}
                  <span>· {song.author}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onAddToQueue(song, false)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Queue</span>
                </button>

                <button
                  onClick={() => onRemoveFavorite(song.id)}
                  className="p-2 text-gray-400 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-colors"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
