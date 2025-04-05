const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const Server = require('../models/Server');
const Plugin = require('../models/plugin');

// Initialize Spiget API client with dynamic import
let spiget = null;

// Function to initialize the Spiget API client
const initSpiget = async () => {
  if (spiget) return spiget;
  
  try {
    const { Resources, Authors } = await import('mocha-spiget');
    // Create instances of the modules
    const resources = new Resources('https://api.spiget.org/v2');
    const authors = new Authors('https://api.spiget.org/v2');
    
    // Create a wrapper for compatibility
    spiget = {
      searchResources: async (query, options) => {
        return resources.searchResources(query, options);
      },
      getResources: async (options) => {
        return resources.getResources(options);
      },
      getResource: async (id, fields) => {
        return resources.getResource(id, { fields });
      },
      getDownloadUrl: async (resourceId, options = {}) => {
        return resources.getDownloadUrl(resourceId, options);
      }
    };
    
    console.log('Spiget API initialized successfully');
    return spiget;
  } catch (error) {
    console.error('Error initializing Spiget API client:', error);
    // Create a fallback implementation
    spiget = {
      searchResources: async () => {
        console.error('Spiget API not available');
        return [];
      },
      getResource: async () => {
        console.error('Spiget API not available');
        return null;
      },
      getDownloadUrl: async () => {
        console.error('Spiget API not available');
        return null;
      }
    };
    return spiget;
  }
};

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

    // Initialize Spiget API if not already initialized
    const spigetClient = await initSpiget();

    let resources;
    try {
      if (search) {
        // Use searchResources method as per README
        resources = await spigetClient.searchResources(search, {
          page: parseInt(page),
          size: parseInt(limit),
          sort: 'downloads',
          order: 'desc',
          fields: 'id,name,description,version,downloads,rating,author,icon'
        });
      } else {
        // Use getResources method as per README
        resources = await spigetClient.getResources({
          page: parseInt(page),
          size: parseInt(limit),
          sort: 'downloads',
          order: 'desc',
          fields: 'id,name,description,version,downloads,rating,author,icon'
        });
      }
    } catch (error) {
      console.error('Error searching Spiget API:', error);
      return res.status(500).json({ message: 'Error searching Spiget API' });
    }

    if (!resources || !Array.isArray(resources)) {
      return res.status(404).json({ message: 'No plugins found' });
    }

    // Get list of installed plugins for this server
    const installedPlugins = await Plugin.find({ serverId });
    const installedPluginIds = new Set(installedPlugins.map(p => p.spigetId));

    const plugins = resources.map(resource => {
      try {
        return {
          id: resource.id,
          name: resource.name || 'Unknown Plugin',
          description: resource.description || '',
          version: resource.version || 'Unknown',
          downloads: resource.downloads || 0,
          rating: resource.rating || 0,
          icon: resource.icon ? `https://api.spiget.org/v2/resources/${resource.id}/icon` : null,
          author: resource.author ? (typeof resource.author === 'string' ? resource.author : resource.author.name) : 'Unknown',
          isInstalled: installedPluginIds.has(resource.id)
        };
      } catch (error) {
        console.error('Error processing plugin:', error);
        return null;
      }
    }).filter(plugin => plugin !== null);

    res.json({
      plugins,
      page: parseInt(page),
      limit: parseInt(limit),
      total: plugins.length
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

    // Initialize Spiget API if not already initialized
    const spigetClient = await initSpiget();

    const installedPlugins = await Plugin.find({ serverId });
    const pluginDetails = [];

    for (const plugin of installedPlugins) {
      try {
        // Use getResource method as per README
        const resource = await spigetClient.getResource(plugin.spigetId, 'id,name,description,version,downloads,rating,author,icon');
        if (resource) {
          pluginDetails.push({
            id: resource.id,
            name: resource.name || plugin.name,
            description: resource.description || '',
            version: resource.version || plugin.version,
            downloads: resource.downloads || 0,
            rating: resource.rating || 0,
            icon: resource.icon ? `https://api.spiget.org/v2/resources/${resource.id}/icon` : null,
            author: resource.author ? (typeof resource.author === 'string' ? resource.author : resource.author.name) : 'Unknown',
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
    
    // Initialize Spiget API if not already initialized
    const spigetClient = await initSpiget();
    
    // Get plugin details from Spiget
    let resource;
    try {
      // Use getResource method as per README
      resource = await spigetClient.getResource(pluginId, 'id,name,version');
    } catch (error) {
      console.error('Error fetching plugin details:', error);
      return res.status(404).json({ message: 'Plugin not found' });
    }

    if (!resource) {
      return res.status(404).json({ message: 'Plugin not found' });
    }

    // Get download URL using getDownloadUrl method as per README
    const downloadUrl = await spigetClient.getDownloadUrl(pluginId);
    if (!downloadUrl) {
      return res.status(404).json({ message: 'Plugin download URL not available' });
    }
    
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
    const pluginFileName = `${(resource.name || 'plugin').replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const pluginPath = path.join(pluginsDir, pluginFileName);
    await fs.writeFile(pluginPath, response.data);

    // Save plugin information to database
    const plugin = new Plugin({
      name: resource.name || 'Unknown Plugin',
      spigetId: resource.id,
      version: resource.version || 'Unknown',
      serverId: serverId
    });
    await plugin.save();

    res.json({
      message: 'Plugin installed successfully',
      plugin: {
        id: resource.id,
        name: resource.name || 'Unknown Plugin',
        version: resource.version || 'Unknown',
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