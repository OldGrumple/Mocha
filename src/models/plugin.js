const mongoose = require('mongoose');

const pluginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  spigetId: {
    type: Number,
    required: true,
    unique: true
  },
  version: {
    type: String,
    required: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'installing', 'installed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add index for faster lookups
pluginSchema.index({ spigetId: 1, serverId: 1 }, { unique: true });

// Add methods to check if plugin is installed
pluginSchema.statics.isInstalled = async function(spigetId, serverId) {
  const plugin = await this.findOne({ spigetId, serverId });
  return !!plugin;
};

const Plugin = mongoose.model('Plugin', pluginSchema);

module.exports = { Plugin }; 