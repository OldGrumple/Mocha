const { Plugin } = require('../models/plugin');
const Server = require('../models/Server');
const Node = require('../models/Node');

class PluginService {
  constructor() {
    this.installationQueue = new Map();
  }

  /**
   * Process pending plugin installations
   */
  async processPendingInstallations() {
    try {
      // Find all plugins with 'pending' status
      const pendingPlugins = await Plugin.find({ status: 'pending' });
      
      for (const plugin of pendingPlugins) {
        // Skip if already being processed
        if (this.installationQueue.has(plugin._id)) {
          continue;
        }

        // Mark as being processed
        this.installationQueue.set(plugin._id, true);

        try {
          await this.installPlugin(plugin);
        } catch (error) {
          console.error(`Error installing plugin ${plugin._id}:`, error);
          // Update plugin status to failed
          await Plugin.findByIdAndUpdate(plugin._id, { 
            status: 'failed',
            error: error.message
          });
        } finally {
          // Remove from queue
          this.installationQueue.delete(plugin._id);
        }
      }
    } catch (error) {
      console.error('Error processing pending installations:', error);
    }
  }

  /**
   * Install a plugin on a server
   * @param {Object} plugin - The plugin document
   */
  async installPlugin(plugin) {
    // Get the server
    const server = await Server.findById(plugin.serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    // Get the node
    const node = await Node.findById(server.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Initialize gRPC agent service
    const grpcAgentService = new GRPCAgentService(node);

    // Get all plugins for this server
    const serverPlugins = await Plugin.find({ serverId: server._id });
    
    // Format plugins for gRPC call
    const pluginsList = serverPlugins.map(p => ({
      id: p.spigetId,
      name: p.name,
      version: p.version,
      enabled: p.enabled
    }));

    // Update plugin status to installing
    await Plugin.findByIdAndUpdate(plugin._id, { status: 'installing' });

    // Call gRPC service to install plugin
    await grpcAgentService.updatePlugins(server._id, pluginsList);

    // Update plugin status to installed
    await Plugin.findByIdAndUpdate(plugin._id, { 
      status: 'installed',
      error: null
    });
  }

  /**
   * Start the plugin installation service
   */
  start() {
    // Process pending installations every 30 seconds
    setInterval(() => this.processPendingInstallations(), 30000);
    
    // Initial processing
    this.processPendingInstallations();
  }
}

module.exports = new PluginService(); 