import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import ip from 'ip';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchYouTube } from './youtube.js';
import { POPULAR_KARAOKE } from './songbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory rooms
const rooms = new Map();

function getOrCreateRoom(roomId = 'SING') {
  const code = (roomId || 'SING').toUpperCase().trim();
  if (!rooms.has(code)) {
    rooms.set(code, {
      roomId: code,
      currentSong: null,
      queue: [],
      history: [],
      playerState: 'idle', // idle, playing, paused, buffering, ended
      currentTime: 0,
      duration: 0,
      connectedDevices: 0
    });
  }
  return rooms.get(code);
}

// REST API
app.get('/api/search', async (req, res) => {
  const query = req.query.q || '';
  const category = req.query.category || 'all';
  const pageToken = req.query.pageToken || '';

  if (!query.trim()) {
    return res.json({ results: [], nextPageToken: null });
  }

  try {
    const { results, nextPageToken } = await searchYouTube(query, category, 20, pageToken);
    res.json({ query, category, results, nextPageToken });
  } catch (err) {
    console.error('Search API error:', err);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

app.get('/api/popular', (req, res) => {
  res.json({ popular: POPULAR_KARAOKE });
});

app.get('/api/server-info', (req, res) => {
  let localIp = 'localhost';
  try {
    localIp = ip.address();
  } catch {
    localIp = 'localhost';
  }
  res.json({
    localIp,
    port: PORT,
    localUrl: `http://${localIp}:${PORT}`,
    defaultRoom: 'SING'
  });
});

// Socket.io Real-time handler
io.on('connection', (socket) => {
  let userRoom = null;
  let userRole = null;

  socket.on('join-room', ({ roomId = 'SING', role = 'remote', deviceName = 'Device' }) => {
    const room = getOrCreateRoom(roomId);
    userRoom = room.roomId;
    userRole = role;

    socket.join(`room:${room.roomId}`);
    room.connectedDevices = (io.sockets.adapter.rooms.get(`room:${room.roomId}`) || new Set()).size;

    console.log(`[${role.toUpperCase()}] Connected to room ${room.roomId} (${deviceName})`);

    // Emit current room state to newly joined user
    socket.emit('room-state', room);
    // Broadcast device count
    io.to(`room:${room.roomId}`).emit('devices-count', room.connectedDevices);
  });

  // Add song to queue
  socket.on('queue-add', ({ roomId = 'SING', song, playNext = false, addedBy = 'Remote' }) => {
    const room = getOrCreateRoom(roomId);
    if (!song || !song.id) return;

    const queueItem = {
      ...song,
      idKey: `${song.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      addedBy,
      addedAt: Date.now()
    };

    if (!room.currentSong) {
      // Nothing is playing, start immediately
      room.currentSong = queueItem;
      room.playerState = 'playing';
      room.currentTime = 0;
      io.to(`room:${room.roomId}`).emit('play-song', room.currentSong);
    } else if (playNext) {
      // Insert at the front of queue
      room.queue.unshift(queueItem);
    } else {
      // Append to queue
      room.queue.push(queueItem);
    }

    io.to(`room:${room.roomId}`).emit('room-state', room);
  });

  // Remove song from queue
  socket.on('queue-remove', ({ roomId = 'SING', idKey }) => {
    const room = getOrCreateRoom(roomId);
    room.queue = room.queue.filter((s) => s.idKey !== idKey);
    io.to(`room:${room.roomId}`).emit('room-state', room);
  });

  // Move song up/down in queue
  socket.on('queue-move', ({ roomId = 'SING', idKey, direction }) => {
    const room = getOrCreateRoom(roomId);
    const index = room.queue.findIndex((s) => s.idKey === idKey);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < room.queue.length) {
      const item = room.queue.splice(index, 1)[0];
      room.queue.splice(targetIndex, 0, item);
      io.to(`room:${room.roomId}`).emit('room-state', room);
    }
  });

  // Jump directly to a specific song in queue and play it immediately
  socket.on('play-now', ({ roomId = 'SING', idKey }) => {
    const room = getOrCreateRoom(roomId);
    const index = room.queue.findIndex((s) => s.idKey === idKey);
    if (index === -1) return;

    if (room.currentSong) {
      room.history.unshift(room.currentSong);
      if (room.history.length > 30) room.history.pop();
    }

    const [selectedSong] = room.queue.splice(index, 1);
    room.currentSong = selectedSong;
    room.playerState = 'playing';
    room.currentTime = 0;

    io.to(`room:${room.roomId}`).emit('play-song', room.currentSong);
    io.to(`room:${room.roomId}`).emit('room-state', room);
  });

  // Player controls from Remote (play, pause, skip, restart, seek)
  socket.on('player-control', ({ roomId = 'SING', action, value }) => {
    const room = getOrCreateRoom(roomId);

    if (action === 'skip') {
      if (room.currentSong) {
        room.history.unshift(room.currentSong);
        if (room.history.length > 30) room.history.pop();
      }

      if (room.queue.length > 0) {
        room.currentSong = room.queue.shift();
        room.playerState = 'playing';
        room.currentTime = 0;
        io.to(`room:${room.roomId}`).emit('play-song', room.currentSong);
      } else {
        room.currentSong = null;
        room.playerState = 'idle';
        room.currentTime = 0;
        io.to(`room:${room.roomId}`).emit('play-song', null);
      }
      io.to(`room:${room.roomId}`).emit('room-state', room);
      return;
    }

    // Forward play, pause, restart, seek commands to Screen
    io.to(`room:${room.roomId}`).emit('control-action', { action, value });
  });

  // Screen reporting back its player state (syncing time, play status)
  socket.on('screen-sync', ({ roomId = 'SING', playerState, currentTime, duration }) => {
    const room = getOrCreateRoom(roomId);
    if (playerState !== undefined) room.playerState = playerState;
    if (currentTime !== undefined) room.currentTime = currentTime;
    if (duration !== undefined) room.duration = duration;

    // Send light update to remotes
    socket.to(`room:${room.roomId}`).emit('player-status-update', {
      playerState: room.playerState,
      currentTime: room.currentTime,
      duration: room.duration
    });
  });

  // Video finished playing on Screen
  socket.on('song-ended', ({ roomId = 'SING' }) => {
    const room = getOrCreateRoom(roomId);
    if (room.currentSong) {
      room.history.unshift(room.currentSong);
      if (room.history.length > 30) room.history.pop();
    }

    if (room.queue.length > 0) {
      room.currentSong = room.queue.shift();
      room.playerState = 'playing';
      room.currentTime = 0;
      io.to(`room:${room.roomId}`).emit('play-song', room.currentSong);
    } else {
      room.currentSong = null;
      room.playerState = 'idle';
      room.currentTime = 0;
      io.to(`room:${room.roomId}`).emit('play-song', null);
    }

    io.to(`room:${room.roomId}`).emit('room-state', room);
  });

  socket.on('disconnect', () => {
    if (userRoom && rooms.has(userRoom)) {
      const room = rooms.get(userRoom);
      room.connectedDevices = (io.sockets.adapter.rooms.get(`room:${userRoom}`) || new Set()).size;
      io.to(`room:${userRoom}`).emit('devices-count', room.connectedDevices);
    }
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(rootDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    let localIp = 'localhost';
    try {
      localIp = ip.address();
    } catch {}

    console.log(`\n======================================================`);
    console.log(`🎤 PARTY KARAOKE SERVER RUNNING!`);
    console.log(`------------------------------------------------------`);
    console.log(`💻 Local computer: http://localhost:${PORT}`);
    console.log(`📱 Phones on WiFi: http://${localIp}:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer();

