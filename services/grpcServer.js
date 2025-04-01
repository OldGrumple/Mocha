const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

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

// Helper function to validate API key
const validateApiKey = (metadata) => {
    const apiKey = metadata.get('authorization')[0]?.replace('Bearer ', '');
    // TODO: Implement proper API key validation against stored node API keys
    return true;
};

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

// Implement the service methods
const agentService = {
    ProvisionServer: async (call, callback) => {
        try {
            // Validate API key
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { name, minecraftVersion, config } = call.request;
            const instanceId = `server-${Date.now()}`;
            const serverDir = getServerDir(instanceId);

            // Create server directory
            await fs.mkdir(serverDir, { recursive: true });

            // Copy server jar from cache
            const jarPath = path.join(__dirname, '../cache', minecraftVersion);
            await fs.copyFile(jarPath, path.join(serverDir, 'server.jar'));

            // Generate server.properties
            await generateServerProperties(config, serverDir);

            // Create eula.txt
            await fs.writeFile(path.join(serverDir, 'eula.txt'), 'eula=true\n');

            // Store server info
            runningServers.set(instanceId, {
                name,
                version: minecraftVersion,
                config,
                status: 'stopped'
            });

            callback(null, {
                instanceId,
                message: 'Server provisioned successfully'
            });
        } catch (error) {
            console.error('Error provisioning server:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to provision server'
            });
        }
    },

    StartServer: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { instanceId } = call.request;
            const serverInfo = runningServers.get(instanceId);
            
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            const serverDir = getServerDir(instanceId);
            const memory = serverInfo.config.memory || 2;

            // Start Minecraft server process
            const process = spawn('java', [
                `-Xmx${memory}G`,
                `-Xms${memory}G`,
                '-jar',
                'server.jar',
                'nogui'
            ], {
                cwd: serverDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Store process reference
            serverInfo.process = process;
            serverInfo.status = 'running';

            // Handle process events
            process.stdout.on('data', (data) => {
                console.log(`[${instanceId}] ${data}`);
            });

            process.stderr.on('data', (data) => {
                console.error(`[${instanceId}] ${data}`);
            });

            process.on('close', (code) => {
                console.log(`[${instanceId}] Server process exited with code ${code}`);
                serverInfo.status = 'stopped';
                serverInfo.process = null;
            });

            callback(null, {
                message: 'Server started successfully'
            });
        } catch (error) {
            console.error('Error starting server:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to start server'
            });
        }
    },

    StopServer: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { instanceId } = call.request;
            const serverInfo = runningServers.get(instanceId);
            
            if (!serverInfo || !serverInfo.process) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found or not running'
                });
                return;
            }

            // Send stop command to server
            serverInfo.process.stdin.write('stop\n');
            serverInfo.status = 'stopping';

            // Wait for process to exit
            await new Promise((resolve) => {
                serverInfo.process.once('close', resolve);
            });

            serverInfo.status = 'stopped';
            serverInfo.process = null;

            callback(null, {
                message: 'Server stopped successfully'
            });
        } catch (error) {
            console.error('Error stopping server:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to stop server'
            });
        }
    },

    DeleteServer: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { instanceId } = call.request;
            const serverInfo = runningServers.get(instanceId);
            
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Stop server if running
            if (serverInfo.process) {
                serverInfo.process.stdin.write('stop\n');
                await new Promise((resolve) => {
                    serverInfo.process.once('close', resolve);
                });
            }

            // Remove server directory
            const serverDir = getServerDir(instanceId);
            await fs.rm(serverDir, { recursive: true, force: true });

            // Remove from running servers
            runningServers.delete(instanceId);

            callback(null, {
                message: 'Server deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting server:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to delete server'
            });
        }
    },

    GetServerStatus: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { instanceId } = call.request;
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
                message: `Server is ${serverInfo.status}`
            });
        } catch (error) {
            console.error('Error getting server status:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to get server status'
            });
        }
    }
};

// Add the service to the server
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
server.addService(protoDescriptor.agent.AgentService.service, agentService);

// Start the server
const port = process.env.GRPC_PORT || 50051;
server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Failed to bind server:', err);
            return;
        }
        server.start();
        console.log(`gRPC server running on port ${port}`);
    }
); 