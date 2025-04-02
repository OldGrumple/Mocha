const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

class MinecraftServerWorker {
    constructor(serverId, config) {
        this.serverId = serverId;
        this.config = config;
        this.process = null;
        this.status = 'stopped';
        this.statusMessage = 'Server stopped';
        this.playerCount = 0;
        this.lastOutput = [];
        this.maxOutputLines = 100;
    }

    async start() {
        try {
            const serverDir = path.join(__dirname, '../servers', this.serverId);
            const startScript = path.join(serverDir, process.platform === 'win32' ? 'start.bat' : 'start.sh');

            // Check if the script exists
            try {
                await fs.access(startScript);
            } catch (error) {
                throw new Error('Server start script not found');
            }

            // Start the server process
            this.process = spawn(process.platform === 'win32' ? startScript : 'bash',
                process.platform === 'win32' ? [] : [startScript], {
                cwd: serverDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.status = 'starting';
            this.statusMessage = 'Starting server...';

            // Handle process events
            this.process.stdout.on('data', async (data) => {
                const output = data.toString();
                this.lastOutput.push(output);
                if (this.lastOutput.length > this.maxOutputLines) {
                    this.lastOutput.shift();
                }

                // Check for successful start
                if (output.includes('Done') || output.includes('For help, type "help"')) {
                    this.status = 'running';
                    this.statusMessage = 'Server is running';
                    await this.updateStatus();
                }

                // Check for player count updates
                const playerMatch = output.match(/There are (\d+) of a max of (\d+) players online/);
                if (playerMatch) {
                    this.playerCount = parseInt(playerMatch[1]);
                    await this.updateStatus();
                }
            });

            this.process.stderr.on('data', (data) => {
                const error = data.toString();
                this.lastOutput.push(`[ERROR] ${error}`);
                if (this.lastOutput.length > this.maxOutputLines) {
                    this.lastOutput.shift();
                }
            });

            this.process.on('exit', async (code) => {
                this.process = null;
                this.status = 'stopped';
                this.statusMessage = `Server stopped (exit code: ${code})`;
                await this.updateStatus();
            });

            return true;
        } catch (error) {
            this.status = 'error';
            this.statusMessage = `Failed to start server: ${error.message}`;
            await this.updateStatus();
            throw error;
        }
    }

    async stop() {
        try {
            if (!this.process) {
                process.stdout.write(JSON.stringify({ success: true, message: 'Server already stopped' }) + '\n');
                return;
            }

            this.status = 'stopping';
            await this.updateStatus('Stopping server...');

            // Send stop command to server console
            this.process.stdin.write('stop\n');

            // Create a promise that resolves when the process exits
            const exitPromise = new Promise((resolve) => {
                this.process.once('exit', (code) => {
                    this.status = 'stopped';
                    this.playerCount = 0;
                    this.process = null;
                    this.updateStatus(`Server stopped (exit code: ${code})`);
                    resolve();
                });
            });

            // Create a timeout promise
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (this.process) {
                        console.log('Server stop timeout reached, force killing process...');
                        this.process.kill('SIGKILL');
                        this.status = 'stopped';
                        this.playerCount = 0;
                        this.process = null;
                        this.updateStatus('Server force stopped (timeout)');
                        reject(new Error('Server stop timeout reached'));
                    }
                }, 30000); // 30 second timeout
            });

            // Wait for either the process to exit or the timeout to occur
            try {
                await Promise.race([exitPromise, timeoutPromise]);
                process.stdout.write(JSON.stringify({ success: true, message: 'Server stopped successfully' }) + '\n');
            } catch (error) {
                process.stdout.write(JSON.stringify({ success: false, error: error.message }) + '\n');
            }
        } catch (error) {
            console.error('Error stopping server:', error);
            this.status = 'error';
            await this.updateStatus(`Error stopping server: ${error.message}`);
            process.stdout.write(JSON.stringify({ success: false, error: error.message }) + '\n');
        }
    }

    async getStatus() {
        return {
            serverId: this.serverId,
            status: this.status,
            statusMessage: this.statusMessage,
            playerCount: this.playerCount,
            lastOutput: this.lastOutput
        };
    }

    async updateStatus(message) {
        try {
            await axios.put(`http://localhost:3000/api/servers/${this.serverId}/status`, {
                status: this.status,
                playerCount: this.playerCount,
                message: message || this.statusMessage
            });
        } catch (error) {
            console.error('Error updating server status:', error);
        }
    }
}

// Handle command line arguments
if (require.main === module) {
    const [,, serverId, configJson] = process.argv;
    const config = JSON.parse(configJson);

    const worker = new MinecraftServerWorker(serverId, config);

    // Handle stdin messages from parent process
    process.stdin.on('data', async (data) => {
        try {
            const message = JSON.parse(data.toString().trim());
            let response;

            switch (message.command) {
                case 'start':
                    await worker.start();
                    response = { success: true, message: 'Server started successfully' };
                    break;

                case 'stop':
                    await worker.stop();
                    response = { success: true, message: 'Server stopped successfully' };
                    break;

                case 'status':
                    const status = await worker.getStatus();
                    response = { success: true, status };
                    break;

                default:
                    response = { success: false, error: 'Unknown command' };
            }

            // Send response through stdout
            process.stdout.write(JSON.stringify(response) + '\n');
        } catch (error) {
            process.stdout.write(JSON.stringify({ success: false, error: error.message }) + '\n');
        }
    });
}

module.exports = MinecraftServerWorker; 