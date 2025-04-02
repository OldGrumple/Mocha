const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Required files for deployment
const REQUIRED_FILES = [
    'scripts/runNode.js',
    'src/services/nodeClient.js',
    'src/proto/agent.proto',
    'ecosystem.node.config.js',
    'config/env/node.env',
    'package.json'
];

// Required dependencies
const REQUIRED_DEPENDENCIES = [
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'dotenv',
    'uuid',
    'axios'
];

async function checkPrerequisites() {
    console.log('Checking prerequisites...');
    
    // Check if Node.js is installed
    try {
        execSync('node --version', { stdio: 'ignore' });
    } catch (error) {
        throw new Error('Node.js is not installed. Please install Node.js first.');
    }

    // Check if npm is installed
    try {
        execSync('npm --version', { stdio: 'ignore' });
    } catch (error) {
        throw new Error('npm is not installed. Please install npm first.');
    }

    // Check if PM2 is installed globally
    try {
        execSync('pm2 --version', { stdio: 'ignore' });
    } catch (error) {
        console.log('PM2 is not installed globally. Installing...');
        execSync('npm install -g pm2', { stdio: 'inherit' });
    }

    console.log('✓ Prerequisites check passed');
}

async function createDirectoryStructure(targetDir) {
    console.log('Creating directory structure...');
    
    const dirs = [
        'scripts',
        'src/services',
        'src/proto',
        'config/env'
    ];

    for (const dir of dirs) {
        const fullPath = path.join(targetDir, dir);
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
    }

    console.log('✓ Directory structure created');
}

async function copyFiles(sourceDir, targetDir) {
    console.log('Copying files...');
    
    for (const file of REQUIRED_FILES) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        try {
            await fs.copyFile(sourcePath, targetPath);
            console.log(`✓ Copied: ${file}`);
        } catch (error) {
            throw new Error(`Failed to copy ${file}: ${error.message}`);
        }
    }

    console.log('✓ Files copied successfully');
}

async function installDependencies(targetDir) {
    console.log('Installing dependencies...');
    
    try {
        // Create a minimal package.json if it doesn't exist
        const packageJsonPath = path.join(targetDir, 'package.json');
        try {
            await fs.access(packageJsonPath);
        } catch {
            const packageJson = {
                name: 'mocha-node',
                version: '1.0.0',
                private: true,
                dependencies: {}
            };
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }

        // Install required dependencies
        execSync(`cd ${targetDir} && npm install ${REQUIRED_DEPENDENCIES.join(' ')}`, { stdio: 'inherit' });
        console.log('✓ Dependencies installed');
    } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
    }
}

async function setupEnvironment(targetDir) {
    console.log('Setting up environment...');
    
    const envPath = path.join(targetDir, 'config/env/node.env');
    try {
        await fs.access(envPath);
        console.log('✓ Environment file already exists');
    } catch {
        // Create a default environment file
        const defaultEnv = `# Node Configuration
GRPC_SERVER=localhost:50051
WEB_UI_URL=http://localhost:3000

# Node Settings
NODE_ENV=development
LOG_LEVEL=info`;
        
        await fs.writeFile(envPath, defaultEnv);
        console.log('✓ Created default environment file');
    }
}

async function startNode(targetDir) {
    console.log('Starting node client...');
    
    try {
        execSync(`cd ${targetDir} && pm2 start ecosystem.node.config.js`, { stdio: 'inherit' });
        console.log('✓ Node client started successfully');
    } catch (error) {
        throw new Error(`Failed to start node client: ${error.message}`);
    }
}

async function main() {
    try {
        const targetDir = process.argv[2] || '.';
        const sourceDir = path.resolve(__dirname, '..');

        console.log('Starting node client deployment...');
        console.log(`Source directory: ${sourceDir}`);
        console.log(`Target directory: ${targetDir}`);

        await checkPrerequisites();
        await createDirectoryStructure(targetDir);
        await copyFiles(sourceDir, targetDir);
        await installDependencies(targetDir);
        await setupEnvironment(targetDir);
        await startNode(targetDir);

        console.log('\nDeployment completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Edit config/env/node.env to set your GRPC_SERVER and WEB_UI_URL');
        console.log('2. Restart the node client: pm2 restart mocha-node');
        console.log('3. Check the logs: pm2 logs mocha-node');
    } catch (error) {
        console.error('\nDeployment failed:', error.message);
        process.exit(1);
    }
}

main(); 