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
    status: {
        type: String,
        enum: ['provisioning', 'running', 'stopped', 'error'],
        default: 'provisioning'
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