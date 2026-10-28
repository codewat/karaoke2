import React, { useState, useEffect } from 'react';
import ModeSelect from './components/ModeSelect';
import ScreenPlayer from './components/ScreenPlayer';
import RemoteController from './components/RemoteController';

export default function App() {
  const [mode, setMode] = useState(null); // 'screen' | 'remote' | null
  const [roomId, setRoomId] = useState('SING');

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const urlRoom = params.get('room');

    if (urlRoom) {
      setRoomId(urlRoom.toUpperCase());
    }

    if (urlMode === 'screen' || urlMode === 'remote') {
      setMode(urlMode);
    } else {
      // Check stored preference
      const savedMode = localStorage.getItem('karaoke_saved_mode');
      const savedRoom = localStorage.getItem('karaoke_saved_room');
      if (savedRoom) setRoomId(savedRoom.toUpperCase());
      if (savedMode === 'screen' || savedMode === 'remote') {
        setMode(savedMode);
      }
    }
  }, []);

  const handleSelectMode = (newMode, newRoomId) => {
    const cleanRoom = (newRoomId || 'SING').toUpperCase();
    setMode(newMode);
    setRoomId(cleanRoom);

    // Save preference
    localStorage.setItem('karaoke_saved_mode', newMode);
    localStorage.setItem('karaoke_saved_room', cleanRoom);

    // Update URL query parameters without reloading
    const url = new URL(window.location);
    url.searchParams.set('mode', newMode);
    url.searchParams.set('room', cleanRoom);
    window.history.replaceState({}, '', url);
  };

  const handleSwitchMode = () => {
    setMode(null);
    localStorage.removeItem('karaoke_saved_mode');
    const url = new URL(window.location);
    url.searchParams.delete('mode');
    window.history.replaceState({}, '', url);
  };

  if (!mode) {
    return <ModeSelect onSelectMode={handleSelectMode} defaultRoom={roomId} />;
  }

  if (mode === 'screen') {
    return <ScreenPlayer roomId={roomId} onSwitchMode={handleSwitchMode} />;
  }

  return <RemoteController roomId={roomId} onSwitchMode={handleSwitchMode} />;
}

