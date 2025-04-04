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
        this.startAttempts = 0;
        this.maxStartAttempts = 3;
    }

    async start() {
        try {
            this.startAttempts++;
            const serverDir = path.join(__dirname, '../servers', this.serverId);
            const startScript = path.join(serverDir, process.platform === 'win32' ? 'start.bat' : 'start.sh');

            // Check if the script exists
            try {
                await fs.access(startScript);
            } catch (error) {
                throw new Error('Server start script not found');
            }

            // Update server.properties with the correct port
            const serverPropertiesPath = path.join(serverDir, 'server.properties');
            try {
                let properties = await fs.readFile(serverPropertiesPath, 'utf8');
                properties = properties.replace(/server-port=\d+/, `server-port=${this.config.port}`);
                await fs.writeFile(serverPropertiesPath, properties);
            } catch (error) {
                console.error('Error updating server.properties:', error);
            }

            // Start the server process
            this.process = spawn(process.platform === 'win32' ? startScript : 'bash',
                process.platform === 'win32' ? [] : [startScript], {
                cwd: serverDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.status = 'starting';
            this.statusMessage = 'Starting server...';
            await this.updateStatus();

            // Handle process events
            this.process.stdout.on('data', async (data) => {
                const output = data.toString();
                this.lastOutput.push(output);
                if (this.lastOutput.length > this.maxOutputLines) {
                    this.lastOutput.shift();
                }

                // Save server output to database
                await this.saveLog('info', output);

                // Check for successful start
                if (output.includes('Done') || output.includes('For help, type "help"')) {
                    this.status = 'running';
                    this.statusMessage = 'Server is running';
                    this.startAttempts = 0; // Reset start attempts on success
                    await this.updateStatus();
                }

                // Check for player count updates
                const playerMatch = output.match(/There are (\d+) of a max of (\d+) players online/);
                if (playerMatch) {
                    this.playerCount = parseInt(playerMatch[1]);
                    await this.updateStatus();
                }

                // Check for player join/leave messages
                if (output.includes('joined the game')) {
                    this.playerCount++;
                    await this.updateStatus();
                } else if (output.includes('left the game')) {
                    this.playerCount = Math.max(0, this.playerCount - 1);
                    await this.updateStatus();
                }

                // Check for common error messages
                if (output.includes('Failed to start server') || 
                    output.includes('Could not load server properties') ||
                    output.includes('Exception in thread "main"')) {
                    this.status = 'error';
                    this.statusMessage = output.split('\n')[0]; // Use first line as error message
                    await this.updateStatus();
                }
            });

            this.process.stderr.on('data', async (data) => {
                const error = data.toString();
                this.lastOutput.push(`[ERROR] ${error}`);
                if (this.lastOutput.length > this.maxOutputLines) {
                    this.lastOutput.shift();
                }
                
                // Save error to database
                await this.saveLog('error', error);
                
                // Update status with error message
                this.status = 'error';
                this.statusMessage = error.split('\n')[0]; // Use first line as error message
                await this.updateStatus();
            });

            this.process.on('exit', async (code) => {
                this.process = null;
                this.status = code === 0 ? 'stopped' : 'error';
                this.statusMessage = `Server stopped (exit code: ${code})`;
                await this.updateStatus();

                // Save exit log to database
                await this.saveLog('info', `Server stopped (exit code: ${code})`);

                // If server failed to start and we haven't exceeded max attempts, try again
                if (code !== 0 && this.startAttempts < this.maxStartAttempts) {
                    console.log(`Server failed to start (attempt ${this.startAttempts}/${this.maxStartAttempts}), retrying...`);
                    await this.start();
                }
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
                await this.saveLog('info', 'Server is already stopped');
                await this.updateStatus('stopped', 'Server is already stopped');
                process.stdout.write(JSON.stringify({ success: true, message: 'Server already stopped' }) + '\n');
                return;
            }

            // Update status to stopping
            await this.updateStatus('stopping', 'Stopping server...');
            await this.saveLog('info', 'Stopping server...');

            // Send stop command to server console
            this.process.stdin.write('stop\n');

            // Create a promise that resolves when the process exits
            const exitPromise = new Promise((resolve) => {
                this.process.once('exit', async (code) => {
                    this.status = 'stopped';
                    this.playerCount = 0;
                    this.process = null;
                    await this.updateStatus('stopped', `Server stopped (exit code: ${code})`);
                    await this.saveLog('info', `Server stopped with exit code ${code}`);
                    resolve();
                });
            });

            // Create a timeout promise
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(async () => {
                    if (this.process) {
                        console.log('Server stop timeout reached, force killing process...');
                        this.process.kill('SIGKILL');
                        this.status = 'stopped';
                        this.playerCount = 0;
                        this.process = null;
                        await this.updateStatus('stopped', 'Server force stopped (timeout)');
                        await this.saveLog('warn', 'Server force stopped due to timeout');
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
            await this.updateStatus('error', `Error stopping server: ${error.message}`);
            await this.saveLog('error', `Failed to stop server: ${error.message}`);
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

    async saveLog(level, message) {
        try {
            // Send log to gRPC server through stdout
            process.stdout.write(JSON.stringify({
                success: true,
                log: {
                    level,
                    message: message.trim()
                }
            }) + '\n');
        } catch (error) {
            console.error('Error saving log:', error);
        }
    }

    async updateStatus(status, message) {
        try {
            // Update status in database
            await axios.put(`http://localhost:3000/api/servers/${this.serverId}/status`, {
                status: status || this.status,
                statusMessage: message || this.statusMessage,
                playerCount: this.playerCount,
                logs: this.lastOutput.map(log => ({
                    level: 'info',
                    message: log,
                    timestamp: new Date()
                }))
            });

            // Also send status update through stdout for gRPC server
            process.stdout.write(JSON.stringify({
                success: true,
                status: {
                    status: status || this.status,
                    statusMessage: message || this.statusMessage,
                    playerCount: this.playerCount,
                    logs: this.lastOutput.map(log => ({
                        level: 'info',
                        message: log,
                        timestamp: new Date()
                    }))
                }
            }) + '\n');
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