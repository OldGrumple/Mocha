// backend/services/gRPCAgentService.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

// Load the agent.proto
const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../proto/agent.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const agentProto = grpc.loadPackageDefinition(packageDefinition).agent;

class GRPCAgentService {
  constructor(node) {
    // Map string server types to proto enum values
    this.serverTypeMap = {
      vanilla: 0,
      forge: 1,
      fabric: 2,
      paper: 3,
      spigot: 3 // treat spigot as paper
    };

    this.node = node;
    this.client = new agentProto.AgentService(
      process.env.GRPC_SERVER || 'localhost:50051',
      grpc.credentials.createInsecure()
    );
  }

  metadata() {
    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${this.node.apiKey}`);
    return metadata;
  }

  registerNode() {
    return new Promise((resolve, reject) => {
      const request = {
        node_id: this.node._id,
        api_key: this.node.apiKey,
        address: this.node.address,
        hostname: this.node.hostname,
        os: this.node.os,
        memory_bytes: this.node.memoryBytes,
        cpu_cores: this.node.cpuCores,
        ip_address: this.node.ipAddress
      };

      this.client.RegisterNode(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  provisionServer(serverConfig) {
    return new Promise((resolve, reject) => {
      const serverTypeEnum = this.serverTypeMap[serverConfig.config.server_type.toLowerCase()];
      if (typeof serverTypeEnum === 'undefined') {
        return reject(new Error(`Invalid server type: ${serverConfig.config.server_type}`));
      }

      const request = {
        name: serverConfig.config.server_name,
        minecraftVersion: serverConfig.minecraft_version,
        nodeId: this.node._id,
        serverId: serverConfig.server_id,
        apiKey: this.node.apiKey,
        plugins: serverConfig.plugins || [],
        config: {
          serverType: serverTypeEnum,
          memory: serverConfig.config.memory,
          difficulty: serverConfig.config.difficulty,
          gameMode: serverConfig.config.game_mode,
          maxPlayers: serverConfig.config.max_players,
          port: serverConfig.config.port,
          viewDistance: serverConfig.config.view_distance,
          spawnProtection: serverConfig.config.spawn_protection,
          seed: serverConfig.config.seed,
          worldType: serverConfig.config.world_type,
          generateStructures: serverConfig.config.generate_structures
        }
      };

      console.log("Final provisioning request (agent.proto):", JSON.stringify(request, null, 2));

      this.client.ProvisionServer(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  startServer(serverId) {
    return new Promise((resolve, reject) => {
      const request = {
        instanceId: serverId,
        serverId,
        nodeId: this.node._id,
        apiKey: this.node.apiKey,
        action: 'start'
      };

      this.client.StartServer(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  stopServer(serverId) {
    return new Promise((resolve, reject) => {
      const request = {
        instanceId: serverId,
        serverId,
        nodeId: this.node._id,
        apiKey: this.node.apiKey,
        action: 'stop'
      };

      this.client.StopServer(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  deleteServer(serverId) {
    return new Promise((resolve, reject) => {
      const request = {
        instanceId: serverId,
        serverId,
        nodeId: this.node._id,
        apiKey: this.node.apiKey,
        action: 'delete'
      };

      this.client.DeleteServer(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  updatePlugins(serverId, plugins) {
    return new Promise((resolve, reject) => {
      const request = {
        instanceId: serverId,
        serverId,
        nodeId: this.node._id,
        apiKey: this.node.apiKey,
        plugins: plugins || []
      };

      this.client.UpdatePlugins(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  getServerStatus(serverId) {
    return new Promise((resolve, reject) => {
      const request = {
        instanceId: serverId,
        serverId,
        nodeId: this.node._id,
        apiKey: this.node.apiKey
      };

      this.client.GetServerStatus(request, this.metadata(), (err, response) => {
        if (err) {
          // If the error is NOT_FOUND, resolve with a stopped status
          if (err.code === grpc.status.NOT_FOUND) {
            resolve({
              status: 'stopped',
              statusMessage: 'Server not found',
              playerCount: 0
            });
            return;
          }
          reject(err);
          return;
        }
        
        // If the response indicates the server is stopped or error, update the local state
        if (response.status === 'stopped' || response.status === 'error') {
          // You might want to update any local state here if needed
          console.log(`Server ${serverId} is ${response.status}: ${response.statusMessage}`);
        }
        
        resolve(response);
      });
    });
  }

  heartbeat() {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        timestamp: Math.floor(Date.now() / 1000),
        servers: [], // You can fill this with actual server states if available
        metrics: {
          cpuUsage: 0,
          cpuCores: 0,
          memoryUsed: 0,
          memoryTotal: 0,
          diskUsage: 0,
          networkBytesIn: 0,
          networkBytesOut: 0
        },
        apiKey: this.node.apiKey
      };

      this.client.Heartbeat(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  updateMetrics(metrics) {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        cpuUsage: metrics.cpuUsage,
        cpuCores: metrics.cpuCores,
        memoryUsed: metrics.memoryUsed,
        memoryTotal: metrics.memoryTotal,
        diskUsage: metrics.diskUsage,
        networkBytesIn: metrics.networkBytesIn,
        networkBytesOut: metrics.networkBytesOut,
        apiKey: this.node.apiKey
      };

      this.client.UpdateMetrics(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  updateCredentials(apiKey, certificates) {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        apiKey,
        certificates: {
          publicKey: certificates.publicKey,
          privateKey: certificates.privateKey
        }
      };

      this.client.UpdateCredentials(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  installJava() {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id
      };

      this.client.InstallJava(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
}

module.exports = GRPCAgentService;
