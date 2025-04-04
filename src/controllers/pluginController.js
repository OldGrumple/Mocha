const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const Server = require('../models/Server');
const { Plugin } = require('../models/plugin');
const Node = require('../models/Node');
const GRPCAgentService = require('../services/grpcAgentService');

// Initialize Spiget API client
let spigetClient = null;

/**
 * Initialize the Spiget API client
 * @returns {Promise<Object>} The Spiget API client
 */
const initSpiget = async () => {
  if (spigetClient) return spigetClient;
  
  try {
    const { SpigetAPI } = await import('mocha-spiget');
    spigetClient = new SpigetAPI();
    console.log('Spiget API initialized successfully');
    return spigetClient;
  } catch (error) {
    console.error('Error initializing Spiget API client:', error);
    throw error;
  }
};

/**
 * Get available plugins from Spiget API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    const { search = '', page = 1, size = 10, sort = '-downloads' } = req.query;
    const { serverId } = req.params;

    // Validate serverId
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Initialize Spiget API
    const spiget = await initSpiget();

    let resources;
    let total = 0;

    try {
      if (search.trim()) {
        // Search for resources by name and tag
        resources = await spiget.searchResources(search.trim(), {
          size: 100, // Get more results for better search coverage
          fields: 'id,name,tag,description,version,downloads,rating,author,icon,updateDate'
        });
        
        // Filter results that match the search term in name or tag (case-insensitive)
        const searchLower = search.trim().toLowerCase();
        resources = resources.filter(resource => 
          resource.name?.toLowerCase().includes(searchLower) ||
          resource.tag?.toLowerCase().includes(searchLower)
        );

        // Apply sorting after filtering
        if (sort.startsWith('-')) {
          const field = sort.substring(1);
          resources.sort((a, b) => (b[field] || 0) - (a[field] || 0));
        } else {
          resources.sort((a, b) => (a[sort] || 0) - (b[sort] || 0));
        }

        // Apply pagination
        total = resources.length;
        const startIndex = (parseInt(page) - 1) * parseInt(size);
        resources = resources.slice(startIndex, startIndex + parseInt(size));
      } else {
        // Get top resources sorted by downloads
        resources = await spiget.getResources({
          page: parseInt(page),
          size: parseInt(size),
          sort: sort.startsWith('-') ? sort.substring(1) : sort,
          order: sort.startsWith('-') ? 'desc' : 'asc',
          fields: 'id,name,tag,description,version,downloads,rating,author,icon,updateDate'
        });
        total = 5000; // Spiget has a large number of plugins, set a reasonable total
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
          description: resource.description || resource.tag || '',
          version: resource.version || { id: 'Unknown', uuid: null },
          downloads: parseInt(resource.downloads) || 0,
          rating: resource.rating || { average: 0, count: 0 },
          icon: resource.icon ? `https://api.spiget.org/v2/resources/${resource.id}/icon` : null,
          author: resource.author ? (typeof resource.author === 'string' ? resource.author : resource.author.name) : 'Unknown',
          isInstalled: installedPluginIds.has(resource.id),
          updateDate: resource.updateDate
        };
      } catch (error) {
        console.error('Error processing plugin:', error);
        return null;
      }
    }).filter(plugin => plugin !== null);

    res.json({
      plugins,
      page: parseInt(page),
      size: parseInt(size),
      total,
      totalPages: Math.ceil(total / parseInt(size))
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

    // Initialize Spiget API
    const spiget = await initSpiget();

    const installedPlugins = await Plugin.find({ serverId });
    const pluginDetails = [];

    for (const plugin of installedPlugins) {
      try {
        // Get resource details
        const resource = await spiget.getResource(plugin.spigetId, { 
          fields: 'id,name,description,version,downloads,rating,author,icon' 
        });
        
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
    
    // Initialize Spiget API
    const spiget = await initSpiget();
    
    // Get plugin details from Spiget
    let resource;
    try {
      resource = await spiget.getResource(pluginId, { fields: 'id,name,version' });
    } catch (error) {
      console.error('Error fetching plugin details:', error);
      return res.status(404).json({ message: 'Plugin not found' });
    }

    if (!resource) {
      return res.status(404).json({ message: 'Plugin not found' });
    }

    // Create new plugin document
    const plugin = new Plugin({
      name: resource.name,
      spigetId: resource.id,
      version: resource.version.id,
      serverId: serverId,
      enabled: true,
      status: 'pending' // Add status field to track installation state
    });

    // Save plugin to database
    await plugin.save();

    // Return success response
    res.json({ 
      message: 'Plugin installation initiated',
      plugin: {
        id: plugin.spigetId,
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.enabled,
        status: plugin.status
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