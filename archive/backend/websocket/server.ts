
let ioRef = null;

function initWs(httpServer) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    path: '/ws',
    cors: { origin: process.env['CORS_ORIGIN'] || 'http://localhost:3001' },
  });
  ioRef = io;

  io.on('connection', (socket) => {
    socket.on('join', (room) => {
      socket.join(room);
      socket.emit('joined', room);
    });
  });

  return io;
}

function getIo() {
  if (!ioRef) throw new Error('WebSocket server not initialized');
  return ioRef;
}

module.exports = { initWs, getIo };
