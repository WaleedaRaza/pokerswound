/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@entropoker/game-engine', '@entropoker/entropy-core'],
}

module.exports = nextConfig 