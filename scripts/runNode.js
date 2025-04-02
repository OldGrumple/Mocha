const NodeClient = require('../services/nodeClient');
require('dotenv').config();

async function main() {
    try {
        // Create node client with web UI URL from environment
        const nodeClient = new NodeClient(
            process.env.GRPC_SERVER || 'localhost:50051',
            process.env.WEB_UI_URL || 'http://localhost:3000'
        );
        
        // Register the node
        const registered = await nodeClient.register();
        if (!registered) {
            console.error('Failed to register node');
            process.exit(1);
        }

        // Handle process termination
        process.on('SIGINT', () => {
            console.log('Stopping node client...');
            nodeClient.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('Stopping node client...');
            nodeClient.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error running node client:', error);
        process.exit(1);
    }
}

main(); 