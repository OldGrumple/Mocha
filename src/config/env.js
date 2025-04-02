const path = require('path');
const dotenv = require('dotenv');

const loadEnv = () => {
    const env = process.env.NODE_ENV || 'development';
    // Look for env files in the project root
    const envFile = path.resolve(__dirname, '../../config/env/.env.' + env);
    
    const result = dotenv.config({ path: envFile });
    if (result.error) {
        console.warn(`Warning: Could not load environment file ${envFile}`);
        console.warn('Make sure you are running the server from the project root directory');
        // Try to load from the root directory as fallback
        const rootEnvFile = path.resolve(__dirname, '../../../config/env/.env.' + env);
        const rootResult = dotenv.config({ path: rootEnvFile });
        if (rootResult.error) {
            console.warn(`Warning: Could not load environment file ${rootEnvFile}`);
        } else {
            console.log(`Loaded environment: ${env}`);
            console.log(`Environment file: ${rootEnvFile}`);
        }
    } else {
        console.log(`Loaded environment: ${env}`);
        console.log(`Environment file: ${envFile}`);
    }
};

module.exports = { loadEnv }; 