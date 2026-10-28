import React, { useState } from 'react';
import { Search, Loader2, Plus, Zap, Heart, Check, Music } from 'lucide-react';

export default function SearchBar({
  onAddToQueue,
  favorites = [],
  onToggleFavorite,
  roomId = 'SING'
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [queuedIdMap, setQueuedIdMap] = useState({});

  const categories = [
    { id: 'all', label: '🎤 All Karaoke' },
    { id: 'opm', label: '🇵🇭 OPM Hits' },
    { id: 'acoustic', label: '🎸 Acoustic' },
    { id: 'duet', label: '👥 Duet' }
  ];

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(cleanQuery)}&category=${encodeURIComponent(category)}`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    if (query.trim()) {
      // Re-trigger search with new category
      setTimeout(() => {
        handleSearchWith(query, catId);
      }, 0);
    }
  };

  const handleSearchWith = async (q, cat) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueClick = (song, playNext = false) => {
    onAddToQueue(song, playNext);
    setQueuedIdMap((prev) => ({ ...prev, [song.id]: playNext ? 'next' : 'queued' }));

    // Reset indicator after 2.5 seconds
    setTimeout(() => {
      setQueuedIdMap((prev) => {
        const copy = { ...prev };
        delete copy[song.id];
        return copy;
      });
    }, 2500);
  };

  const isFavorite = (songId) => favorites.some((f) => f.id === songId);

  return (
    <div className="space-y-4">
      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="space-y-2.5">
        <div className="relative flex items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type song title or singer (e.g. 'my way', 'queen', 'parokya')..."
            className="w-full bg-[#181824] border border-white/10 rounded-2xl pl-11 pr-24 py-3.5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 pointer-events-none" />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md active:scale-95 transition-transform flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Note on Auto-Karaoke */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
          <span>✨ Automatic Videoke / Karaoke filter enabled</span>
          {results.length > 0 && <span>{results.length} songs found</span>}
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                category === cat.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-xs">Searching YouTube karaoke videos...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="py-10 text-center glass-panel rounded-2xl p-6 space-y-2 border border-white/10">
          <p className="text-gray-300 font-semibold text-sm">Walay nakit-an nga kanta.</p>
          <p className="text-gray-500 text-xs">
            Sulayi pag-type og lain nga keyword o gamita ang Songbook tab.
          </p>
        </div>
      )}

      {/* Results List */}
      {!loading && results.length > 0 && (
        <div className="space-y-2.5 pb-20">
          {results.map((song) => {
            const queuedStatus = queuedIdMap[song.id];
            const favorited = isFavorite(song.id);

            return (
              <div
                key={song.id}
                className="glass-panel p-3 rounded-2xl border border-white/5 hover:border-white/15 transition-all flex items-center gap-3 group"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black/60 flex-shrink-0">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {song.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1 py-0.5 rounded text-gray-200 font-mono">
                      {song.duration}
                    </span>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug">
                    {song.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{song.author}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Favorite button */}
                  <button
                    onClick={() => onToggleFavorite(song)}
                    className={`p-2 rounded-xl transition-all ${
                      favorited
                        ? 'text-rose-500 bg-rose-500/10'
                        : 'text-gray-400 hover:text-rose-400 hover:bg-white/5'
                    }`}
                    title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500' : ''}`} />
                  </button>

                  {/* Play Next button */}
                  <button
                    onClick={() => handleQueueClick(song, true)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all active:scale-95"
                    title="Play Next (Jump to top of queue)"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  {/* Main Queue Button */}
                  <button
                    onClick={() => handleQueueClick(song, false)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
                      queuedStatus
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {queuedStatus ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{queuedStatus === 'next' ? 'Next!' : 'Added!'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Queue</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

