const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Node = require('../models/Node');
const ServerConfig = require('../models/ServerConfig');
const GRPCAgentService = require('../services/grpcAgentService');
const minecraftService = require('../services/minecraftService');

// Node Routes
router.get('/nodes', async (req, res) => {
    try {
        const nodes = await Node.find().select('-certificate.privateKey');
        res.json({nodes});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/nodes/:id', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id).select('-certificate.privateKey');
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }
        res.json({ node });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/nodes', async (req, res) => {
    try {
        const newNode = new Node(req.body);
        await newNode.generateCertificatePair();
        await newNode.save();
        
        // Return node without private key
        const nodeResponse = newNode.toObject();
        delete nodeResponse.certificate.privateKey;
        res.json({node: nodeResponse});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/nodes/:id/generate-api-key', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        const newApiKey = node.generateNewApiKey();
        await node.save();
        
        res.json({ apiKey: newApiKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/nodes/:id/regenerate-certificates', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        const certificates = node.generateCertificatePair();
        await node.save();
        
        // Return certificates without private key
        const response = {
            publicKey: certificates.publicKey,
            generatedAt: certificates.generatedAt
        };
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/nodes/:id', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        // Check if there are any servers associated with this node
        const servers = await Server.find({ nodeId: node._id });
        if (servers.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete node with associated servers. Please delete all servers first.' 
            });
        }

        await node.deleteOne();
        res.json({ message: 'Node deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Server Routes
router.get('/servers', async (req, res) => {
    try {
        const servers = await Server.find().populate('nodeId', 'name address');
        res.json({servers});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/servers', async (req, res) => {
    try {
        // Create server in database
        const newServer = new Server(req.body);
        await newServer.save();

        // Get all available nodes
        const nodes = await Node.find({ status: 'online' });
        if (nodes.length === 0) {
            throw new Error('No available nodes found');
        }

        // Find a node with sufficient resources
        let selectedNode = null;
        for (const node of nodes) {
            // Default resource requirements (can be customized based on server type)
            const requiredMemory = 2048 * 1024 * 1024; // 2GB
            const requiredCpu = 50; // 50% CPU

            if (node.hasEnoughResources(requiredMemory, requiredCpu)) {
                selectedNode = node;
                break;
            }
        }

        if (!selectedNode) {
            throw new Error('No nodes have sufficient resources');
        }

        // Update server with selected node
        newServer.nodeId = selectedNode._id;
        await newServer.save();

        // Get or create server configuration
        let config = await ServerConfig.findOne({ serverId: newServer._id });
        if (!config) {
            config = new ServerConfig({
                serverId: newServer._id,
                serverName: newServer.name
            });
            await config.save();
        }

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            selectedNode.address = 'localhost:50051';
        }

        const grpcClient = new GRPCAgentService(selectedNode);

        // Provision server using gRPC
        const serverConfig = {
            name: newServer.name,
            minecraftVersion: newServer.minecraftVersion,
            config: config.toObject()
        };

        const provisionResponse = await grpcClient.provisionServer(serverConfig);
        
        // Update server with instance ID from gRPC response
        newServer.instanceId = provisionResponse.instanceId;
        await newServer.save();

        res.json({newServer});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/servers/:id/start', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id).populate('nodeId');
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Get the full node document with certificate information
        const node = await Node.findById(server.nodeId._id);
        if (!node) {
            return res.status(404).json({ error: 'Associated node not found' });
        }

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.startServer(server.instanceId);
        
        server.status = 'running';
        await server.save();

        res.json({ server });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/servers/:id/stop', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id).populate('nodeId');
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Get the full node document with certificate information
        const node = await Node.findById(server.nodeId._id);
        if (!node) {
            return res.status(404).json({ error: 'Associated node not found' });
        }

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.stopServer(server.instanceId);
        
        server.status = 'stopped';
        await server.save();

        res.json({ server });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/servers/:id', async (req, res) => {
    try {
        // First get the server without populating nodeId to get the raw nodeId
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Get the full node document with certificate information
        const node = await Node.findById(server.nodeId);
        if (!node) {
            return res.status(404).json({ error: 'Associated node not found' });
        }

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.deleteServer(server.instanceId);
        await server.deleteOne();

        res.json({ message: 'Server deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/servers/:id/status', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id).populate('nodeId');
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const grpcClient = new GRPCAgentService(server.nodeId);
        const status = await grpcClient.getServerStatus(server.instanceId);
        res.json({ status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Server Configuration Routes
router.get('/servers/:id/config', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        let config = await ServerConfig.findOne({ serverId: server._id });
        
        // If no config exists, create a default one
        if (!config) {
            config = new ServerConfig({
                serverId: server._id,
                serverName: server.name
            });
            await config.save();
        }

        res.json(config);
    } catch (error) {
        console.error('Error fetching server config:', error);
        res.status(500).json({ error: 'Failed to fetch server configuration' });
    }
});

router.put('/servers/:id/config', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Find existing config or create new one
        let config = await ServerConfig.findOne({ serverId: server._id });
        if (!config) {
            config = new ServerConfig({
                serverId: server._id,
                serverName: server.name
            });
        }

        // Update config with new values
        Object.assign(config, req.body);
        await config.save();

        res.json(config);
    } catch (error) {
        console.error('Error updating server config:', error);
        res.status(500).json({ error: 'Failed to update server configuration' });
    }
});

// Minecraft Routes
router.get('/minecraft/types', async (req, res) => {
    try {
        const types = await minecraftService.getServerTypes();
        res.json(types);
    } catch (error) {
        console.error('Error fetching server types:', error);
        res.status(500).json({ error: 'Failed to fetch server types' });
    }
});

router.get('/minecraft/versions/:type', async (req, res) => {
    try {
        const versions = await minecraftService.getVersions(req.params.type);
        res.json(versions);
    } catch (error) {
        console.error('Error fetching versions:', error);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});

router.post('/minecraft/download', async (req, res) => {
    try {
        const { type, version } = req.body;
        const filePath = await minecraftService.downloadServer(type, version);
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading server:', error);
        res.status(500).json({ error: 'Failed to download server' });
    }
});

// Add OPTIONS handler for the download endpoint
router.options('/minecraft/download', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

// Minecraft Cache Management Routes
router.get('/minecraft/cache', async (req, res) => {
    try {
        const cacheContents = await minecraftService.getCacheContents();
        res.json(cacheContents);
    } catch (error) {
        console.error('Error fetching cache contents:', error);
        res.status(500).json({ error: 'Failed to fetch cache contents' });
    }
});

router.delete('/minecraft/cache/:type/:version', async (req, res) => {
    try {
        await minecraftService.removeFromCache(req.params.type, req.params.version);
        res.json({ message: 'Cache entry removed successfully' });
    } catch (error) {
        console.error('Error removing from cache:', error);
        res.status(500).json({ error: 'Failed to remove from cache' });
    }
});

router.post('/minecraft/cache/clear', async (req, res) => {
    try {
        await minecraftService.clearCache();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// Node Status Routes
router.put('/nodes/:id/status', async (req, res) => {
    try {
        console.log('Received node status update request:', {
            nodeId: req.params.id,
            body: req.body
        });

        let node = await Node.findById(req.params.id);
        
        // If node doesn't exist, create it
        if (!node) {
            console.log('Node not found, creating new node:', req.params.id);
            node = new Node({
                _id: req.params.id,
                name: req.params.id,
                address: req.body.address || 'localhost:50051',
                status: 'offline'
            });
            await node.save();
        }

        const { lastSeen, metrics } = req.body;
        
        // Validate metrics
        if (!metrics || typeof metrics !== 'object') {
            console.error('Invalid metrics data received:', metrics);
            return res.status(400).json({ error: 'Invalid metrics data' });
        }

        console.log('Updating node metrics:', {
            nodeId: node._id,
            metrics: metrics
        });

        // Update node status
        node.lastSeen = new Date(lastSeen);
        node.metrics = {
            cpuUsage: Number(metrics.cpuUsage),
            memoryUsed: Number(metrics.memoryUsed),
            memoryTotal: Number(metrics.memoryTotal),
            diskUsage: Number(metrics.diskUsage),
            networkBytesIn: Number(metrics.networkBytesIn),
            networkBytesOut: Number(metrics.networkBytesOut)
        };
        node.status = 'online';
        
        await node.save();
        console.log('Node status updated successfully:', node._id);
        res.json({ message: 'Node status updated successfully' });
    } catch (error) {
        console.error('Error updating node status:', {
            error: error.message,
            stack: error.stack,
            nodeId: req.params.id,
            body: req.body
        });
        res.status(500).json({ error: 'Failed to update node status', details: error.message });
    }
});

// Server Status Routes
router.put('/servers/:id/status', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { status, playerCount } = req.body;
        
        // Update server status
        server.status = status;
        server.playerCount = playerCount;
        
        await server.save();
        res.json({ message: 'Server status updated successfully' });
    } catch (error) {
        console.error('Error updating server status:', error);
        res.status(500).json({ error: 'Failed to update server status' });
    }
});

// Node Servers Route
router.get('/nodes/:id/servers', async (req, res) => {
    try {
        const servers = await Server.find({ nodeId: req.params.id });
        res.json({ servers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;