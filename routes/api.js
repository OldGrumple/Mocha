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
        // Update status of nodes that haven't sent heartbeats
        await Node.updateOfflineNodes();
        
        const nodes = await Node.find().select('-certificate.privateKey');
        res.json({nodes});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/nodes/:id', async (req, res) => {
    try {
        // Update status of nodes that haven't sent heartbeats
        await Node.updateOfflineNodes();
        
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
        console.log('Received server creation request:', req.body);

        // Get all available nodes first
        const nodes = await Node.find({ status: 'online' });
        console.log('Found online nodes:', nodes.length);
        
        if (nodes.length === 0) {
            throw new Error('No available nodes found');
        }

        // Select the first online node
        const selectedNode = nodes[0];
        console.log('Selected node for provisioning:', selectedNode._id);

        // Create server in database first
        const newServer = new Server({
            _id: req.body._id,
            name: req.body.name,
            minecraftVersion: req.body.minecraftVersion,
            serverType: req.body.serverType,
            nodeId: selectedNode._id
        });
        await newServer.save();
        console.log('Created server in database:', newServer._id);

        const config = new ServerConfig({
            serverId: newServer._id,
            serverName: req.body.name,
            serverType: req.body.serverType,
            maxPlayers: req.body.maxPlayers || 20,
            difficulty: req.body.difficulty || 'normal',
            gameMode: req.body.gameMode || 'survival',
            viewDistance: req.body.viewDistance || 10,
            spawnProtection: req.body.spawnProtection || 16,
            seed: req.body.seed || '',
            worldType: req.body.worldType || 'default',
            generateStructures: req.body.generateStructures !== false,
            memory: req.body.memory || 2,
            port: req.body.port || 25565
          });
          await config.save();
          console.log('Created server configuration:', config);
          
          // ✅ NOW it's safe to use `config`
          const serverConfig = {
            name: newServer.name,
            minecraftVersion: newServer.minecraftVersion,
            nodeId: selectedNode._id,
            serverId: newServer._id.toString(),
            apiKey: selectedNode.apiKey,
            plugins: req.body.plugins || [],
            serverType: config.serverType,
            memory: config.memory,
            difficulty: config.difficulty,
            gameMode: config.gameMode,
            maxPlayers: config.maxPlayers,
            port: config.port,
            viewDistance: config.viewDistance,
            spawnProtection: config.spawnProtection,
            seed: config.seed,
            worldType: config.worldType,
            generateStructures: config.generateStructures
          };

        await config.save();
        console.log('Created server configuration:', config);

        // Update server with config reference
        newServer.config = config._id;
        await newServer.save();

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            selectedNode.address = 'localhost:50051';
        }

        console.log('Creating gRPC client for node:', selectedNode.address);
        const grpcClient = new GRPCAgentService(selectedNode);


        console.log('Sending provisioning request to agent:', serverConfig);

        const provisionResponse = await grpcClient.provisionServer(serverConfig);
        console.log('Received provisioning response:', provisionResponse);
        
        // Update server with instance ID from gRPC response
        if (!provisionResponse.instanceId) {
            throw new Error('No instanceId received from gRPC server');
        }
        
        newServer.instanceId = provisionResponse.instanceId;
        await newServer.save();
        console.log('Updated server with instance ID:', newServer.instanceId);

        // Return the updated server with instanceId
        res.json({newServer});
    } catch (error) {
        console.error('Error in server creation:', error);
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

router.get('/servers/:id', async (req, res) => {
    try {
      const server = await Server.findById(req.params.id).lean();
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
  
      res.json({ server });
    } catch (err) {
      console.error('Error fetching server:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

router.delete('/servers/:id', async (req, res) => {
    try {
        // Get the server with populated nodeId
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

        console.log('Deleting server:', {
            serverId: server._id,
            instanceId: server.instanceId,
            nodeId: node._id,
            server: server.toObject()
        });

        // If server has no instanceId, try to use serverId as instanceId
        const instanceId = server.instanceId || server._id.toString();
        console.log('Using instanceId for deletion:', instanceId);

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.deleteServer(instanceId);
        await server.deleteOne();

        res.json({ message: 'Server deleted successfully' });
    } catch (error) {
        console.error('Error deleting server:', error);
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
        let node = await Node.findById(req.params.id);
        
        // If node doesn't exist, create it
        if (!node) {
            node = new Node({
                _id: req.params.id,
                name: req.params.id,
                address: req.body.address || 'localhost:50051',
                status: 'offline'
            });

            // If API key is provided, use it; otherwise generate a new one
            if (req.body.apiKey) {
                node.apiKey = req.body.apiKey;
            } else {
                node.generateNewApiKey();
            }
        }

        const { lastSeen, metrics } = req.body;
        
        // Validate metrics
        if (!metrics || typeof metrics !== 'object') {
            return res.status(400).json({ error: 'Invalid metrics data' });
        }

        // Update node status and metrics
        node.lastSeen = new Date(lastSeen * 1000);
        node.metrics = {
            cpuUsage: Number(metrics.cpuUsage),
            cpuCores: Number(metrics.cpuCores || 1),
            memoryUsed: Number(metrics.memoryUsed),
            memoryTotal: Number(metrics.memoryTotal),
            diskUsage: Number(metrics.diskUsage),
            networkBytesIn: Number(metrics.networkBytesIn),
            networkBytesOut: Number(metrics.networkBytesOut)
        };
        node.status = 'online';
        
        await node.save();

        // Update status of nodes that haven't sent heartbeats
        await Node.updateOfflineNodes();

        res.json({ message: 'Node status updated successfully' });
    } catch (error) {
        console.error('Error updating node status:', error);
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

        const { status, playerCount, message, progress } = req.body;
        
        // Update server status
        server.status = status;
        if (typeof playerCount !== 'undefined') {
            server.playerCount = playerCount;
        }
        if (message) {
            server.statusMessage = message;
        }
        if (typeof progress !== 'undefined') {
            server.progress = progress;
        }
        
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