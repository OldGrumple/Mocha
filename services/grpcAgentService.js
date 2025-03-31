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

  provisionServer(serverConfig) {
    return new Promise((resolve, reject) => {
      this.client.ProvisionServer(serverConfig, this.metadata(), (err, response) => {
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
}

module.exports = GRPCAgentService;