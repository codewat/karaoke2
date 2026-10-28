import React, { useState, useEffect } from 'react';
import {
  Search,
  ListMusic,
  Heart,
  BookOpen,
  Wifi,
  Smartphone,
  Tv,
  Users,
  Edit2
} from 'lucide-react';
import { getSocket } from '../services/socket';
import SearchBar from './SearchBar';
import QueueList from './QueueList';
import FavoritesList from './FavoritesList';
import Songbook from './Songbook';
import NowPlayingBar from './NowPlayingBar';

export default function RemoteController({ roomId = 'SING', onSwitchMode }) {
  const socket = getSocket();
  const [activeTab, setActiveTab] = useState('search');
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playerState, setPlayerState] = useState('idle');
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('karaoke_nickname') || 'Singer 1';
  });
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('karaoke_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('karaoke_favorites', JSON.stringify(favorites));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, [favorites]);

  // Save nickname
  const handleSaveNickname = (newNick) => {
    const val = newNick.trim() || 'Singer';
    setNickname(val);
    localStorage.setItem('karaoke_nickname', val);
    setIsEditingNick(false);
  };

  // Socket setup
  useEffect(() => {
    socket.emit('join-room', { roomId, role: 'remote', deviceName: nickname });

    socket.on('room-state', (room) => {
      setCurrentSong(room.currentSong || null);
      setQueue(room.queue || []);
      setPlayerState(room.playerState || 'idle');
      setConnectedDevices(room.connectedDevices || 1);
    });

    socket.on('player-status-update', ({ playerState }) => {
      if (playerState) setPlayerState(playerState);
    });

    socket.on('devices-count', (count) => {
      setConnectedDevices(count);
    });

    return () => {
      socket.off('room-state');
      socket.off('player-status-update');
      socket.off('devices-count');
    };
  }, [roomId, nickname]);

  // Actions
  const handleAddToQueue = (song, playNext = false) => {
    socket.emit('queue-add', {
      roomId,
      song,
      playNext,
      addedBy: nickname
    });
  };

  const handleRemoveFromQueue = (idKey) => {
    socket.emit('queue-remove', { roomId, idKey });
  };

  const handleMoveQueueItem = (idKey, direction) => {
    socket.emit('queue-move', { roomId, idKey, direction });
  };

  const handlePlayNow = (idKey) => {
    socket.emit('play-now', { roomId, idKey });
  };

  const handleControlAction = (action, value) => {
    socket.emit('player-control', { roomId, action, value });
  };

  const handleToggleFavorite = (song) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === song.id);
      if (exists) {
        return prev.filter((f) => f.id !== song.id);
      } else {
        return [{ id: song.id, title: song.title, author: song.author, thumbnail: song.thumbnail, duration: song.duration }, ...prev];
      }
    });
  };

  const handleRemoveFavorite = (songId) => {
    setFavorites((prev) => prev.filter((f) => f.id !== songId));
  };

  const handleSelectSongForSearch = (queryText) => {
    setInitialSearchQuery(queryText);
    setActiveTab('search');
  };

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white flex flex-col max-w-lg mx-auto relative select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/5 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Room Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-300">Room:</span>
            <span className="font-mono font-bold text-rose-400">{roomId}</span>
          </div>

          {/* Nickname pill */}
          {isEditingNick ? (
            <input
              type="text"
              defaultValue={nickname}
              onBlur={(e) => handleSaveNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname(e.target.value)}
              autoFocus
              className="bg-black/60 border border-rose-500 rounded-lg px-2 py-0.5 text-xs text-white w-24 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingNick(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
              title="Change your singer name"
            >
              <span className="truncate max-w-[80px]">{nickname}</span>
              <Edit2 className="w-2.5 h-2.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Switch to Screen button */}
        <button
          onClick={onSwitchMode}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-xl hover:bg-white/5 transition-colors"
        >
          <Tv className="w-3.5 h-3.5 text-rose-400" />
          <span>Screen Mode</span>
        </button>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 p-3.5 sm:p-4 overflow-y-auto">
        {activeTab === 'search' && (
          <SearchBar
            onAddToQueue={handleAddToQueue}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            roomId={roomId}
          />
        )}

        {activeTab === 'queue' && (
          <QueueList
            currentSong={currentSong}
            queue={queue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onMoveQueueItem={handleMoveQueueItem}
            onPlayNow={handlePlayNow}
            onSwitchToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesList
            favorites={favorites}
            onAddToQueue={handleAddToQueue}
            onRemoveFavorite={handleRemoveFavorite}
            onSwitchToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'songbook' && (
          <Songbook
            onSelectSongForSearch={handleSelectSongForSearch}
            onDirectQueue={handleAddToQueue}
          />
        )}
      </main>

      {/* Mini Player Floating Bar */}
      <NowPlayingBar
        currentSong={currentSong}
        playerState={playerState}
        onControlAction={handleControlAction}
        roomId={roomId}
      />

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0e18]/95 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-lg mx-auto grid grid-cols-4 h-14">
          {/* Search Tab */}
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'search' ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px]">Search</span>
          </button>

          {/* Queue Tab */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'queue' ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            <span className="text-[10px]">Queue</span>
            {queue.length > 0 && (
              <span className="absolute top-1.5 right-6 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] rounded-full font-bold">
                {queue.length}
              </span>
            )}
          </button>

          {/* Favorites Tab */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'favorites' ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'fill-rose-500' : ''}`} />
            <span className="text-[10px]">Favorites</span>
            {favorites.length > 0 && (
              <span className="absolute top-1.5 right-4 px-1.5 py-0.2 bg-purple-600 text-white text-[10px] rounded-full font-bold">
                {favorites.length}
              </span>
            )}
          </button>

          {/* Songbook Tab */}
          <button
            onClick={() => setActiveTab('songbook')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'songbook' ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Songbook</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

