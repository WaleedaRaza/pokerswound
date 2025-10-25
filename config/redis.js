// Redis Client Configuration for Session Management & Horizontal Scaling
const Redis = require('ioredis');

// Parse Redis connection from Upstash URL
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// Extract connection details from Upstash REST URL
// Format: https://tender-ladybug-27464.upstash.io
const redisHost = REDIS_URL.replace('https://', '').replace('http://', '');
const redisPassword = REDIS_TOKEN;

let redisClient = null;
let redisSubscriber = null;

function createRedisClient(isSubscriber = false) {
  const config = {
    host: redisHost,
    port: 6379,
    password: redisPassword,
    tls: {
      rejectUnauthorized: false
    },
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
    lazyConnect: false,
  };

  const client = new Redis(config);

  client.on('connect', () => {
    console.log(`✅ Redis ${isSubscriber ? 'subscriber' : 'client'} connecting...`);
  });

  client.on('ready', () => {
    console.log(`✅ Redis ${isSubscriber ? 'subscriber' : 'client'} ready`);
  });

  client.on('error', (err) => {
    console.error(`❌ Redis ${isSubscriber ? 'subscriber' : 'client'} error:`, err.message);
  });

  client.on('close', () => {
    console.warn(`⚠️  Redis ${isSubscriber ? 'subscriber' : 'client'} connection closed`);
  });

  return client;
}

async function initializeRedis() {
  try {
    if (!redisHost || !redisPassword) {
      throw new Error('Redis configuration missing: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
    }

    // Create main client for commands
    redisClient = createRedisClient(false);
    
    // Create subscriber client for pub/sub (Socket.IO adapter)
    redisSubscriber = createRedisClient(true);

    // Test connection
    await redisClient.ping();
    console.log('✅ Redis PING successful');

    return { client: redisClient, subscriber: redisSubscriber };
  } catch (error) {
    console.error('❌ Redis initialization failed:', error.message);
    throw error;
  }
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

function getRedisSubscriber() {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized. Call initializeRedis() first.');
  }
  return redisSubscriber;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
  console.log('✅ Redis connections closed');
}

module.exports = {
  initializeRedis,
  getRedisClient,
  getRedisSubscriber,
  closeRedis
};

