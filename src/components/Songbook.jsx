import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Sparkles, Loader2 } from 'lucide-react';

export default function Songbook({ onSelectSongForSearch, onDirectQueue }) {
  const [songs, setSongs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/popular')
      .then((res) => res.json())
      .then((data) => {
        setSongs(data.popular || []);
      })
      .catch((err) => console.error('Popular songs fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', 'OPM', 'Classics', 'Rock', 'Pop', 'Duet'];

  const filteredSongs =
    filter === 'All' ? songs : songs.filter((s) => s.category?.toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-4 pb-48">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Karaoke Songbook (All-time Hits)</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === cat
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredSongs.map((song, i) => (
            <div
              key={i}
              className="glass-panel p-3.5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {song.badge || song.category}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">{song.title}</h4>
                <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Search this song */}
                <button
                  onClick={() => onSelectSongForSearch(song.query || song.title)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95 text-xs flex items-center gap-1"
                  title="Search versions on YouTube"
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">Find</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

