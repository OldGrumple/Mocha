# Services

This directory contains the core service modules for the Mocha backend.

## Overview

The services directory contains several key components that handle different aspects of the Minecraft server management system:

### Core Services

1. **gRPC Server Service** (`grpcServer.js`)
   - Handles gRPC server implementation
   - Manages server lifecycle and operations
   - Processes server status updates and metrics

2. **gRPC Agent Service** (`grpcAgentService.js`)
   - Client-side gRPC service for communicating with agent nodes
   - Handles server provisioning and management
   - Manages secure communication with nodes

3. **Minecraft Service** (`minecraftService.js`)
   - Manages Minecraft server types and versions
   - Handles server file downloads and caching
   - Provides server configuration management

4. **Copy File Worker** (`copyFileWorker.js`)
   - Handles file copying operations
   - Manages file transfer between services

## Directory Structure

```
services/
├── grpcServer.js         # gRPC server implementation
├── grpcAgentService.js   # gRPC client service
├── minecraftService.js   # Minecraft server management
├── copyFileWorker.js     # File operations worker
└── minecraft/           # Minecraft-specific utilities
```

## Dependencies

- gRPC
- Node.js File System
- MongoDB (via Mongoose)
- Express.js

## Security

- Secure communication using gRPC
- Certificate-based authentication
- API key validation
- Secure file operations

## Error Handling

All services implement comprehensive error handling:
- Graceful error recovery
- Detailed error logging
- Proper error propagation
- Status code management

## Development

For development purposes:
- Local development uses localhost for gRPC connections
- Debug logging is available
- Mock services can be used for testing 