const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const axios = require('axios');
const minecraftService = require('./minecraftService');
const javaManager = require('./javaManager');
const Node = require('../models/Node');
const Server = require('../models/Server');
const { createHash } = require('crypto');
const MinecraftServerWorker = require('./minecraftServerWorker');
const { createStartScript, createEULA, generateServerProperties } = require('./serverUtils');
const MinecraftCache = require('../models/MinecraftCache');
require('dotenv').config();


process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
  });

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
const getServerDir = (serverId) => {
    return path.join(__dirname, '../servers', serverId);
};

// Add this function before the serverService definition
async function registerNode(node_id, api_key, address, hostname, os, memory_bytes, cpu_cores, ip_address) {
    try {
        console.log('Registering node:', {
            node_id,
            address,
            hostname,
            os,
            memory_bytes,
            cpu_cores,
            ip_address
        });

        // Check if node is already registered
        if (registeredNodes.has(node_id)) {
            console.log('Node already registered:', node_id);
            return false;
        }

        // Check Java version
        const javaStatus = await javaManager.checkJavaVersion();
        console.log('Java status:', javaStatus);

        // Create node directory for installation scripts if needed
        const nodeDir = path.join(__dirname, '../nodes', node_id);
        await fs.mkdir(nodeDir, { recursive: true });

        // If Java is not installed or doesn't meet requirements, create installation script
        if (!javaStatus.installed || !javaStatus.meetsRequirement) {
            console.log('Java installation required. Creating installation script...');
            await javaManager.createJavaInstallScript(nodeDir);
        }

        // Store node information locally
        registeredNodes.set(node_id, {
            nodeId: node_id,
            apiKey: api_key,
            address: address || 'localhost:50051',
            hostname: hostname || node_id,
            os: os || 'unknown',
            memoryBytes: memory_bytes || 0,
            cpuCores: cpu_cores || 1,
            ipAddress: ip_address || 'localhost',
            lastSeen: Date.now(),
            javaStatus: javaStatus,
            status: 'online'
        });

        // Save or update node in database
        await Node.findOneAndUpdate(
            { _id: node_id },
            {
                _id: node_id,
                name: hostname || node_id,
                address: address || 'localhost:50051',
                apiKey: api_key,
                status: 'online',
                lastSeen: new Date(),
                os: os || 'unknown',
                metrics: {
                    memoryBytes: memory_bytes || 0,
                    cpuCores: cpu_cores || 1
                },
                javaStatus: javaStatus
            },
            { upsert: true, new: true }
        );

        console.log('Node registered successfully:', node_id);
        return true;
    } catch (error) {
        console.error('Error registering node:', error.message);
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

// Add helper function to verify jar hash
async function verifyJarHash(sourcePath, targetPath, type, version) {
  try {
    // Read both files
    const sourceBuffer = await fs.readFile(sourcePath);
    const targetBuffer = await fs.readFile(targetPath);
    
    // Calculate SHA-256 hash of both files
    const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex');
    const targetHash = createHash('sha256').update(targetBuffer).digest('hex');
    
    if (sourceHash !== targetHash) {
      console.error(`Hash mismatch for server.jar in ${targetPath}`);
      console.error(`Source hash: ${sourceHash}`);
      console.error(`Target hash: ${targetHash}`);
      return false;
    }
    
    // Verify against known good hash
    return await minecraftService.validateServerJar(targetPath, type, version);
  } catch (error) {
    console.error('Error verifying jar hash:', error);
    return false;
  }
}

// Implement the service methods
const agentService = {
    // Node management methods
    RegisterNode: async (call, callback) => {
        try {
            const { node_id, api_key, address, hostname, os, memory_bytes, cpu_cores, ip_address } = call.request;
            console.log('Received node registration request:', {
                node_id,
                address,
                hostname,
                os,
                memory_bytes,
                cpu_cores,
                ip_address
            });

            if (!node_id || !api_key) {
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required fields: node_id and api_key'
                });
                return;
            }

            // Register the node directly
            const registered = await registerNode(
                node_id,
                api_key,
                address,
                hostname,
                os,
                memory_bytes,
                cpu_cores,
                ip_address
            );

            if (!registered) {
                console.error('Failed to register node:', node_id);
                callback({
                    code: grpc.status.INTERNAL,
                    message: 'Failed to register node'
                });
                return;
            }

            callback(null, {
                success: true,
                message: 'Node registered successfully',
                api_key: api_key
            });
        } catch (error) {
            console.error('Error in RegisterNode:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to register node'
            });
        }
    },

    Heartbeat: async (call, callback) => {
        try {
            const { nodeId, timestamp, servers, metrics, apiKey } = call.request;
            
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

            // Update node info in memory
            nodeInfo.lastSeen = Date.now();
            nodeInfo.status = 'online';
            nodeMetrics.set(nodeId, metrics);
            registeredNodes.set(nodeId, nodeInfo);

            // Update node in database
            await Node.findOneAndUpdate(
                { _id: nodeId },
                {
                    status: 'online',
                    lastSeen: new Date(),
                    metrics: {
                        cpuUsage: metrics.cpuUsage || 0,
                        cpuCores: metrics.cpuCores || 1,
                        memoryUsed: metrics.memoryUsed || 0,
                        memoryTotal: metrics.memoryTotal || 0,
                        diskUsage: metrics.diskUsage || 0,
                        networkBytesIn: metrics.networkBytesIn || 0,
                        networkBytesOut: metrics.networkBytesOut || 0
                    }
                },
                { new: true }
            );

            callback(null, { 
                success: true,
                message: 'Heartbeat received successfully'
            });
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

            const { nodeId, cpuUsage, cpuCores, memoryUsed, memoryTotal, diskUsage, networkBytesIn, networkBytesOut, apiKey } = call.request;
            
            // Update node metrics in memory
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

            // Update node in database
            await Node.findOneAndUpdate(
                { _id: nodeId },
                {
                    metrics: {
                        cpuUsage,
                        cpuCores,
                        memoryUsed,
                        memoryTotal,
                        diskUsage,
                        networkBytesIn,
                        networkBytesOut
                    },
                    lastSeen: new Date()
                },
                { new: true }
            );

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

    UpdateCredentials: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { nodeId, apiKey, certificates } = call.request;
            
            // Update node credentials
            const nodeInfo = registeredNodes.get(nodeId);
            if (!nodeInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Node not found'
                });
                return;
            }

            nodeInfo.apiKey = apiKey;
            nodeInfo.certificates = certificates;
            registeredNodes.set(nodeId, nodeInfo);

            callback(null, {
                success: true,
                message: 'Credentials updated successfully'
            });
        } catch (error) {
            console.error('Error updating credentials:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to update credentials'
            });
        }
    },

    InstallJava: async (call, callback) => {
        try {
            if (!validateApiKey(call.metadata)) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid API key'
                });
                return;
            }

            const { nodeId } = call.request;
            console.log('Received Java installation request for node:', nodeId);

            const nodeInfo = registeredNodes.get(nodeId);
            if (!nodeInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Node not found'
                });
                return;
            }

            // Create node directory if it doesn't exist
            const nodeDir = path.join(__dirname, '../nodes', nodeId);
            await fs.mkdir(nodeDir, { recursive: true });

            // Create and execute the installation script
            const scriptPath = await javaManager.createJavaInstallScript(nodeDir);
            const command = javaManager.isWindows ? scriptPath : `bash ${scriptPath}`;

            // Spawn the installation process
            const installProcess = spawn(command, [], {
                stdio: 'inherit',
                shell: true
            });

            // Don't wait for the process to complete, just return success
            installProcess.on('error', (error) => {
                console.error('Error starting Java installation:', error);
            });

            // Return success immediately
            callback(null, {
                success: true,
                message: 'Java installation initiated'
            });
        } catch (error) {
            console.error('Error in InstallJava:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to initiate Java installation'
            });
        }
    },

    // Server management methods
    ProvisionServer: async (call, callback) => {
        try {
            const { name, minecraftVersion, nodeId, serverId, apiKey, config, plugins } = call.request;
            console.log('Received server provisioning request:', {
                name,
                minecraftVersion,
                nodeId,
                serverId,
                config,
                plugins
            });

            if (!serverId || !minecraftVersion) {
                callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Missing required fields: serverId and minecraftVersion'
                });
                return;
            }

            // Store server info in runningServers map
            runningServers.set(serverId, {
                serverId,
                name,
                version: minecraftVersion,
                config,
                status: 'provisioning',
                progress: 0,
                statusMessage: 'Initializing server...',
                nodeId: nodeId,
                apiKey: apiKey
            });

            // Create server directory
            const serverDir = getServerDir(serverId);
            await fs.mkdir(serverDir, { recursive: true });

            // Start download worker process with configuration
            const workerPath = path.join(__dirname, 'downloadServerWorker.js');
            const downloadProcess = spawn('node', [
                workerPath,
                config.serverType,
                minecraftVersion,
                serverId,
                JSON.stringify(config) // Pass the config as a JSON string
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: true
            });

            // Handle worker process output
            downloadProcess.stdout.on('data', (data) => {
                console.log(`[Download Worker ${serverId}] ${data}`);
            });

            downloadProcess.stderr.on('data', (data) => {
                console.error(`[Download Worker ${serverId} Error] ${data}`);
            });

            // Monitor download progress
            const progressPath = path.join(serverDir, 'download_progress.json');
            const monitorProgress = async () => {
                try {
                    const progressData = JSON.parse(await fs.readFile(progressPath, 'utf8'));
                    const serverInfo = runningServers.get(serverId);
                    
                    if (serverInfo) {
                        serverInfo.progress = progressData.progress;
                        serverInfo.statusMessage = progressData.message;
                        
                        // Update server status in database and trigger frontend update
                        await Server.findByIdAndUpdate(serverId, {
                            status: progressData.status,
                            progress: progressData.progress,
                            statusMessage: progressData.message
                        }, { new: true });

                        // Update running servers map
                        runningServers.set(serverId, {
                            ...serverInfo,
                            status: progressData.status,
                            progress: progressData.progress,
                            statusMessage: progressData.message
                        });

                        if (progressData.status === 'completed') {
                            // Verify the jar hash after download is complete
                            const sourceJarPath = progressData.jarPath; // This should be set by the download worker
                            const targetJarPath = path.join(serverDir, 'server.jar');
                            
                            const hashValid = await verifyJarHash(sourceJarPath, targetJarPath, config.serverType, minecraftVersion);
                            if (!hashValid) {
                                throw new Error('Server jar hash verification failed');
                            }

                            serverInfo.status = 'provisioned';
                            serverInfo.progress = 100;
                            serverInfo.statusMessage = 'Server provisioned successfully';
                            
                            // Create start script with the correct Java version
                            await createStartScript(serverDir, {
                                ...config,
                                minecraftVersion
                            });

                            // Generate server.properties
                            await generateServerProperties(config, serverDir);

                            // Create EULA.txt
                            await createEULA(serverDir);
                            
                            // Update final status in database
                            await Server.findByIdAndUpdate(serverId, {
                                status: 'provisioned',
                                progress: 100,
                                statusMessage: 'Server provisioned successfully'
                            }, { new: true });

                            // Update running servers map
                            runningServers.set(serverId, {
                                ...serverInfo,
                                status: 'provisioned',
                                progress: 100,
                                statusMessage: 'Server provisioned successfully'
                            });
                        } else if (progressData.status === 'error') {
                            serverInfo.status = 'error';
                            serverInfo.statusMessage = progressData.message;
                            
                            // Update error status in database
                            await Server.findByIdAndUpdate(serverId, {
                                status: 'error',
                                statusMessage: progressData.message
                            }, { new: true });

                            // Update running servers map
                            runningServers.set(serverId, {
                                ...serverInfo,
                                status: 'error',
                                statusMessage: progressData.message
                            });
                        }
                    }
                } catch (error) {
                    // File doesn't exist yet or other error, continue monitoring
                    console.log('Progress file not ready yet:', error.message);
                }
            };

            // Check progress every second
            const progressInterval = setInterval(monitorProgress, 1000);

            // Clean up interval when process exits
            downloadProcess.on('exit', (code) => {
                clearInterval(progressInterval);
                if (code !== 0) {
                    console.error(`Download worker for server ${serverId} failed with code ${code}`);
                    const serverInfo = runningServers.get(serverId);
                    if (serverInfo) {
                        serverInfo.status = 'error';
                        serverInfo.statusMessage = 'Failed to download server files';
                        
                        // Update error status in database
                        Server.findByIdAndUpdate(serverId, {
                            status: 'error',
                            statusMessage: 'Failed to download server files'
                        }, { new: true }).catch(err => console.error('Error updating server status:', err));

                        // Update running servers map
                        runningServers.set(serverId, {
                            ...serverInfo,
                            status: 'error',
                            statusMessage: 'Failed to download server files'
                        });
                    }
                }
            });

            // Don't wait for the download to complete
            callback(null, {
                success: true,
                message: 'Server provisioning started',
                instanceId: serverId
            });
        } catch (error) {
            console.error('Error in ProvisionServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to provision server'
            });
        }
    },

    StartServer: async (call, callback) => {
        try {
            const { instanceId, serverId, nodeId, apiKey, action } = call.request;
            console.log('Received start server request:', { instanceId, serverId, action });
            console.log('Current running servers:', Array.from(runningServers.keys()));

            const serverInfo = runningServers.get(serverId);
            if (!serverInfo) {
                console.error('Server not found in runningServers map:', serverId);
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Verify node and API key match
            if (serverInfo.nodeId !== nodeId || serverInfo.apiKey !== apiKey) {
                console.error('Invalid node or API key for server:', serverId);
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid node or API key'
                });
                return;
            }

            // Check if server is already running
            if (serverInfo.worker) {
                console.log('Server is already running:', serverId);
                callback({
                    code: grpc.status.FAILED_PRECONDITION,
                    message: 'Server is already running'
                });
                return;
            }

            // Create a new worker process for this server
            const workerProcess = spawn('node', [
                path.join(__dirname, 'minecraftServerWorker.js'),
                serverId,
                JSON.stringify(serverInfo.config)
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Handle worker process messages
            workerProcess.stdout.on('data', async (data) => {
                try {
                    const rawMessage = data.toString().trim();
                    console.log(`[Worker ${serverId}] Raw output:`, rawMessage);
                    
                    const parsedMessage = JSON.parse(rawMessage);
                    if (parsedMessage.success) {
                        if (parsedMessage.log) {
                            // Handle log message
                            console.log(`[Worker ${serverId}] Log:`, parsedMessage.log);
                            await Server.findByIdAndUpdate(serverId, {
                                $push: {
                                    logs: {
                                        level: parsedMessage.log.level,
                                        message: parsedMessage.log.message
                                    }
                                }
                            });
                        } else if (parsedMessage.status) {
                            // Handle status update
                            console.log(`[Worker ${serverId}] Status:`, parsedMessage.status);
                            serverInfo.status = parsedMessage.status.status;
                            serverInfo.statusMessage = parsedMessage.status.statusMessage;
                            serverInfo.playerCount = parsedMessage.status.playerCount;
                            runningServers.set(serverId, serverInfo);
                        } else if (parsedMessage.message) {
                            // Handle general success message
                            console.log(`[Worker ${serverId}] ${parsedMessage.message}`);
                            await Server.findByIdAndUpdate(serverId, {
                                $push: {
                                    logs: {
                                        level: 'info',
                                        message: parsedMessage.message
                                    }
                                }
                            });
                        }
                    } else {
                        console.error(`[Worker ${serverId}] Error:`, parsedMessage.error);
                        // Store error log in database
                        await Server.findByIdAndUpdate(serverId, {
                            $push: {
                                logs: {
                                    level: 'error',
                                    message: parsedMessage.error
                                }
                            }
                        });
                        // Update server status to error
                        serverInfo.status = 'error';
                        serverInfo.statusMessage = parsedMessage.error || 'Server failed to start';
                        serverInfo.worker = null;
                        runningServers.set(serverId, serverInfo);
                    }
                } catch (error) {
                    console.error(`[Worker ${serverId}] Error parsing message:`, error);
                    console.error(`[Worker ${serverId}] Raw message:`, rawMessage);
                    // Store error log in database
                    await Server.findByIdAndUpdate(serverId, {
                        $push: {
                            logs: {
                                level: 'error',
                                message: `Error parsing worker message: ${error.message}`
                            }
                        }
                    });
                }
            });

            workerProcess.stderr.on('data', async (data) => {
                const error = data.toString().trim();
                console.error(`[Worker ${serverId} Error] ${error}`);
                // Store error log in database
                await Server.findByIdAndUpdate(serverId, {
                    $push: {
                        logs: {
                            level: 'error',
                            message: error
                        }
                    }
                });
                // Update server status to error
                serverInfo.status = 'error';
                serverInfo.statusMessage = error;
                serverInfo.worker = null;
                runningServers.set(serverId, serverInfo);
            });

            workerProcess.on('exit', async (code) => {
                console.log(`Worker ${serverId} exited with code ${code}`);
                serverInfo.worker = null;
                serverInfo.status = code === 0 ? 'stopped' : 'error';
                serverInfo.statusMessage = `Server stopped (exit code: ${code})`;
                runningServers.set(serverId, serverInfo);

                // Store exit log in database
                await Server.findByIdAndUpdate(serverId, {
                    $push: {
                        logs: {
                            level: 'info',
                            message: `Server worker exited with code ${code}`
                        }
                    }
                });
            });

            // Store the worker process
            serverInfo.worker = workerProcess;
            serverInfo.status = 'starting';
            serverInfo.statusMessage = 'Starting server...';
            runningServers.set(serverId, serverInfo);

            // Send start command to worker
            workerProcess.stdin.write(JSON.stringify({ command: 'start' }) + '\n');

            // Wait for server to start
            const startPromise = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log(`Start command timed out for server ${serverId}`);
                    // Kill the worker process on timeout
                    if (workerProcess) {
                        workerProcess.kill('SIGKILL');
                        serverInfo.worker = null;
                        serverInfo.status = 'error';
                        serverInfo.statusMessage = 'Server start timed out';
                        runningServers.set(serverId, serverInfo);
                    }
                    resolve(false);
                }, 30000); // 30 second timeout

                const handleStartResponse = (data) => {
                    try {
                        const message = data.toString().trim();
                        console.log(`[Worker ${serverId}] Start response:`, message);
                        const parsedMessage = JSON.parse(message);
                        if (parsedMessage.success) {
                            clearTimeout(timeout);
                            resolve(true);
                        } else {
                            console.error(`[Worker ${serverId}] Start failed:`, parsedMessage.error);
                            // Kill the worker process on failure
                            if (workerProcess) {
                                workerProcess.kill('SIGKILL');
                                serverInfo.worker = null;
                                serverInfo.status = 'error';
                                serverInfo.statusMessage = parsedMessage.error || 'Server failed to start';
                                runningServers.set(serverId, serverInfo);
                            }
                            resolve(false);
                        }
                    } catch (error) {
                        console.error(`[Worker ${serverId}] Error parsing start response:`, error);
                        // Kill the worker process on parsing error
                        if (workerProcess) {
                            workerProcess.kill('SIGKILL');
                            serverInfo.worker = null;
                            serverInfo.status = 'error';
                            serverInfo.statusMessage = 'Failed to parse server start response';
                            runningServers.set(serverId, serverInfo);
                        }
                        resolve(false);
                    }
                };

                workerProcess.stdout.once('data', handleStartResponse);
            });

            const started = await startPromise;
            if (!started) {
                serverInfo.status = 'error';
                serverInfo.statusMessage = 'Failed to start server';
                serverInfo.worker = null;
                runningServers.set(serverId, serverInfo);
                callback({
                    code: grpc.status.INTERNAL,
                    message: 'Failed to start server'
                });
                return;
            }

            callback(null, {
                success: true,
                message: 'Server start initiated'
            });
        } catch (error) {
            console.error('Error in StartServer:', error);
            // Clean up on error
            if (serverInfo && serverInfo.worker) {
                serverInfo.worker.kill('SIGKILL');
                serverInfo.worker = null;
                serverInfo.status = 'error';
                serverInfo.statusMessage = error.message;
                runningServers.set(serverId, serverInfo);
            }
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to start server'
            });
        }
    },

    StopServer: async (call, callback) => {
        try {
            const { instanceId, serverId, nodeId, apiKey } = call.request;
            console.log('Received stop server request:', { instanceId, serverId });

            const serverInfo = runningServers.get(serverId);
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Verify node and API key match
            if (serverInfo.nodeId !== nodeId || serverInfo.apiKey !== apiKey) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid node or API key'
                });
                return;
            }

            // Check if server is running
            if (!serverInfo.worker) {
                // Update database to reflect stopped status
                await Server.findByIdAndUpdate(serverId, {
                    status: 'stopped',
                    statusMessage: 'Server is not running'
                });
                callback({
                    code: grpc.status.FAILED_PRECONDITION,
                    message: 'Server is not running'
                });
                return;
            }

            // Update server status to stopping in database
            await Server.findByIdAndUpdate(serverId, {
                status: 'stopping',
                statusMessage: 'Stopping server...'
            });

            // Update server info
            serverInfo.status = 'stopping';
            serverInfo.statusMessage = 'Stopping server...';
            runningServers.set(serverId, serverInfo);

            // Send stop command to worker
            serverInfo.worker.stdin.write(JSON.stringify({ command: 'stop' }) + '\n');

            // Wait for stop response
            const stopPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(async () => {
                    console.log(`Stop command timed out for server ${serverId}, force killing worker...`);
                    if (serverInfo.worker) {
                        serverInfo.worker.kill('SIGKILL');
                        serverInfo.worker = null;
                        serverInfo.status = 'stopped';
                        serverInfo.statusMessage = 'Server force stopped (timeout)';
                        runningServers.set(serverId, serverInfo);
                        
                        // Update database with force stop status
                        await Server.findByIdAndUpdate(serverId, {
                            status: 'stopped',
                            statusMessage: 'Server force stopped (timeout)'
                        });
                        
                        // Add force stop log
                        await Server.findByIdAndUpdate(serverId, {
                            $push: {
                                logs: {
                                    level: 'warn',
                                    message: 'Server force stopped due to timeout'
                                }
                            }
                        });
                    }
                    resolve();
                }, 35000); // 35 seconds timeout (slightly longer than worker timeout)

                serverInfo.worker.once('exit', async (code) => {
                    clearTimeout(timeout);
                    console.log(`Worker process exited with code ${code} for server ${serverId}`);
                    serverInfo.worker = null;
                    serverInfo.status = 'stopped';
                    serverInfo.statusMessage = `Server stopped (exit code: ${code})`;
                    runningServers.set(serverId, serverInfo);

                    // Update database with final status
                    await Server.findByIdAndUpdate(serverId, {
                        status: 'stopped',
                        statusMessage: `Server stopped (exit code: ${code})`
                    });

                    // Add stop log
                    await Server.findByIdAndUpdate(serverId, {
                        $push: {
                            logs: {
                                level: 'info',
                                message: `Server stopped with exit code ${code}`
                            }
                        }
                    });

                    resolve();
                });

                // Handle worker output
                serverInfo.worker.stdout.on('data', async (data) => {
                    try {
                        const message = JSON.parse(data.toString().trim());
                        console.log(`[Worker ${serverId}] Stop response:`, message);
                        
                        if (message.success) {
                            if (message.log) {
                                // Handle log message
                                await Server.findByIdAndUpdate(serverId, {
                                    $push: {
                                        logs: {
                                            level: message.log.level,
                                            message: message.log.message
                                        }
                                    }
                                });
                            } else if (message.status) {
                                // Handle status update
                                await Server.findByIdAndUpdate(serverId, {
                                    status: message.status.status,
                                    statusMessage: message.status.statusMessage
                                });
                            }
                        } else if (message.error) {
                            console.error(`[Worker ${serverId}] Error:`, message.error);
                            reject(new Error(message.error));
                        }
                    } catch (error) {
                        // Ignore parse errors from stdout
                        console.error(`[Worker ${serverId}] Error parsing message:`, error);
                    }
                });
            });

            await stopPromise;

            callback(null, {
                success: true,
                message: 'Server stop completed'
            });
        } catch (error) {
            console.error('Error in StopServer:', error);
            
            // Update database with error status
            await Server.findByIdAndUpdate(serverId, {
                status: 'error',
                statusMessage: `Failed to stop server: ${error.message}`
            });

            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to stop server'
            });
        }
    },

    DeleteServer: async (call, callback) => {
        try {
            const { instanceId, serverId, nodeId, apiKey, action } = call.request;
            console.log('Received delete server request:', { instanceId, serverId, action });

            const serverInfo = runningServers.get(serverId);
            if (serverInfo && serverInfo.process) {
                try {
                    // Stop the server if it's running
                    serverInfo.process.kill('SIGKILL');
                    console.log(`Killed server process for ${serverId}`);
                } catch (error) {
                    console.error(`Error killing server process for ${serverId}:`, error);
                }
            }

            // Remove from running servers
            runningServers.delete(serverId);
            console.log(`Removed server ${serverId} from running servers`);

            // Delete server directory
            const serverDir = getServerDir(serverId);
            try {
                await fs.rm(serverDir, { recursive: true, force: true });
                console.log(`Deleted server directory for ${serverId}`);
            } catch (error) {
                console.error(`Error deleting server directory for ${serverId}:`, error);
                // Don't fail the request if directory deletion fails
            }

            callback(null, {
                success: true,
                message: 'Server deleted successfully'
            });
        } catch (error) {
            console.error('Error in DeleteServer:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: `Failed to delete server: ${error.message}`
            });
        }
    },

    UpdatePlugins: async (call, callback) => {
        try {
            const { instanceId, serverId, nodeId, apiKey, plugins } = call.request;
            console.log('Received update plugins request:', { instanceId, serverId, plugins });

            const serverInfo = runningServers.get(serverId);
            if (!serverInfo) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // TODO: Implement plugin management
            callback(null, {
                success: true,
                message: 'Plugins updated successfully'
            });
        } catch (error) {
            console.error('Error in UpdatePlugins:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to update plugins'
            });
        }
    },

    GetServerStatus: async (call, callback) => {
        try {
            const { instanceId, serverId, nodeId, apiKey } = call.request;
            console.log('Received get server status request:', { instanceId, serverId });

            // First check the database status
            const server = await Server.findById(serverId);
            if (!server) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Server not found'
                });
                return;
            }

            // Get server info from runningServers map
            let serverInfo = runningServers.get(serverId);
            
            // If server is in runningServers but status doesn't match database, update runningServers
            if (serverInfo && serverInfo.status !== server.status) {
                console.log(`Server status mismatch detected. Database: ${server.status}, RunningServers: ${serverInfo.status}`);
                serverInfo.status = server.status;
                serverInfo.statusMessage = server.statusMessage || serverInfo.statusMessage;
                serverInfo.worker = null; // Clear worker reference since status doesn't match
                runningServers.set(serverId, serverInfo);
            }

            // If server is not in runningServers but exists in database, add it
            if (!serverInfo) {
                serverInfo = {
                    serverId,
                    status: server.status,
                    statusMessage: server.statusMessage,
                    worker: null,
                    nodeId: server.nodeId,
                    apiKey: server.apiKey
                };
                runningServers.set(serverId, serverInfo);
            }

            // Verify node and API key match
            if (serverInfo.nodeId !== nodeId || serverInfo.apiKey !== apiKey) {
                callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: 'Invalid node or API key'
                });
                return;
            }

            // If server is running, get status from worker
            if (serverInfo.worker) {
                // Create a promise to handle the status response
                const statusPromise = new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.log(`Status request timed out for server ${serverId}`);
                        resolve({
                            status: serverInfo.status,
                            statusMessage: serverInfo.statusMessage,
                            playerCount: 0
                        });
                    }, 5000);

                    // Handle worker output
                    const handleOutput = (data) => {
                        try {
                            const message = data.toString().trim();
                            console.log(`[Worker ${serverId}] Raw output:`, message);
                            
                            // Try to parse as JSON
                            const parsedMessage = JSON.parse(message);
                            if (parsedMessage.success) {
                                clearTimeout(timeout);
                                resolve(parsedMessage.status);
                            } else {
                                console.error(`[Worker ${serverId}] Error in status response:`, parsedMessage.error);
                                resolve({
                                    status: serverInfo.status,
                                    statusMessage: serverInfo.statusMessage,
                                    playerCount: 0
                                });
                            }
                        } catch (error) {
                            console.error(`[Worker ${serverId}] Error parsing message:`, error);
                            console.error(`[Worker ${serverId}] Raw message:`, message);
                            resolve({
                                status: serverInfo.status,
                                statusMessage: serverInfo.statusMessage,
                                playerCount: 0
                            });
                        }
                    };

                    // Set up one-time listener for the response
                    serverInfo.worker.stdout.once('data', handleOutput);
                });

                // Send status request to worker
                serverInfo.worker.stdin.write(JSON.stringify({ command: 'status' }) + '\n');

                // Wait for status response
                const status = await statusPromise;
                callback(null, status);
            } else {
                callback(null, {
                    status: serverInfo.status,
                    statusMessage: serverInfo.statusMessage,
                    playerCount: 0
                });
            }
        } catch (error) {
            console.error('Error in GetServerStatus:', error);
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
    server.start();
  });
}).catch(err => {
  console.error("❌ MongoDB connection failed:", err);
  process.exit(1);
});

module.exports = {
    agentService,
    createStartScript,
    createEULA,
    generateServerProperties
};