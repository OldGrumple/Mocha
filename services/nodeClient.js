const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const axios = require('axios');

class NodeClient {
    constructor(serverAddress = 'localhost:50051', webUiUrl = 'http://localhost:3000') {
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

        // Create gRPC client
        const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
        this.client = new protoDescriptor.agent.AgentService(
            serverAddress,
            grpc.credentials.createInsecure()
        );

        // Store web UI URL
        this.webUiUrl = webUiUrl;

        // Node information
        this.nodeId = null;
        this.apiKey = null;
        this.registered = false;
        this.heartbeatInterval = null;
        this.hostname = this.generateHostname();
    }

    generateHostname() {
        const prefix = 'node';
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}-${random}`;
    }

    async loadOrGenerateCredentials() {
        const configPath = path.join(__dirname, '../config/node.json');
        try {
            const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
            this.nodeId = config.nodeId;
            this.apiKey = config.apiKey;
            this.hostname = config.hostname || this.hostname;
            return true;
        } catch (error) {
            // If config doesn't exist, generate new credentials
            this.nodeId = uuidv4();
            this.apiKey = uuidv4();
            this.hostname = this.generateHostname();
            
            await fs.mkdir(path.dirname(configPath), { recursive: true });
            await fs.writeFile(configPath, JSON.stringify({
                nodeId: this.nodeId,
                apiKey: this.apiKey,
                hostname: this.hostname
            }));
            return false;
        }
    }

    async register() {
        try {
            const isExistingNode = await this.loadOrGenerateCredentials();

            // Get system information
            const networkInterfaces = os.networkInterfaces();
            let ipAddress = 'localhost';
            for (const interfaceName in networkInterfaces) {
                const networkInterface = networkInterfaces[interfaceName];
                for (const info of networkInterface) {
                    if (info.family === 'IPv4' && !info.internal) {
                        ipAddress = info.address;
                        break;
                    }
                }
                if (ipAddress !== 'localhost') break;
            }

            // Prepare registration request with snake_case field names
            const request = {
                node_id: this.nodeId,
                api_key: this.apiKey,
                address: `${ipAddress}:50051`,
                hostname: this.hostname,
                os: os.platform(),
                memory_bytes: os.totalmem(),
                cpu_cores: os.cpus().length,
                ip_address: ipAddress
            };

            console.log('Registering node with request:', {
                ...request,
                api_key: '***' // Hide API key in logs
            });

            // Register with the server
            const response = await new Promise((resolve, reject) => {
                this.client.RegisterNode(request, (error, response) => {
                    if (error) reject(error);
                    else resolve(response);
                });
            });

            if (response.success) {
                this.registered = true;
                console.log('Node registered successfully');
                
                // If this is a new node, register it with the web UI
                if (!isExistingNode) {
                    await this.registerWithWebUI();
                }
                
                this.startHeartbeat();
                return true;
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            console.error('Error registering node:', error);
            return false;
        }
    }

    async registerWithWebUI() {
        try {
            const response = await axios.post(`${this.webUiUrl}/api/nodes`, {
                _id: this.nodeId,
                name: this.hostname,
                address: 'localhost:50051',
                apiKey: this.apiKey,
                status: 'online'
            });
            console.log('Node registered with web UI:', response.data);
        } catch (error) {
            console.error('Error registering with web UI:', error.message);
        }
    }

    startHeartbeat() {
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(async () => {
            try {
                const metrics = this.getSystemMetrics();
                const request = {
                    nodeId: this.nodeId,
                    apiKey: this.apiKey,
                    timestamp: Math.floor(Date.now() / 1000),
                    servers: [], // TODO: Get actual server statuses
                    metrics: {
                        cpuUsage: metrics.cpuUsage,
                        cpuCores: metrics.cpuCores,
                        memoryUsed: metrics.memoryUsed,
                        memoryTotal: metrics.memoryTotal,
                        diskUsage: metrics.diskUsage,
                        networkBytesIn: metrics.networkBytesIn,
                        networkBytesOut: metrics.networkBytesOut
                    }
                };

                await new Promise((resolve, reject) => {
                    this.client.Heartbeat(request, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    });
                });

                // Update web UI with metrics
                await this.updateWebUIMetrics(metrics);
            } catch (error) {
                console.error('Error sending heartbeat:', error);
                // If we get an authentication error, try to re-register
                if (error.code === grpc.status.UNAUTHENTICATED) {
                    this.registered = false;
                    await this.register();
                }
            }
        }, 30000);
    }

    async updateWebUIMetrics(metrics) {
        try {
            await axios.put(`${this.webUiUrl}/api/nodes/${this.nodeId}/status`, {
                lastSeen: Math.floor(Date.now() / 1000),
                metrics: metrics,
                status: 'online'
            });
        } catch (error) {
            console.error('Error updating web UI metrics:', error.message);
        }
    }

    getSystemMetrics() {
        const cpus = os.cpus();
        const totalCpuTime = cpus.reduce((acc, cpu) => {
            return acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
        }, 0);
        const idleCpuTime = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const cpuUsage = ((totalCpuTime - idleCpuTime) / totalCpuTime) * 100;

        return {
            cpuUsage: cpuUsage,
            cpuCores: cpus.length,
            memoryUsed: os.totalmem() - os.freemem(),
            memoryTotal: os.totalmem(),
            diskUsage: 0, // TODO: Implement disk usage
            networkBytesIn: 0, // TODO: Implement network metrics
            networkBytesOut: 0 // TODO: Implement network metrics
        };
    }

    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.registered = false;
    }
}

module.exports = NodeClient; 