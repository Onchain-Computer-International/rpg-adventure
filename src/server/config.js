export const SERVER_CONFIG = {
  port: process.env.PORT || 3000,
  worldSize: {
    width: 100,
    height: 100
  },
  chunkSize: 16,
  maxPlayersPerChunk: 50,
  tickRate: 20, // Server updates per second
  saveInterval: 300000, // Save world state every 5 minutes
}; 