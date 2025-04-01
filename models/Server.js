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
            'provisioning',
            'provisioning_setup',
            'provisioning_download',
            'provisioning_config',
            'provisioned',
            'running',
            'stopped',
            'failed',
            'deleting'
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
    }
}, {
    timestamps: true
});

const Server = mongoose.model('Server', serverSchema);

module.exports = Server;