const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const axios = require('axios');
const minecraftService = require('./minecraftService');
require('dotenv').config();
// Load the proto file
const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, '../proto/agent.proto'),
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);

// Create the server
const server = new grpc.Server();

// Store running server processes
const runningServers = new Map();

// Store node metrics
const nodeMetrics = new Map();

// Store registered nodes
const registeredNodes = new Map();

// Add these constants at the top level
const HEARTBEAT_TIMEOUT = 120000; // 120 seconds
const HEARTBEAT_CHECK_INTERVAL = 10000; // 10 seconds

// Add this function at the top level
async function validateApiKey(nodeId, apiKey) {
    try {
        // Instead of trying to get the node, we'll just check if the API key matches
        // what we have stored locally
        const nodeInfo = registeredNodes.get(nodeId);
        if (!nodeInfo) {
            console.error('Node not found in registered nodes:', nodeId);
            return false;
        }

        if (nodeInfo.apiKey !== apiKey) {
            console.error('API key mismatch for node:', nodeId);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating API key:', error.message);
        return false;
    }
}

// Helper function to get server directory
const getServerDir = (instanceId) => {
    return path.join(__dirname, '../servers', instanceId);
};

// Helper function to generate server.properties
const generateServerProperties = async (config, serverDir) => {
    const properties = [
        `server-name=${config.serverName}`,
        `max-players=${config.maxPlayers}`,
        `difficulty=${config.difficulty}`,
        `gamemode=${config.gameMode}`,
        `view-distance=${config.viewDistance}`,
        `spawn-protection=${config.spawnProtection}`,
        `level-seed=${config.seed}`,
        `level-type=${config.worldType}`,
        `generate-structures=${config.generateStructures}`,
        'online-mode=true',
        'enable-command-block=true',
        'motd=Welcome to your Minecraft server!',
        'pvp=true',
        'allow-nether=true',
        'enable-query=true',
        'query.port=25565',
        'server-port=25565'
    ].join('\n');

    await fs.writeFile(path.join(serverDir, 'server.properties'), properties);
};

async function registerNodeWithMaster(nodeId, apiKey, address, hostname, os, memoryBytes, cpuCores, ipAddress) {
    try {
        // Validate required fields
        if (!nodeId || !apiKey) {
            console.error('Missing required fields for node registration:', { nodeId, apiKey });
            return false;
        }

        // First try to get the node to see if it exists
        try {
            await axios.get(`http://localhost:3000/api/nodes/${nodeId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            return true;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Node doesn't exist, create it
                const nodeData = {
                    _id: nodeId,
                    name: hostname || nodeId,
                    address: address || 'localhost:50051',
                    apiKey: apiKey,
                    status: 'offline',
                    metrics: {
                        cpuCores: cpuCores || 1,
                        memoryTotal: memoryBytes || 0,
                        cpuUsage: 0,
                        memoryUsed: 0,
                        diskUsage: 0,
                        networkBytesIn: 0,
                        networkBytesOut: 0
                    }
                };

                await axios.post('http://localhost:3000/api/nodes', nodeData);
                return true;
            }
            throw error;
        }
    } catch (error) {
        console.error('Error registering node with master:', error.message);
        return false;
    }
}

// Add this function to check node heartbeats
async function checkNodeHeartbeats() {
    const now = Date.now();
    for (const [nodeId, nodeInfo] of registeredNodes.entries()) {
        const timeSinceLastHeartbeat = now - nodeInfo.lastSeen;
        
        if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
            try {
                await axios.put(`http://localhost:3000/api/nodes/${nodeId}/status`, {
                    lastSeen: Math.floor(nodeInfo.lastSeen / 1000),
                    metrics: nodeMetrics.get(nodeId) || {},
                    status: 'offline',
                    apiKey: nodeInfo.apiKey,
                    address: nodeInfo.address || 'localhost:50051',
                    hostname: nodeInfo.hostname,
                    os: nodeInfo.os,
                    memoryBytes: nodeInfo.memoryBytes,
                    cpuCores: nodeInfo.cpuCores,
                    ipAddress: nodeInfo.ipAddress
                });
            } catch (error) {
                console.error(`Error updating offline status for node ${nodeId}:`, error.message);
            }
        }
    }
}

// Start the heartbeat monitoring system
setInterval(checkNodeHeartbeats, HEARTBEAT_CHECK_INTERVAL);

// Implement the service methods
const agentService = {
    ProvisionServer: async (call, callback) => {
        try {
            const { serverId, minecraftVersion, config } = call.request;
            console.log('Received server provisioning request:', {
                serverId,
                minecraftVersion,
                config
            });

            if (!serverId || !minecraftVersion) {
                console.error('Missing required fields in provisioning request:', { serverId, minecraftVersion });
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required fields: serverId and minecraftVersion'
                });
                return;
            }

            if (!config || !config.serverType) {
                console.error('Missing server type in config:', config);
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required field: serverType in config'
                });
                return;
            }

            // Store server info
            runningServers.set(serverId, {
                serverId,
                version: minecraftVersion,
                config,
                status: 'provisioning',
                progress: 0,
                statusMessage: 'Initializing server...'
            });

            // Update server status in master server
            try {
                await axios.put(`http://localhost:3000/api/servers/${serverId}/status`, {
                    status: 'provisioning',
                    progress: 0,
                    statusMessage: 'Initializing server...'
                });
            } catch (error) {
                console.error('Error updating server status:', error.message);
            }

            // Create server directory
            const serverDir = getServerDir(serverId);
            await fs.mkdir(serverDir, { recursive: true });

            // Update status to downloading
            await axios.put(`http://localhost:3000/api/servers/${serverId}/status`, {
                status: 'provisioning_download',
                progress: 20,
                statusMessage: 'Downloading server files...'
            });

            // Download server files
            // Change to a spawned proccess with a helper file to download/copy the server.
            // Download the server (or get from cache)
            const serverPath = await minecraftService.downloadServer(config.serverType, minecraftVersion);

            // Copy to server dir using a worker process
            const copyWorkerPath = path.join(__dirname, 'copyFileWorker.js');
            const destPath = path.join(serverDir, 'server.jar');

            const copyProcess = spawn('node', [copyWorkerPath, serverPath, destPath], {
            stdio: 'inherit'
            });

            await new Promise((resolve, reject) => {
            copyProcess.on('exit', (code) => {
                if (code === 0) {
                resolve();
                } else {
                reject(new Error(`Copy worker failed with exit code ${code}`));
                }
            });
            });
            //const serverPath = await minecraftService.downloadServer(config.serverType, minecraftVersion);
            //await fs.copyFile(serverPath, path.join(serverDir, 'server.jar'));

            // Update status to setup
            await axios.put(`http://localhost:3000/api/servers/${serverId}/status`, {
                status: 'provisioning_setup',
                progress: 60,
                statusMessage: 'Setting up server configuration...'
            });

            // Generate server.properties
            await generateServerProperties(config, serverDir);

            // Update status to configured
            await axios.put(`http://localhost:3000/api/servers/${serverId}/status`, {
                status: 'provisioned',
                progress: 100,
                statusMessage: 'Server provisioning completed'
            });

            // Return success with the instanceId
            callback(null, {
                success: true,
                message: 'Server provisioning completed',
                instanceId: serverId
            });
        } catch (error) {
            console.error('Error in ProvisionServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to start server provisioning'
            });
        }
    },

    StartServer: async (call, callback) => {
        try {
            const { instanceId } = call.request;
            console.log('Received start server request:', instanceId);

            const serverInfo = runningServers.get(instanceId);
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Update server status in master server
            try {
                await axios.put(`http://localhost:3000/api/servers/${instanceId}/status`, {
                    status: 'starting',
                    statusMessage: 'Starting server...'
                });
            } catch (error) {
                console.error('Error updating server status:', error.message);
                if (error.response) {
                    console.error('Master server response:', error.response.data);
                }
            }

            // Return success immediately as the Go agent will handle the actual start
            callback(null, {
                success: true,
                message: 'Server start initiated'
            });
        } catch (error) {
            console.error('Error in StartServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to start server'
            });
        }
    },

    StopServer: async (call, callback) => {
        try {
            const { instanceId } = call.request;
            console.log('Received stop server request:', instanceId);

            const serverInfo = runningServers.get(instanceId);
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Update server status in master server
            try {
                await axios.put(`http://localhost:3000/api/servers/${instanceId}/status`, {
                    status: 'stopping',
                    statusMessage: 'Stopping server...'
                });
            } catch (error) {
                console.error('Error updating server status:', error.message);
                if (error.response) {
                    console.error('Master server response:', error.response.data);
                }
            }

            // Return success immediately as the Go agent will handle the actual stop
            callback(null, {
                success: true,
                message: 'Server stop initiated'
            });
        } catch (error) {
            console.error('Error in StopServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to stop server'
            });
        }
    },

    DeleteServer: async (call, callback) => {
        try {
            const { instanceId, serverId } = call.request;
            console.log('Received delete server request:', {
                instanceId,
                serverId,
                request: call.request
            });

            // Try to use serverId if instanceId is empty
            const idToDelete = instanceId || serverId;
            
            if (!idToDelete) {
                console.error('Delete server request missing both instanceId and serverId');
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required field: instanceId or serverId'
                });
                return;
            }

            console.log('Attempting to delete server with ID:', idToDelete);

            // Check if server exists in running servers
            const serverInfo = runningServers.get(idToDelete);
            if (!serverInfo) {
                console.log('Server not found in running servers:', idToDelete);
                // Don't return error here, just log it as the server might have been already deleted
                console.log('Proceeding with server deletion as it might have been already removed');
            } else {
                console.log('Found server in running servers:', serverInfo);
            }

            // Update server status in master server
            try {
                console.log('Updating server status to deleting:', idToDelete);
                await axios.put(`http://localhost:3000/api/servers/${idToDelete}/status`, {
                    status: 'deleting',
                    statusMessage: 'Deleting server...'
                });
                console.log('Server status updated to deleting:', idToDelete);
            } catch (error) {
                console.error('Error updating server status:', error.message);
                if (error.response) {
                    console.error('Master server response:', error.response.data);
                }
                // Continue with deletion even if status update fails
            }

            // Remove from running servers if it exists
            if (serverInfo) {
                runningServers.delete(idToDelete);
                console.log('Server removed from running servers:', idToDelete);
            }

            // Return success as the server will be deleted
            callback(null, {
                success: true,
                message: 'Server deletion initiated'
            });
        } catch (error) {
            console.error('Error in DeleteServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to delete server'
            });
        }
    },

    GetServerStatus: async (call, callback) => {
        try {
            const { instanceId } = call.request;
            console.log('Received get server status request:', instanceId);

            const serverInfo = runningServers.get(instanceId);
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            callback(null, {
                instanceId,
                status: serverInfo.status,
                progress: serverInfo.progress || 0,
                statusMessage: serverInfo.statusMessage || `Server is ${serverInfo.status}`,
                playerCount: serverInfo.playerCount || 0
            });
        } catch (error) {
            console.error('Error in GetServerStatus:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to get server status'
            });
        }
    },

    Heartbeat: async (call, callback) => {
        try {
            const { nodeId, timestamp, metrics, apiKey } = call.request;
            
            if (!nodeId || !apiKey) {
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required fields: nodeId and apiKey'
                });
                return;
            }

            const nodeInfo = registeredNodes.get(nodeId);
            if (!nodeInfo || nodeInfo.apiKey !== apiKey) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid node credentials'
                });
                return;
            }

            // Update node info
            nodeInfo.lastSeen = Date.now();
            nodeMetrics.set(nodeId, metrics);

            // Update node status in master server
            try {
                await axios.put(`http://localhost:3000/api/nodes/${nodeId}/status`, {
                    lastSeen: Math.floor(Date.now() / 1000),
                    metrics,
                    status: 'online',
                    apiKey,
                    address: nodeInfo.address || 'localhost:50051',
                    hostname: nodeInfo.hostname,
                    os: nodeInfo.os,
                    memoryBytes: nodeInfo.memoryBytes,
                    cpuCores: nodeInfo.cpuCores,
                    ipAddress: nodeInfo.ipAddress
                });
            } catch (error) {
                console.error('Error updating node status:', error.message);
            }

            callback(null, { success: true });
        } catch (error) {
            console.error('Error in Heartbeat:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to process heartbeat'
            });
        }
    },

    UpdateMetrics: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { nodeId, cpuUsage, cpuCores, memoryUsed, memoryTotal, diskUsage, networkBytesIn, networkBytesOut } = call.request;
            
            // Update node metrics
            const metrics = nodeMetrics.get(nodeId) || {};
            metrics.cpuUsage = cpuUsage;
            metrics.cpuCores = cpuCores;
            metrics.memoryUsed = memoryUsed;
            metrics.memoryTotal = memoryTotal;
            metrics.diskUsage = diskUsage;
            metrics.networkBytesIn = networkBytesIn;
            metrics.networkBytesOut = networkBytesOut;
            metrics.lastUpdate = new Date();
            nodeMetrics.set(nodeId, metrics);

            // Send metrics to master server
            try {
                console.log('Updating node metrics:', {
                    nodeId,
                    metrics
                });

                await axios.put(`http://localhost:3000/api/nodes/${nodeId}/status`, {
                    lastSeen: Math.floor(Date.now() / 1000),
                    metrics: metrics
                });

                console.log('Node metrics updated successfully:', nodeId);
            } catch (error) {
                console.error('Error sending metrics to master server:', error.message);
                if (error.response) {
                    console.error('Master server response:', error.response.data);
                }
            }

            callback(null, {
                success: true,
                message: 'Metrics updated successfully'
            });
        } catch (error) {
            console.error('Error updating metrics:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to update metrics'
            });
        }
    },

    RegisterNode: async (call, callback) => {
        try {
            // Handle both snake_case and camelCase field names
            const {
                node_id, nodeId,
                api_key, apiKey,
                address,
                hostname,
                os,
                memory_bytes, memoryBytes,
                cpu_cores, cpuCores,
                ip_address, ipAddress
            } = call.request;

            // Use snake_case values if available, fall back to camelCase
            const nodeIdValue = node_id || nodeId;
            const apiKeyValue = api_key || apiKey;
            const memoryBytesValue = memory_bytes || memoryBytes;
            const cpuCoresValue = cpu_cores || cpuCores;
            const ipAddressValue = ip_address || ipAddress;

            console.log('Received registration request:', {
                nodeId: nodeIdValue,
                address,
                hostname,
                os,
                memoryBytes: memoryBytesValue,
                cpuCores: cpuCoresValue,
                ipAddress: ipAddressValue
            });

            if (!nodeIdValue || !apiKeyValue) {
                console.error('Missing required fields:', { nodeId: nodeIdValue, apiKey: apiKeyValue });
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required fields: nodeId and apiKey'
                });
                return;
            }

            // First register the node with the master server
            const registered = await registerNodeWithMaster(
                nodeIdValue,
                apiKeyValue,
                address,
                hostname,
                os,
                memoryBytesValue,
                cpuCoresValue,
                ipAddressValue
            );

            if (!registered) {
                console.error('Failed to register node with master server:', nodeIdValue);
                callback({
                    code: grpc.status.INTERNAL,
                    message: 'Failed to register node with master server'
                });
                return;
            }

            // Store node information locally
            registeredNodes.set(nodeIdValue, {
                nodeId: nodeIdValue,
                apiKey: apiKeyValue,
                address: address || 'localhost:50051',
                hostname: hostname || nodeIdValue,
                os: os || 'unknown',
                memoryBytes: memoryBytesValue || 0,
                cpuCores: cpuCoresValue || 1,
                ipAddress: ipAddressValue || 'localhost',
                lastSeen: Date.now()
            });

            // Update node status in master server to online
            try {
                await axios.put(`http://localhost:3000/api/nodes/${nodeIdValue}/status`, {
                    lastSeen: Math.floor(Date.now() / 1000),
                    metrics: {
                        cpuUsage: 0,
                        cpuCores: cpuCoresValue || 1,
                        memoryUsed: 0,
                        memoryTotal: memoryBytesValue || 0,
                        diskUsage: 0,
                        networkBytesIn: 0,
                        networkBytesOut: 0
                    },
                    status: 'online',
                    apiKey: apiKeyValue,
                    address: address || 'localhost:50051',
                    hostname: hostname || nodeIdValue,
                    os: os || 'unknown',
                    memoryBytes: memoryBytesValue || 0,
                    cpuCores: cpuCoresValue || 1,
                    ipAddress: ipAddressValue || 'localhost'
                });
                console.log('Node status updated to online:', nodeIdValue);
            } catch (error) {
                console.error('Error updating node status:', error.message);
                if (error.response) {
                    console.error('Master server response:', error.response.data);
                }
            }

            callback(null, {
                success: true,
                message: 'Node registered successfully'
            });
        } catch (error) {
            console.error('Error in RegisterNode:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to register node'
            });
        }
    }
};

// Add the service to the server
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
server.addService(protoDescriptor.agent.AgentService.service, agentService);

const port = process.env.GRPC_PORT || 50051;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected");

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('❌ Failed to bind gRPC server:', err);
      process.exit(1);
    }
    console.log(`🚀 gRPC server running on port ${boundPort}`);
    server.start(); // ✅ Correctly starts the gRPC server now
  });
}).catch(err => {
  console.error("❌ MongoDB connection failed:", err);
  process.exit(1);
});