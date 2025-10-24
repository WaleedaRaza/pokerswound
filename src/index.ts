const dotenv = require('dotenv');
const { app } = require('./app');

// Load environment variables
dotenv.config();

const PORT = process.env['PORT'] || 3000;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Poker Engine server running on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📊 Environment: ${process.env['NODE_ENV'] || 'development'}`);
});

const { initWs } = require('./websocket/server');
initWs(server);
