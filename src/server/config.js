export const SERVER_CONFIG = {
  port: process.env.PORT || 3000,
  worldSize: {
    width: 1000,
    height: 1000
  },
  chunkSize: 100,
  maxPlayersPerChunk: 50,
  tickRate: 20, // Server updates per second
  saveInterval: 300000, // Save world state every 5 minutes
}; 