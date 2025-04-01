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
    enum: ['default', 'flat', 'large_biomes', 'amplified'],
    default: 'default'
  },
  generateStructures: {
    type: Boolean,
    required: true,
    default: true
  },
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
})

// Update lastUpdated timestamp before saving
serverConfigSchema.pre('save', function(next) {
  this.lastUpdated = new Date()
  next()
})

const ServerConfig = mongoose.model('ServerConfig', serverConfigSchema)

module.exports = ServerConfig 