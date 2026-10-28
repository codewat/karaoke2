import React, { useState } from 'react';
import { Search, Loader2, Plus, Heart, Check, ChevronDown } from 'lucide-react';

export default function SearchBar({
  onAddToQueue,
  favorites = [],
  onToggleFavorite,
  roomId = 'SING'
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [queuedIdMap, setQueuedIdMap] = useState({});

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setNextPageToken(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || loadingMore || !query.trim()) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}&pageToken=${encodeURIComponent(
          nextPageToken
        )}`
      );
      const data = await res.json();
      const newItems = data.results || [];
      setResults((prev) => [...prev, ...newItems]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleQueueClick = (song) => {
    onAddToQueue(song, false);
    setQueuedIdMap((prev) => ({ ...prev, [song.id]: true }));

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
      <form onSubmit={handleSearch} className="space-y-2">
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
          <span>✨ Automatic Karaoke & Videoke filter</span>
          {results.length > 0 && <span>{results.length} songs displayed</span>}
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
            Sulayi pag-type og lain nga keyword o titulo sa kanta.
          </p>
        </div>
      )}

      {/* Results List (with large bottom padding pb-48 so it's NEVER covered by Now Playing) */}
      {!loading && results.length > 0 && (
        <div className="space-y-2.5 pb-48">
          {results.map((song) => {
            const isQueued = queuedIdMap[song.id];
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Favorite button */}
                  <button
                    onClick={() => onToggleFavorite(song)}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                      favorited
                        ? 'text-rose-500 bg-rose-500/10'
                        : 'text-gray-400 hover:text-rose-400 hover:bg-white/5'
                    }`}
                    title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500' : ''}`} />
                  </button>

                  {/* Main Queue Button (No lightning button) */}
                  <button
                    onClick={() => handleQueueClick(song)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                      isQueued
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {isQueued ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Queued!</span>
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

          {/* Load More Button (Never covered, positioned comfortably with pb-48) */}
          {nextPageToken && (
            <div className="pt-3 pb-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 text-xs sm:text-sm font-semibold text-rose-300 border border-white/10 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Loading more songs...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Songs</span>
                    <ChevronDown className="w-4 h-4 text-rose-400" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
