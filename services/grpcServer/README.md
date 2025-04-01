# gRPC Server Service

This service implements the gRPC server functionality for the Mocha backend, handling communication with agent nodes and managing Minecraft server operations.

## Overview

The gRPC server service is responsible for:
- Managing gRPC server lifecycle
- Handling server provisioning requests
- Processing server status updates
- Managing server metrics and health checks
- Coordinating server operations across nodes

## Key Features

### Server Management
- Server provisioning and deployment
- Server lifecycle management (start/stop/delete)
- Resource allocation and monitoring
- Status tracking and updates

### Node Communication
- Secure communication with agent nodes
- Certificate-based authentication
- API key validation
- Heartbeat monitoring

### Metrics Collection
- CPU usage monitoring
- Memory utilization tracking
- Disk usage monitoring
- Network traffic analysis

## API Endpoints

### Server Operations
```protobuf
service ServerService {
  rpc ProvisionServer (ProvisionRequest) returns (ProvisionResponse);
  rpc StartServer (StartRequest) returns (StartResponse);
  rpc StopServer (StopRequest) returns (StopResponse);
  rpc DeleteServer (DeleteRequest) returns (DeleteResponse);
  rpc GetServerStatus (StatusRequest) returns (StatusResponse);
}
```

### Node Operations
```protobuf
service NodeService {
  rpc UpdateNodeStatus (StatusUpdate) returns (StatusResponse);
  rpc GetNodeMetrics (MetricsRequest) returns (MetricsResponse);
}
```

## Configuration

The service can be configured through environment variables:
- `GRPC_PORT`: Port for gRPC server (default: 50051)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging verbosity

## Security

- TLS/SSL encryption for all communications
- Certificate-based authentication
- API key validation
- Secure credential management

## Error Handling

Comprehensive error handling for:
- Network failures
- Authentication errors
- Resource constraints
- Invalid requests
- Server operation failures

## Development

For local development:
- Uses localhost for testing
- Debug logging enabled
- Mock services available
- Test certificates provided

## Dependencies

- gRPC
- Node.js
- MongoDB
- Express.js
- TLS/SSL libraries 