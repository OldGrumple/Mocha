// backend/services/gRPCAgentService.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs/promises');

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

  async provisionServer(serverConfig) {
    return new Promise((resolve, reject) => {
      this.client.ProvisionServer(
        {
          serverId: serverConfig.server_id,
          minecraftVersion: serverConfig.minecraft_version,
          config: {
            ...serverConfig.config,
            port: serverConfig.config.port || 25565 // Ensure port is included in the config
          },
          plugins: serverConfig.plugins || [],
          nodeId: this.node._id,
          apiKey: this.node.apiKey
        },
        this.metadata(),
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            // Update server.properties with the correct port
            this.updateServerProperties(serverConfig.server_id, response.port)
              .then(() => {
                resolve(response);
              })
              .catch(err => {
                console.error('Error updating server.properties:', err);
                // Still resolve even if properties update fails
                resolve(response);
              });
          }
        }
      );
    });
  }

  // Helper method to update server.properties with the correct port
  async updateServerProperties(serverId, port) {
    try {
      const serverDir = path.join(__dirname, '../servers', serverId);
      const serverPropertiesPath = path.join(serverDir, 'server.properties');
      
      // Check if the file exists
      try {
        await fs.access(serverPropertiesPath);
      } catch (error) {
        console.log('server.properties not found, will be created during server provisioning');
        return;
      }
      
      // Read and update the file
      let properties = await fs.readFile(serverPropertiesPath, 'utf8');
      properties = properties.replace(/server-port=\d+/, `server-port=${port}`);
      await fs.writeFile(serverPropertiesPath, properties);
      console.log(`Updated server.properties for server ${serverId} with port ${port}`);
    } catch (error) {
      console.error('Error updating server.properties:', error);
      throw error;
    }
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
        if (err) {
          // If the error is NOT_FOUND, reject with appropriate error
          if (err.code === grpc.status.NOT_FOUND) {
            reject(new Error('Server not found'));
            return;
          }
          reject(err);
          return;
        }
        
        // If the response indicates success, resolve with the response
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message || 'Failed to start server'));
        }
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
        if (err) {
          // If the error is NOT_FOUND, resolve with a stopped status
          if (err.code === grpc.status.NOT_FOUND) {
            resolve({
              success: true,
              message: 'Server not found',
              status: 'stopped',
              statusMessage: 'Server not found'
            });
            return;
          }
          reject(err);
          return;
        }
        
        // If the response indicates success, resolve with the response
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message || 'Failed to stop server'));
        }
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

  forceKillAllServers() {
    return new Promise((resolve, reject) => {
      const request = {
        nodeId: this.node._id,
        apiKey: this.node.apiKey
      };

      this.client.ForceKillAllServers(request, this.metadata(), (err, response) => {
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
          // If the error is NOT_FOUND, check the database for the actual status
          if (err.code === grpc.status.NOT_FOUND) {
            // Use axios to get the server status from the database
            axios.get(`http://localhost:3000/api/servers/${serverId}`)
              .then(dbResponse => {
                const server = dbResponse.data.server;
                resolve({
                  status: server.status || 'stopped',
                  statusMessage: server.statusMessage || 'Server is stopped',
                  playerCount: server.playerCount || 0
                });
              })
              .catch(dbError => {
                console.error('Error fetching server status from database:', dbError);
                resolve({
                  status: 'stopped',
                  statusMessage: 'Server not found',
                  playerCount: 0
                });
              });
            return;
          }
          reject(err);
          return;
        }
        
        // If we get a response, validate it against the database state
        axios.get(`http://localhost:3000/api/servers/${serverId}`)
          .then(dbResponse => {
            const server = dbResponse.data.server;
            // If the gRPC status doesn't match the database status, prefer the database status
            if (server.status && server.status !== response.status) {
              console.log(`Status mismatch - gRPC: ${response.status}, DB: ${server.status}`);
              resolve({
                status: server.status,
                statusMessage: server.statusMessage || response.statusMessage,
                playerCount: server.playerCount || response.playerCount || 0
              });
            } else {
              resolve(response);
            }
          })
          .catch(dbError => {
            console.error('Error validating server status against database:', dbError);
            // If we can't validate against the database, return the gRPC response
            resolve(response);
          });
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
