const express = require('express');
const { Server: IOServer } = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: 'http://localhost:3000', // Your Next.js app's origin
    methods: ['GET', 'POST'],
  },
  path: "/socket",  // Set the path explicitly
  // transports: ['polling', 'websocket'],
});

const games = {};

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
  });

  // Create a game room
  socket.on('createGame', (gameCode, isSynonym) => {
    socket.join(gameCode);
    games[gameCode] = { gameCode, player1: isSynonym, player2: !isSynonym };
    console.log(`Game room ${gameCode} created by ${socket.id}`);
    socket.emit('gameCreated', gameCode);
  });

  // Join an existing game room
  socket.on('joinGame', (gameCode) => {
    const room = io.sockets.adapter.rooms.get(gameCode);
    if (room && room.size === 1) {
      socket.join(gameCode);
      console.log(`${socket.id} joined game room ${gameCode}`);
      socket.emit('gameJoined', gameCode, games[gameCode].player2);
      io.to(gameCode).emit('startGame');  // Notify both players to start the game
    } else {
      socket.emit('error', 'Game room not available or already full');
    }
  });

  socket.on('opponentAction', (gameCode, data, playerNumber) => {
    socket.to(gameCode).emit('opponentAction', data, playerNumber);
  });

  socket.on('leave', (gameCode) => {
    console.log("Player left > socket.id:", socket.id);
    socket.leave(gameCode);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 9090;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
