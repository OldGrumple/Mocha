# Minecraft Server Repository Service

This service manages a local repository of Minecraft server jar files that can be used by the agent to provision Minecraft servers on nodes.

## Features

- Supports multiple server types:
  - Vanilla Minecraft servers
  - Paper servers
  - Forge servers
  - Fabric servers
- Automatic version management
- Local caching of server jars
- Version validation
- Java version compatibility checking

## Directory Structure

```
services/minecraft/
├── repository/     # Local storage for server jar files
├── versions.json   # Database of available server versions
├── minecraftService.js  # Main service implementation
└── config.js       # Configuration settings
```

## Usage

```javascript
const minecraftService = require('./minecraftService');

// Initialize the service
await minecraftService.initialize();

// Download a server jar
const serverPath = await minecraftService.downloadServerJar('1.20.1', 'paper');

// Validate a server jar
const isValid = await minecraftService.validateServerJar('1.20.1', 'paper');
```

## Server Types

1. **Vanilla**: Official Minecraft server from Mojang
2. **Paper**: High-performance fork of Spigot
3. **Forge**: Modded server with Forge support
4. **Fabric**: Lightweight modding platform

## Configuration

The service can be configured through `config.js`:
- API endpoints for different server types
- Minimum Java version requirements
- Default server properties

## Dependencies

- Node.js 14+
- axios (for HTTP requests)
- fs.promises (for file operations)

## TODO

- [ ] Implement Mojang manifest parsing for vanilla servers
- [ ] Add Paper server download functionality
- [ ] Add Forge server download functionality
- [ ] Add Fabric server download functionality
- [ ] Add server jar validation
- [ ] Add automatic updates
- [ ] Add server type-specific configuration 