// backend/services/grpcAgentService.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const packageDefinition = protoLoader.loadSync('./proto/agent.proto', {});
const agentProto = grpc.loadPackageDefinition(packageDefinition).agent;

class GRPCAgentService {
  constructor(node) {
    if (!node.certificate) {
      throw new Error('Node must have valid certificates');
    }

    // Map string server types to proto enum values
    this.serverTypeMap = {
      'vanilla': 0,  // VANILLA
      'forge': 1,    // FORGE
      'fabric': 2,   // FABRIC
      'paper': 3,    // PAPER
      'spigot': 3    // PAPER (since spigot is paper-based)
    };

    let credentials;
    if (process.env.NODE_ENV === 'development') {
      // Use insecure credentials for development
      credentials = grpc.credentials.createInsecure();
    } else {
      // Use SSL credentials for production
      credentials = grpc.credentials.createSsl(
        Buffer.from(node.certificate.publicKey),
        Buffer.from(node.certificate.privateKey)
      );
    }

    this.client = new agentProto.AgentService(node.address, credentials);
    this.node = node;
  }

  metadata() {
    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${this.node.apiKey}`);
    return metadata;
  }

  registerNode() {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        apiKey: this.node.apiKey,
        address: this.node.address
      };
      this.client.RegisterNode(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  provisionServer(serverConfig) {
    return new Promise((resolve, reject) => {
      if (!serverConfig.serverType) {
        reject(new Error('serverType is required'));
        return;
      }

      // Convert string server type to enum value
      const serverTypeEnum = this.serverTypeMap[serverConfig.serverType.toLowerCase()];
      if (typeof serverTypeEnum === 'undefined') {
        reject(new Error(`Invalid server type: ${serverConfig.serverType}`));
        return;
      }

      const request = {
        name: serverConfig.name,
        minecraftVersion: serverConfig.minecraftVersion,
        nodeId: serverConfig.nodeId,
        serverId: serverConfig.serverId,
        apiKey: serverConfig.apiKey,
        plugins: serverConfig.plugins || [],
        config: {
          serverType: serverTypeEnum,
          maxPlayers: serverConfig.maxPlayers || 20,
          difficulty: serverConfig.difficulty || 'normal',
          gameMode: serverConfig.gameMode || 'survival',
          viewDistance: serverConfig.viewDistance || 10,
          spawnProtection: serverConfig.spawnProtection || 16,
          seed: serverConfig.seed || '',
          worldType: serverConfig.worldType || 'default',
          generateStructures: serverConfig.generateStructures !== false,
          memory: serverConfig.memory || 2,
          port: serverConfig.port || 25565
        }
      };

      console.log("Final provisioning request:", JSON.stringify(request, null, 2));
      console.log('Sending gRPC provisioning request:', request);
      this.client.ProvisionServer(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  startServer(instanceId) {
    return new Promise((resolve, reject) => {
      this.client.StartServer({ instanceId }, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  stopServer(instanceId) {
    return new Promise((resolve, reject) => {
      this.client.StopServer({ instanceId }, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  deleteServer(instanceId) {
    return new Promise((resolve, reject) => {
      this.client.DeleteServer({ instanceId }, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  updatePlugins(instanceId, plugins) {
    return new Promise((resolve, reject) => {
      this.client.UpdatePlugins({ instanceId, plugins }, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  getServerStatus(instanceId) {
    return new Promise((resolve, reject) => {
      this.client.GetServerStatus({ instanceId }, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  heartbeat() {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        timestamp: Math.floor(Date.now() / 1000),
        servers: [], // TODO: Get actual server statuses
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
        networkBytesOut: metrics.networkBytesOut
      };
      this.client.UpdateMetrics(request, this.metadata(), (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
}

module.exports = GRPCAgentService;