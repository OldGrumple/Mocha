const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Node = require('../models/Node');
const ServerConfig = require('../models/ServerConfig');
const GRPCAgentService = require('../services/grpcAgentService');
const minecraftService = require('../services/minecraftService');
const { generateServerProperties } = require('../services/serverConfigUtils');
const {
    getBannedIPs,
    addBannedIP,
    removeBannedIP,
    getBannedPlayers,
    addBannedPlayer,
    removeBannedPlayer,
    getOperators,
    addOperator,
    removeOperator,
    getWhitelist,
    addToWhitelist,
    removeFromWhitelist
} = require('../services/serverConfigFiles');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;

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

        // Update agent's credentials
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }
        const grpcClient = new GRPCAgentService(node);
        await grpcClient.updateCredentials(newApiKey, node.certificate);
        
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
        
        // Update agent's credentials
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }
        const grpcClient = new GRPCAgentService(node);
        await grpcClient.updateCredentials(node.apiKey, certificates);
        
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
            server_id: newServer._id.toString(),
            minecraft_version: newServer.minecraftVersion,
            config: {
              server_name: newServer.name,
              server_type: config.serverType,
              max_players: config.maxPlayers || 20,
              difficulty: config.difficulty || 'normal',
              game_mode: config.gameMode || 'survival',
              view_distance: config.viewDistance || 10,
              spawn_protection: config.spawnProtection || 16,
              seed: config.seed || '',
              world_type: config.worldType || 'default',
              generate_structures: config.generateStructures !== false,
              memory: config.memory || 2,
              port: config.port || 25565
            },
            plugins: req.body.plugins || []
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

        // If server is not provisioned, provision it first
        if (!server.instanceId) {
            console.log('Server not provisioned, provisioning first...');
            const grpcClient = new GRPCAgentService(node);
            const serverConfig = {
                name: server.name,
                minecraftVersion: server.minecraftVersion,
                nodeId: node._id,
                serverId: server._id.toString(),
                apiKey: node.apiKey,
                serverType: server.serverType
            };

            const provisionResponse = await grpcClient.provisionServer(serverConfig);
            if (!provisionResponse.instanceId) {
                throw new Error('No instanceId received from gRPC server');
            }
            
            server.instanceId = provisionResponse.instanceId;
            await server.save();
            console.log('Server provisioned with instance ID:', server.instanceId);
        }

        // Update server status to starting
        server.status = 'starting';
        server.statusMessage = 'Starting server...';
        await server.save();

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.startServer(server.instanceId);
        
        // Note: The actual running status will be updated by the agent's status updates
        res.json({ server });
    } catch (error) {
        console.error('Error starting server:', error);
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

        // Update server status to stopping
        server.status = 'stopping';
        server.statusMessage = 'Stopping server...';
        await server.save();

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.stopServer(server.instanceId);
        
        // Note: The actual stopped status will be updated by the agent's status updates
        res.json({ server });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/servers/:id/restart', async (req, res) => {
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

        // Update server status to stopping
        server.status = 'stopping';
        server.statusMessage = 'Restarting server...';
        await server.save();

        const grpcClient = new GRPCAgentService(node);
        await grpcClient.stopServer(server.instanceId);
        
        // Wait for a moment to ensure the server has stopped
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update status to starting
        server.status = 'starting';
        server.statusMessage = 'Starting server...';
        await server.save();
        
        await grpcClient.startServer(server.instanceId);
        
        // Note: The actual running status will be updated by the agent's status updates
        res.json({ server });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/servers/:id', async (req, res) => {
    try {
      const server = await Server.findById(req.params.id)
        .populate('nodeId', 'name address status')
        .populate('config')
        .lean();
      
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Ensure all required fields are present
      const serverResponse = {
        ...server,
        status: server.status || 'unknown',
        statusMessage: server.statusMessage || 'Initializing server...',
        progress: server.progress || 0,
        playerCount: server.playerCount || 0,
        config: server.config || {
          serverName: server.name,
          maxPlayers: 20,
          difficulty: 'normal',
          gameMode: 'survival',
          viewDistance: 10,
          spawnProtection: 16,
          memory: 2
        }
      };
  
      res.json({ server: serverResponse });
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
        const server = await Server.findById(req.params.id)
            .populate('nodeId', 'name address status')
            .populate('config')
            .lean();
            
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Get the latest status from the gRPC server
        const grpcClient = new GRPCAgentService(server.nodeId);
        const status = await grpcClient.getServerStatus(server.instanceId);

        // Combine the status information
        const serverStatus = {
            ...status,
            progress: server.progress || 0,
            statusMessage: server.statusMessage || status.message,
            status: server.status || status.status,
            playerCount: server.playerCount || 0,
            config: server.config || {}
        };

        res.json({ status: serverStatus });
    } catch (error) {
        console.error('Error getting server status:', error);
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

        // Update the configuration in the database
        const config = await ServerConfig.findOneAndUpdate(
            { serverId: server._id },
            { $set: req.body },
            { new: true, upsert: true }
        );

        // Get the server directory
        const serverDir = path.join(__dirname, '../servers', server._id.toString());

        // Generate new server.properties file
        await generateServerProperties(config, serverDir);

        // If the server is running, we need to restart it to apply the changes
        if (server.status === 'running') {
            // Update server status to indicate restart
            server.status = 'stopping';
            server.statusMessage = 'Restarting server to apply configuration changes...';
            await server.save();

            // Stop the server
            const grpcClient = new GRPCAgentService(node);
            await grpcClient.stopServer(server.instanceId);

            // Wait for a moment to ensure the server has stopped
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update status to starting
            server.status = 'starting';
            server.statusMessage = 'Starting server with new configuration...';
            await server.save();

            // Start the server
            await grpcClient.startServer(server.instanceId);
        }

        res.json(config);
    } catch (error) {
        console.error('Error updating server config:', error);
        res.status(500).json({ error: 'Failed to update server configuration' });
    }
});

// Server Configuration Files Routes
router.get('/servers/:id/config/banned-ips.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const bannedIPs = await getBannedIPs(server._id);
        res.json(bannedIPs);
    } catch (error) {
        console.error('Error fetching banned IPs:', error);
        res.status(500).json({ error: 'Failed to fetch banned IPs' });
    }
});

router.post('/servers/:id/config/banned-ips.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { ip, reason, expires } = req.body;
        if (!ip) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        const bannedIPs = await addBannedIP(server._id, ip, reason, expires);
        res.json(bannedIPs);
    } catch (error) {
        console.error('Error adding banned IP:', error);
        res.status(500).json({ error: error.message || 'Failed to add banned IP' });
    }
});

router.delete('/servers/:id/config/banned-ips.json/:ip', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const bannedIPs = await removeBannedIP(server._id, req.params.ip);
        res.json(bannedIPs);
    } catch (error) {
        console.error('Error removing banned IP:', error);
        res.status(500).json({ error: 'Failed to remove banned IP' });
    }
});

router.get('/servers/:id/config/banned-players.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const bannedPlayers = await getBannedPlayers(server._id);
        res.json(bannedPlayers);
    } catch (error) {
        console.error('Error fetching banned players:', error);
        res.status(500).json({ error: 'Failed to fetch banned players' });
    }
});

router.post('/servers/:id/config/banned-players.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { name, reason, expires } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        const bannedPlayers = await addBannedPlayer(server._id, name, reason, expires);
        res.json(bannedPlayers);
    } catch (error) {
        console.error('Error adding banned player:', error);
        res.status(500).json({ error: error.message || 'Failed to add banned player' });
    }
});

router.delete('/servers/:id/config/banned-players.json/:name', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const bannedPlayers = await removeBannedPlayer(server._id, req.params.name);
        res.json(bannedPlayers);
    } catch (error) {
        console.error('Error removing banned player:', error);
        res.status(500).json({ error: 'Failed to remove banned player' });
    }
});

router.get('/servers/:id/config/ops.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const operators = await getOperators(server._id);
        res.json(operators);
    } catch (error) {
        console.error('Error fetching operators:', error);
        res.status(500).json({ error: 'Failed to fetch operators' });
    }
});

router.post('/servers/:id/config/ops.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { name, level } = req.body;
        if (!name || !level) {
            return res.status(400).json({ error: 'Player name and operator level are required' });
        }

        const operators = await addOperator(server._id, name, level);
        res.json(operators);
    } catch (error) {
        console.error('Error adding operator:', error);
        res.status(500).json({ error: error.message || 'Failed to add operator' });
    }
});

router.delete('/servers/:id/config/ops.json/:name', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const operators = await removeOperator(server._id, req.params.name);
        res.json(operators);
    } catch (error) {
        console.error('Error removing operator:', error);
        res.status(500).json({ error: 'Failed to remove operator' });
    }
});

router.get('/servers/:id/config/whitelist.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const whitelist = await getWhitelist(server._id);
        res.json(whitelist);
    } catch (error) {
        console.error('Error fetching whitelist:', error);
        res.status(500).json({ error: 'Failed to fetch whitelist' });
    }
});

router.post('/servers/:id/config/whitelist.json', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        const whitelist = await addToWhitelist(server._id, name);
        res.json(whitelist);
    } catch (error) {
        console.error('Error adding player to whitelist:', error);
        res.status(500).json({ error: error.message || 'Failed to add player to whitelist' });
    }
});

router.delete('/servers/:id/config/whitelist.json/:name', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const whitelist = await removeFromWhitelist(server._id, req.params.name);
        res.json(whitelist);
    } catch (error) {
        console.error('Error removing player from whitelist:', error);
        res.status(500).json({ error: 'Failed to remove player from whitelist' });
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

        const { lastSeen, metrics, javaStatus } = req.body;
        
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
        
        // Update Java status if provided
        if (javaStatus) {
            node.javaStatus = javaStatus;
        }
        
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

// Add new endpoint for Java installation
router.post('/nodes/:id/install-java', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        // For development, use localhost instead of the node's address
        if (process.env.NODE_ENV === 'development') {
            node.address = 'localhost:50051';
        }

        const grpcClient = new GRPCAgentService(node);
        const result = await grpcClient.installJava();

        if (result.success) {
            res.json({ message: 'Java installation initiated successfully' });
        } else {
            res.status(500).json({ error: 'Failed to initiate Java installation' });
        }
    } catch (error) {
        console.error('Error initiating Java installation:', error);
        res.status(500).json({ error: 'Failed to initiate Java installation', details: error.message });
    }
});

// Add new endpoint for swapping server jar files
router.post('/servers/:id/swap-jar', async (req, res) => {
    let server = null;
    try {
        server = await Server.findById(req.params.id).populate('nodeId');
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const { newType, newVersion } = req.body;
        if (!newType || !newVersion) {
            return res.status(400).json({ error: 'Missing required fields: newType and newVersion' });
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

        // Update server status to indicate jar swap in progress
        server.status = 'jar_swap_in_progress';
        server.statusMessage = 'Swapping server jar file...';
        await server.save();

        // Download the new jar file
        const newJarPath = await minecraftService.downloadServer(newType, newVersion);

        // Create a backup of the current jar
        const serverDir = path.join(__dirname, '../servers', server._id.toString());
        const currentJarPath = path.join(serverDir, 'server.jar');
        const backupJarPath = path.join(serverDir, 'server.jar.backup');

        try {
            // Create backup of current jar
            await fsPromises.copyFile(currentJarPath, backupJarPath);
            
            // Copy new jar to server directory
            await fsPromises.copyFile(newJarPath, currentJarPath);

            // Update server information
            server.minecraftVersion = newVersion;
            server.serverType = newType;
            server.status = 'stopped';
            server.statusMessage = 'Server jar swapped successfully';
            
            // Clear the instanceId since we need to re-provision
            server.instanceId = undefined;
            await server.save();

            // Re-provision the server with the new jar
            const grpcClient = new GRPCAgentService(node);
            const serverConfig = {
                name: server.name,
                minecraftVersion: newVersion,
                nodeId: node._id,
                serverId: server._id.toString(),
                apiKey: node.apiKey,
                serverType: newType
            };

            const provisionResponse = await grpcClient.provisionServer(serverConfig);
            if (!provisionResponse.instanceId) {
                throw new Error('No instanceId received from gRPC server');
            }
            
            server.instanceId = provisionResponse.instanceId;
            await server.save();

            res.json({ 
                message: 'Server jar swapped successfully',
                server: {
                    id: server._id,
                    name: server.name,
                    minecraftVersion: server.minecraftVersion,
                    serverType: server.serverType,
                    status: server.status
                }
            });
        } catch (error) {
            // If something goes wrong, restore from backup
            try {
                await fsPromises.copyFile(backupJarPath, currentJarPath);
                if (server && server._id) {
                    server.status = 'error';
                    server.statusMessage = 'Failed to swap jar file, restored from backup';
                    await server.save();
                }
            } catch (restoreError) {
                console.error('Error restoring from backup:', restoreError);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error swapping server jar:', error);
        if (server && server._id) {
            try {
                server.status = 'error';
                server.statusMessage = 'Failed to swap jar file';
                await server.save();
            } catch (updateError) {
                console.error('Error updating server status:', updateError);
            }
        }
        res.status(500).json({ error: 'Failed to swap server jar file' });
    }
});

module.exports = router;