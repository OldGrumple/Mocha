const fs = require('fs').promises;
const path = require('path');
const { createStartScript } = require('./grpcServer');

async function updateStartupScripts(serverDir, config) {
    try {
        // Use the proper createStartScript function from grpcServer.js
        await createStartScript(serverDir, config);
        console.log('Startup scripts updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating startup scripts:', error);
        process.exit(1);
    }
}

// Handle command line arguments
if (require.main === module) {
    const [serverDir, configJson] = process.argv.slice(2);
    if (!serverDir || !configJson) {
        console.error('Missing required arguments: serverDir and configJson');
        process.exit(1);
    }

    try {
        const config = JSON.parse(configJson);
        updateStartupScripts(serverDir, config);
    } catch (error) {
        console.error('Error parsing config:', error);
        process.exit(1);
    }
}

module.exports = {
    updateStartupScripts
}; 