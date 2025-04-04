const [,, serverTypeArg, minecraftVersion, serverId, configJson] = process.argv;
const minecraftService = require('./minecraftService');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const MinecraftCache = require('../models/MinecraftCache');
const mongoose = require('mongoose');
const { createStartScript, createEULA, generateServerProperties } = require('./serverUtils');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected in download worker');
  downloadServer();
}).catch(err => {
  console.error('❌ MongoDB connection error in worker:', err);
  process.exit(1);
});

async function writeProgress(serverId, progress, status, message) {
  const progressPath = path.join(__dirname, '../servers', serverId, 'download_progress.json');
  await fs.writeFile(progressPath, JSON.stringify({
    progress,
    status,
    message,
    timestamp: Date.now()
  }));
}

async function copyFile(source, destination) {
  try {
    await fs.copyFile(source, destination);
  } catch (error) {
    console.error(`Error copying file from ${source} to ${destination}:`, error);
    throw error;
  }
}

async function downloadServer() {
  try {
    if (!serverTypeArg || !minecraftVersion || !serverId) {
      throw new Error('Missing required arguments: serverType, version, serverId');
    }

    const serverType = serverTypeArg.toLowerCase(); // ✅ Normalize casing for DB
    const config = configJson ? JSON.parse(configJson) : {
      serverName: 'Minecraft Server',
      maxPlayers: 20,
      difficulty: 'normal',
      gameMode: 'survival',
      viewDistance: 10,
      spawnProtection: 16,
      seed: '',
      worldType: 'default',
      generateStructures: true,
      memory: 2
    };

    const serverDir = path.join(__dirname, '../servers', serverId);
    await fs.mkdir(serverDir, { recursive: true });

    await writeProgress(serverId, 0, 'downloading', 'Starting download...');

    const cachedEntry = await MinecraftCache.findOne({ type: serverType, version: minecraftVersion });
    if (cachedEntry) {
      console.log(`📦 Found cached server: ${cachedEntry.path}`);
      await writeProgress(serverId, 30, 'downloading', 'Found cached server, copying...');
      await copyFile(cachedEntry.path, path.join(serverDir, 'server.jar'));
      await cachedEntry.updateLastAccessed();
      await writeProgress(serverId, 50, 'downloading', 'Copied from cache');
    } else {
      console.log(`⬇️ Downloading ${serverType} ${minecraftVersion}`);
      await writeProgress(serverId, 10, 'downloading', 'Downloading server...');
      const serverPath = await minecraftService.downloadServer(serverType, minecraftVersion);
      await writeProgress(serverId, 50, 'downloading', 'Downloaded. Copying...');
      await copyFile(serverPath, path.join(serverDir, 'server.jar'));
    }

    await fs.access(path.join(serverDir, 'server.jar'), fs.constants.R_OK);
    await writeProgress(serverId, 60, 'setup', 'Creating configs...');
    await generateServerProperties(config, serverDir);
    await writeProgress(serverId, 70, 'setup', 'Generated server.properties');
    await createEULA(serverDir);
    await writeProgress(serverId, 80, 'setup', 'Accepted EULA');
    
    // Use the proper createStartScript function from serverUtils.js
    await createStartScript(serverDir, {
      ...config,
      minecraftVersion
    });
    await writeProgress(serverId, 90, 'setup', 'Created start scripts');
    await writeProgress(serverId, 100, 'completed', 'Server setup completed ✅');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up server:', error);
    if (serverId) {
      await writeProgress(serverId, 0, 'error', `Setup failed: ${error.message}`);
    }
    process.exit(1);
  }
}
