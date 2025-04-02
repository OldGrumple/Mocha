const mongoose = require('mongoose')

const serverConfigSchema = new mongoose.Schema({
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
    unique: true
  },
  // Basic Settings
  serverName: {
    type: String,
    required: true,
    default: 'Minecraft Server'
  },
  serverType: {
    type: String,
    enum: ['vanilla', 'paper', 'spigot', 'forge', 'fabric'],
    default: 'vanilla',
    required: true
  },
  maxPlayers: {
    type: Number,
    required: true,
    default: 20,
    min: 1
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['peaceful', 'easy', 'normal', 'hard'],
    default: 'normal'
  },
  gameMode: {
    type: String,
    required: true,
    enum: ['survival', 'creative', 'adventure', 'spectator'],
    default: 'survival'
  },
  // Advanced Settings
  memory: {
    type: Number,
    required: true,
    default: 2,
    min: 1
  },
  port: {
    type: Number,
    required: true,
    default: 25565,
    min: 1,
    max: 65535
  },
  viewDistance: {
    type: Number,
    required: true,
    default: 10,
    min: 3,
    max: 32
  },
  spawnProtection: {
    type: Number,
    required: true,
    default: 16,
    min: 0
  },
  // World Settings
  seed: {
    type: String,
    default: ''
  },
  worldType: {
    type: String,
    required: true,
    enum: ['default', 'flat', 'large_biomes', 'amplified', 'single_biome_surface'],
    default: 'default'
  },
  generateStructures: {
    type: Boolean,
    required: true,
    default: true
  },
  // Performance Settings
  maxTickTime: {
    type: Number,
    default: 60000,
    min: 0
  },
  // Network Settings
  onlineMode: {
    type: Boolean,
    default: true
  },
  whiteList: {
    type: Boolean,
    default: false
  },
  // Gameplay Settings
  pvp: {
    type: Boolean,
    default: true
  },
  allowFlight: {
    type: Boolean,
    default: false
  },
  allowNether: {
    type: Boolean,
    default: true
  },
  enableCommandBlock: {
    type: Boolean,
    default: true
  },
  // Additional Settings
  motd: {
    type: String,
    default: 'Welcome to your Minecraft server!'
  },
  enableQuery: {
    type: Boolean,
    default: true
  },
  queryPort: {
    type: Number,
    default: 25565,
    min: 1,
    max: 65535
  },
  enableRcon: {
    type: Boolean,
    default: false
  },
  rconPort: {
    type: Number,
    default: 25575,
    min: 1,
    max: 65535
  },
  rconPassword: {
    type: String,
    default: ''
  },
  opPermissionLevel: {
    type: Number,
    default: 4,
    min: 1,
    max: 4
  },
  functionPermissionLevel: {
    type: Number,
    default: 2,
    min: 1,
    max: 4
  },
  forceGamemode: {
    type: Boolean,
    default: false
  },
  hardcore: {
    type: Boolean,
    default: false
  },
  hideOnlinePlayers: {
    type: Boolean,
    default: false
  },
  broadcastConsoleToOps: {
    type: Boolean,
    default: true
  },
  broadcastRconToOps: {
    type: Boolean,
    default: true
  },
  enableJmxMonitoring: {
    type: Boolean,
    default: false
  },
  enableStatus: {
    type: Boolean,
    default: true
  },
  enforceSecureProfile: {
    type: Boolean,
    default: true
  },
  entityBroadcastRangePercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  maxChainedNeighborUpdates: {
    type: Number,
    default: 1000000,
    min: 0
  },
  maxWorldSize: {
    type: Number,
    default: 29999984,
    min: 1
  },
  networkCompressionThreshold: {
    type: Number,
    default: 256,
    min: 0
  },
  pauseWhenEmpty: {
    type: Number,
    default: 60,
    min: 0
  },
  playerIdleTimeout: {
    type: Number,
    default: 0,
    min: 0
  },
  preventProxyConnections: {
    type: Boolean,
    default: false
  },
  rateLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  regionFileCompression: {
    type: String,
    enum: ['deflate', 'none'],
    default: 'deflate'
  },
  requireResourcePack: {
    type: Boolean,
    default: false
  },
  resourcePack: {
    type: String,
    default: ''
  },
  resourcePackId: {
    type: String,
    default: ''
  },
  resourcePackPrompt: {
    type: String,
    default: ''
  },
  resourcePackSha1: {
    type: String,
    default: ''
  },
  serverIp: {
    type: String,
    default: ''
  },
  simulationDistance: {
    type: Number,
    default: 10,
    min: 3,
    max: 32
  },
  spawnMonsters: {
    type: Boolean,
    default: true
  },
  syncChunkWrites: {
    type: Boolean,
    default: true
  },
  textFilteringConfig: {
    type: String,
    default: ''
  },
  textFilteringVersion: {
    type: Number,
    default: 0,
    min: 0
  },
  useNativeTransport: {
    type: Boolean,
    default: true
  },
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Update lastUpdated timestamp before saving
serverConfigSchema.pre('save', function(next) {
  this.lastUpdated = new Date()
  next()
})

const ServerConfig = mongoose.model('ServerConfig', serverConfigSchema)

module.exports = ServerConfig 