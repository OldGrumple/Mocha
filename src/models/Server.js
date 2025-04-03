const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    nodeId: {
        type: String,
        ref: 'Node',
        required: true
    },
    instanceId: {
        type: String,
        unique: true,
        sparse: true
    },
    minecraftVersion: {
        type: String,
        required: true
    },
    serverType: {
        type: String,
        enum: ['vanilla', 'paper', 'spigot', 'forge', 'fabric'],
        default: 'vanilla',
        required: true
    },
    status: {
        type: String,
        enum: [
            'creating',
            'provisioning',
            'provisioning_setup',
            'provisioning_download',
            'provisioning_config',
            'provisioned',
            'starting',
            'running',
            'stopping',
            'stopped',
            'failed',
            'deleting',
            'jar_swap_in_progress'
        ],
        default: 'provisioning'
    },
    statusMessage: {
        type: String,
        default: 'Initializing server...'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    playerCount: {
        type: Number,
        default: 0
    },
    config: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServerConfig'
    },
    logs: [{
        timestamp: { type: Date, default: Date.now },
        level: { type: String, enum: ['info', 'error', 'warn'], default: 'info' },
        message: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const Server = mongoose.model('Server', serverSchema);

module.exports = Server;