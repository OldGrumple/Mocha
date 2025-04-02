# gRPC Agent Service

This service implements the client-side gRPC functionality for communicating with agent nodes in the Mocha backend.

## Overview

The gRPC agent service is responsible for:
- Establishing secure connections with agent nodes
- Managing server provisioning requests
- Handling server lifecycle operations
- Processing node status updates
- Managing secure communication channels

## Key Features

### Node Communication
- Secure gRPC client implementation
- Certificate-based authentication
- API key validation
- Connection management
- Retry mechanisms

### Server Operations
- Server provisioning
- Server lifecycle management
- Status monitoring
- Resource allocation
- Operation coordination

### Security
- TLS/SSL encryption
- Certificate validation
- API key management
- Secure credential handling
- Authentication flow

## API Methods

```javascript
class GRPCAgentService {
  constructor(node)
  provisionServer(config)
  startServer(instanceId)
  stopServer(instanceId)
  deleteServer(instanceId)
  getServerStatus(instanceId)
}
```

## Configuration

The service can be configured through:
- Node configuration object
- Environment variables
- Certificate paths
- API key management

## Error Handling

Comprehensive error handling for:
- Connection failures
- Authentication errors
- Operation timeouts
- Invalid responses
- Network issues

## Development

For local development:
- Localhost testing support
- Debug logging
- Mock responses
- Test certificates

## Dependencies

- gRPC
- Node.js
- TLS/SSL libraries
- Certificate management
- API key handling

## Usage Example

```javascript
const node = {
  address: 'localhost:50051',
  apiKey: 'your-api-key',
  certificate: {
    publicKey: 'your-public-key'
  }
};

const agentService = new GRPCAgentService(node);

// Provision a new server
const serverConfig = {
  name: 'My Minecraft Server',
  version: '1.19.2',
  // ... other config options
};

const response = await agentService.provisionServer(serverConfig);
```

## Security Considerations

- Always use secure connections
- Validate certificates
- Protect API keys
- Implement proper error handling
- Use environment variables for sensitive data 