const path = require('path');
const fs = require('fs').promises;
const { createStartScript } = require('./serverUtils');

async function updateStartupScripts() {
    try {
        const [,, serverId, configJson] = process.argv;
        if (!serverId || !configJson) {
            throw new Error('Missing required arguments: serverId and configJson');
        }

        const config = JSON.parse(configJson);
        const serverDir = path.join(__dirname, '../servers', serverId);

        // Check if server directory exists
        try {
            await fs.access(serverDir);
        } catch (error) {
            throw new Error(`Server directory not found: ${serverDir}`);
        }

        // Update the start scripts
        await createStartScript(serverDir, config);
        console.log('✅ Startup scripts updated successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating startup scripts:', error);
        process.exit(1);
    }
}

// Run the update function if this file is executed directly
if (require.main === module) {
    updateStartupScripts();
}

module.exports = {
    updateStartupScripts
}; 