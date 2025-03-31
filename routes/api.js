const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Node = require('../models/Node');
const GRPCAgentService = require('../services/grpcAgentService');

// Node Routes
router.get('/nodes', async (req, res) => {
    try {
        const nodes = await Node.find().select('-certificate.privateKey');
        res.json({nodes});
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

        // Get the node and create gRPC client
        const node = await Node.findById(newServer.nodeId);
        if (!node) {
            throw new Error('Node not found');
        }

        const grpcClient = new GRPCAgentService(node);

        // Provision server using gRPC
        const serverConfig = {
            name: newServer.name,
            minecraftVersion: newServer.minecraftVersion,
            plugins: newServer.plugins
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

module.exports = router;