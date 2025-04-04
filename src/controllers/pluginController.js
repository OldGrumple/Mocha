const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const Server = require('../models/Server');
const SpigetAPI = require('spiget-api').default;
const { Plugin } = require('../models/plugin');

// Initialize Spiget API client with an agent name
const spiget = new SpigetAPI("MochaPluginManager");

/**
 * Get available plugins from Spiget API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const { serverId } = req.params;

    // Validate serverId
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const options = {
      query: search,
      size: parseInt(limit),
      page: parseInt(page) - 1, // Spiget uses 0-based pagination
      sort: '-downloads' // Sort by downloads in descending order
    };

    const resources = await spiget.search('resource', options);
    if (!resources || !Array.isArray(resources)) {
      return res.status(404).json({ message: 'No plugins found' });
    }

    // Get list of installed plugins for this server
    const installedPlugins = await Plugin.find({ serverId });
    const installedPluginIds = new Set(installedPlugins.map(p => p.spigetId));

    const plugins = resources.map(resource => ({
      id: resource.id,
      name: resource.name,
      description: resource.description || '',
      version: resource.version,
      downloads: resource.downloads,
      rating: resource.rating,
      icon: resource.icon ? `https://api.spiget.org/v2/resources/${resource.id}/icon` : null,
      author: resource.author ? resource.author.name : 'Unknown',
      isInstalled: installedPluginIds.has(resource.id)
    }));

    res.json({
      plugins,
      page: parseInt(page),
      limit: parseInt(limit),
      total: plugins.length // Note: Spiget API doesn't provide total count
    });
  } catch (error) {
    console.error('Error fetching available plugins:', error);
    res.status(500).json({ message: 'Error fetching available plugins' });
  }
};

/**
 * Get installed plugins for a server
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getInstalledPlugins = async (req, res) => {
  try {
    const { serverId } = req.params;

    // Validate serverId
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const installedPlugins = await Plugin.find({ serverId });
    const pluginDetails = [];

    for (const plugin of installedPlugins) {
      try {
        const resource = await spiget.getResource(plugin.spigetId);
        if (resource) {
          pluginDetails.push({
            id: resource.id,
            name: resource.name,
            description: resource.description || '',
            version: resource.version,
            downloads: resource.downloads,
            rating: resource.rating,
            icon: resource.icon ? `https://api.spiget.org/v2/resources/${resource.id}/icon` : null,
            author: resource.author ? resource.author.name : 'Unknown',
            installed: true,
            installedVersion: plugin.version,
            enabled: plugin.enabled
          });
        }
      } catch (error) {
        console.error(`Error fetching details for plugin ${plugin.spigetId}:`, error);
        // Include basic info from database if API fetch fails
        pluginDetails.push({
          id: plugin.spigetId,
          name: plugin.name,
          version: plugin.version,
          installed: true,
          installedVersion: plugin.version,
          enabled: plugin.enabled
        });
      }
    }

    res.json({ plugins: pluginDetails });
  } catch (error) {
    console.error('Error fetching installed plugins:', error);
    res.status(500).json({ message: 'Error fetching installed plugins' });
  }
};

/**
 * Install a plugin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.installPlugin = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { pluginId } = req.body;

    // Validate serverId
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if plugin is already installed
    const existingPlugin = await Plugin.findOne({ spigetId: pluginId, serverId });
    if (existingPlugin) {
      return res.status(400).json({ message: 'Plugin is already installed' });
    }
    
    // Get plugin details from Spiget
    const resource = await spiget.getResource(pluginId);
    if (!resource) {
      return res.status(404).json({ message: 'Plugin not found' });
    }

    // Download URL for the plugin
    const downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
    
    // Create plugins directory if it doesn't exist
    const pluginsDir = path.join(__dirname, '..', 'servers', serverId, 'plugins');
    await fs.mkdir(pluginsDir, { recursive: true });

    // Download the plugin file
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'arraybuffer'
    });

    // Save the plugin file
    const pluginFileName = `${resource.name.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const pluginPath = path.join(pluginsDir, pluginFileName);
    await fs.writeFile(pluginPath, response.data);

    // Save plugin information to database
    const plugin = new Plugin({
      name: resource.name,
      spigetId: resource.id,
      version: resource.version,
      serverId: serverId
    });
    await plugin.save();

    res.json({
      message: 'Plugin installed successfully',
      plugin: {
        id: resource.id,
        name: resource.name,
        version: resource.version,
        enabled: true
      }
    });
  } catch (error) {
    console.error('Error installing plugin:', error);
    res.status(500).json({ message: 'Error installing plugin' });
  }
};

/**
 * Uninstall a plugin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uninstallPlugin = async (req, res) => {
  try {
    const { serverId, pluginId } = req.params;

    // Validate serverId
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    // Find and remove plugin from database
    const plugin = await Plugin.findOneAndDelete({ spigetId: pluginId, serverId });
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found in installed plugins' });
    }

    // Remove plugin file if it exists
    const pluginFileName = `${plugin.name.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const pluginPath = path.join(__dirname, '..', 'servers', serverId, 'plugins', pluginFileName);
    try {
      await fs.unlink(pluginPath);
    } catch (error) {
      console.error('Error removing plugin file:', error);
      // Continue even if file removal fails
    }

    res.json({ message: 'Plugin uninstalled successfully' });
  } catch (error) {
    console.error('Error uninstalling plugin:', error);
    res.status(500).json({ message: 'Error uninstalling plugin' });
  }
};