# API Routes

This module contains all the REST API endpoints for the Mocha backend service.

## Overview

The API routes handle various aspects of the Minecraft server management system, including:
- Node management (creation, status updates, certificate management)
- Server management (creation, configuration, lifecycle)
- Minecraft server types and versions
- Cache management for Minecraft server files

## Main Components

### Node Routes
- `GET /nodes` - List all nodes
- `GET /nodes/:id` - Get specific node details
- `POST /nodes` - Create a new node
- `POST /nodes/:id/generate-api-key` - Generate new API key for a node
- `POST /nodes/:id/regenerate-certificates` - Regenerate node certificates
- `DELETE /nodes/:id` - Delete a node
- `PUT /nodes/:id/status` - Update node status and metrics

### Server Routes
- `GET /servers` - List all servers
- `POST /servers` - Create a new server
- `GET /servers/:id` - Get specific server details
- `POST /servers/:id/start` - Start a server
- `POST /servers/:id/stop` - Stop a server
- `DELETE /servers/:id` - Delete a server
- `GET /servers/:id/status` - Get server status
- `PUT /servers/:id/status` - Update server status

### Server Configuration Routes
- `GET /servers/:id/config` - Get server configuration
- `PUT /servers/:id/config` - Update server configuration

### Minecraft Routes
- `GET /minecraft/types` - Get available server types
- `GET /minecraft/versions/:type` - Get available versions for a server type
- `POST /minecraft/download` - Download server files
- `GET /minecraft/cache` - Get cache contents
- `DELETE /minecraft/cache/:type/:version` - Remove specific cache entry
- `POST /minecraft/cache/clear` - Clear entire cache

## Dependencies
- Express.js
- MongoDB (via Mongoose models)
- gRPC Agent Service
- Minecraft Service

## Error Handling
All routes include proper error handling and return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error

## Security
- Node authentication is handled via API keys and certificates
- Private keys are never exposed in API responses
- Development mode uses localhost for gRPC connections 