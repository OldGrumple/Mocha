const mongoose = require('mongoose')

const minecraftCacheSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['vanilla', 'paper', 'spigot', 'forge', 'fabric']
  },
  version: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  downloadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  downloadCount: {
    type: Number,
    default: 0
  }
})

// Compound index to ensure unique type-version combinations
minecraftCacheSchema.index({ type: 1, version: 1 }, { unique: true })

// Method to update last accessed time
minecraftCacheSchema.methods.updateLastAccessed = async function() {
  this.lastAccessed = new Date()
  this.downloadCount += 1
  return this.save()
}

const MinecraftCache = mongoose.model('MinecraftCache', minecraftCacheSchema)

module.exports = MinecraftCache 