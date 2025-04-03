const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { createStartScript, createEULA, generateServerProperties } = require('./serverUtils');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected in setup worker');
  setupServer();
}).catch(err => {
  console.error('❌ MongoDB connection error in worker:', err);
  process.exit(1);
});

async function writeProgress(serverId, progress, status, message) {
  const progressPath = path.join(__dirname, '../servers', serverId, 'setup_progress.json');
  await fs.writeFile(progressPath, JSON.stringify({
    progress,
    status,
    message,
    timestamp: Date.now()
  }));
}

async function setupServer() {
  try {
    const [,, serverId, configJson] = process.argv;
    if (!serverId) {
      throw new Error('Missing serverId argument');
    }

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

    await writeProgress(serverId, 0, 'setup', 'Starting server setup...');

    // Check if server.jar exists
    try {
      await fs.access(path.join(serverDir, 'server.jar'), fs.constants.R_OK);
    } catch (error) {
      throw new Error('server.jar not found. Please download the server first.');
    }

    await writeProgress(serverId, 20, 'setup', 'Creating configs...');
    await generateServerProperties(config, serverDir);
    await writeProgress(serverId, 40, 'setup', 'Generated server.properties');
    
    await createEULA(serverDir);
    await writeProgress(serverId, 60, 'setup', 'Accepted EULA');
    
    await createStartScript(serverDir, config);
    await writeProgress(serverId, 80, 'setup', 'Created start scripts');

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

module.exports = {
  generateServerProperties,
  createEULA,
  setupServer
}; 