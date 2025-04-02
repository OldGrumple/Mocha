const mongoose = require('mongoose');
const crypto = require('crypto');

const nodeSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['offline', 'online', 'error'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    metrics: {
        cpuUsage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        cpuCores: {
            type: Number,
            min: 1,
            default: 1
        },
        memoryUsed: {
            type: Number,
            min: 0,
            default: 0
        },
        memoryTotal: {
            type: Number,
            min: 0,
            default: 0
        },
        diskUsage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        networkBytesIn: {
            type: Number,
            min: 0,
            default: 0
        },
        networkBytesOut: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    certificate: {
        publicKey: String,
        privateKey: String,
        generatedAt: Date
    },
    apiKey: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

// Generate a new API key
nodeSchema.methods.generateNewApiKey = function() {
    this.apiKey = crypto.randomBytes(32).toString('hex');
    return this.apiKey;
};

// Generate certificate pair
nodeSchema.methods.generateCertificatePair = function() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    this.certificate = {
        publicKey,
        privateKey,
        generatedAt: new Date()
    };

    return this.certificate;
};

// Check if node has enough resources for a server
nodeSchema.methods.hasEnoughResources = function(requiredMemory, requiredCpu) {
    // If node is offline, it can't host servers
    if (this.status !== 'online') {
        return false;
    }

    // Check if node has been seen recently (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (this.lastSeen < fiveMinutesAgo) {
        return false;
    }

    return true;
};

// Get resource utilization percentage
nodeSchema.methods.getResourceUtilization = function() {
    return {
        cpu: this.metrics.cpuUsage,
        memory: (this.metrics.memoryUsed / this.metrics.memoryTotal) * 100,
        disk: this.metrics.diskUsage
    };
};

// Static method to update offline nodes
nodeSchema.statics.updateOfflineNodes = async function() {
    const offlineThreshold = new Date(Date.now() - 60000); // 60 seconds
    const result = await this.updateMany(
        { 
            lastSeen: { $lt: offlineThreshold },
            status: { $ne: 'offline' }
        },
        { 
            status: 'offline'
        }
    );
    
    if (result.modifiedCount > 0) {
        console.log(`Marked ${result.modifiedCount} nodes as offline`);
    }
};

// Instance method to check if node is offline
nodeSchema.methods.isOffline = function() {
    const offlineThreshold = new Date(Date.now() - 60000); // 60 seconds
    return this.lastSeen < offlineThreshold;
};

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;