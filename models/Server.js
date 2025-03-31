const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', required: true },
    minecraftVersion: { type: String, required: true },
    plugins: [{ name: String, version: String }],
    status: { type: String, default: 'stopped' },
    instanceId: { type: String },
    createdAt: { type: Date, default: Date.now }
  });

module.exports = mongoose.model('Server', ServerSchema);