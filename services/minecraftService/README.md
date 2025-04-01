# Minecraft Service

This service manages Minecraft server types, versions, and file management in the Mocha backend.

## Overview

The Minecraft service is responsible for:
- Managing Minecraft server types and versions
- Handling server file downloads
- Managing server file caching
- Providing server configuration management
- Coordinating server file operations

## Key Features

### Server Management
- Server type management
- Version tracking
- File organization
- Configuration handling
- Resource management

### File Operations
- Server file downloads
- Cache management
- File verification
- Directory structure
- File cleanup

### Version Management
- Version listing
- Version compatibility
- Update tracking
- Version validation
- Dependency management

## API Methods

```javascript
class MinecraftService {
  getServerTypes()
  getVersions(type)
  downloadServer(type, version)
  getCacheContents()
  removeFromCache(type, version)
  clearCache()
}
```

## Configuration

The service can be configured through:
- Environment variables
- Cache directory settings
- Download settings
- Version management
- File organization

## Cache Management

Features:
- Automatic cache cleanup
- Version-specific caching
- Cache verification
- Cache size management
- Cache invalidation

## Error Handling

Comprehensive error handling for:
- Download failures
- Cache errors
- Version conflicts
- File system errors
- Network issues

## Development

For local development:
- Local cache support
- Debug logging
- Mock downloads
- Test files

## Dependencies

- Node.js File System
- HTTP/HTTPS
- Cache management
- Version control
- File verification

## Usage Example

```javascript
const minecraftService = require('./services/minecraftService');

// Get available server types
const types = await minecraftService.getServerTypes();

// Get versions for a specific type
const versions = await minecraftService.getVersions('vanilla');

// Download a specific server
const filePath = await minecraftService.downloadServer('vanilla', '1.19.2');

// Manage cache
const cacheContents = await minecraftService.getCacheContents();
await minecraftService.removeFromCache('vanilla', '1.19.2');
```

## File Structure

```
cache/
├── vanilla/
│   ├── 1.19.2/
│   │   ├── server.jar
│   │   └── config.json
│   └── 1.18.2/
└── paper/
    └── 1.19.2/
```

## Security Considerations

- File integrity verification
- Secure downloads
- Access control
- Cache security
- Version validation 