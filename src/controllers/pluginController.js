const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const Server = require('../models/Server');
const SpigetAPI = require('spiget-api').default;

// Initialize Spiget API client with an agent name
const spiget = new SpigetAPI("MochaPluginManager");

/**
 * Get available plugins from Spiget API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    const { search, page = 1, size = 20 } = req.query;
    
    let plugins;
    let total;
    
    // Use the appropriate method based on whether a search term is provided
    if (search) {
      const searchResults = await spiget.search('resource', {
        query: search,
        page: parseInt(page),
        size: parseInt(size),
        sort: '-downloads'
      });
      plugins = searchResults.data;
      total = searchResults.total;
    } else {
      const resources = await spiget.getResources({
        page: parseInt(page),
        size: parseInt(size),
        sort: '-downloads'
      });
      plugins = resources.data;
      total = resources.total;
    }
    
    // Transform the response to match our expected format
    const formattedPlugins = plugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description || 'No description available',
      version: plugin.version?.name || 'Unknown',
      downloads: plugin.downloads || 0,
      rating: plugin.rating?.average || 0,
      updatedAt: plugin.updateDate || plugin.date,
      downloadUrl: `https://api.spiget.org/v2/resources/${plugin.id}/download`
    }));
    
    res.json({
      plugins: formattedPlugins,
      total: parseInt(total),
      page: parseInt(page),
      size: parseInt(size)
    });
  } catch (error) {
    console.error('Error fetching plugins from Spiget:', error);
    res.status(500).json({ error: 'Failed to fetch plugins' });
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
    
    // Check if server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if server is Paper type
    if (server.serverType !== 'paper') {
      return res.status(400).json({ error: 'Plugin management is only available for Paper servers' });
    }
    
    // Get the plugins directory for this server
    const pluginsDir = path.join(__dirname, '../servers', serverId, 'plugins');
    
    try {
      // Check if plugins directory exists
      await fs.access(pluginsDir);
      
      // Read the plugins directory
      const files = await fs.readdir(pluginsDir);
      
      // Filter for .jar files
      const pluginFiles = files.filter(file => file.endsWith('.jar'));
      
      // For each plugin file, try to get its details from Spiget
      const plugins = await Promise.all(
        pluginFiles.map(async (file) => {
          try {
            // Extract plugin name from filename (remove .jar extension)
            const pluginName = file.replace('.jar', '');
            
            // Search for the plugin on Spiget
            const searchResults = await spiget.search('resource', {
              query: pluginName,
              size: 1
            });
            
            if (searchResults.data && searchResults.data.length > 0) {
              const plugin = searchResults.data[0];
              return {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version?.name || 'Unknown',
                file: file
              };
            } else {
              // If not found on Spiget, return basic info
              return {
                id: 'unknown',
                name: pluginName,
                version: 'Unknown',
                file: file
              };
            }
          } catch (error) {
            console.error(`Error getting details for plugin ${file}:`, error);
            // Return basic info if we can't get details
            return {
              id: 'unknown',
              name: file.replace('.jar', ''),
              version: 'Unknown',
              file: file
            };
          }
        })
      );
      
      res.json({ plugins });
    } catch (error) {
      // If plugins directory doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return res.json({ plugins: [] });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting installed plugins:', error);
    res.status(500).json({ error: 'Failed to get installed plugins' });
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
    const { pluginId, version } = req.body;
    
    // Check if server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if server is Paper type
    if (server.serverType !== 'paper') {
      return res.status(400).json({ error: 'Plugin management is only available for Paper servers' });
    }
    
    // Check if server is stopped (recommended for plugin installation)
    if (server.status !== 'stopped') {
      return res.status(400).json({ error: 'Server should be stopped before installing plugins' });
    }
    
    // Get plugin details from Spiget
    const plugin = await spiget.getResource(pluginId);
    
    // Get the plugins directory for this server
    const pluginsDir = path.join(__dirname, '../servers', serverId, 'plugins');
    
    // Create plugins directory if it doesn't exist
    try {
      await fs.access(pluginsDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(pluginsDir, { recursive: true });
      } else {
        throw error;
      }
    }
    
    // Download the plugin
    const downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'arraybuffer'
    });
    
    // Save the plugin to the plugins directory
    const pluginFileName = `${plugin.name.replace(/\s+/g, '_')}.jar`;
    const pluginPath = path.join(pluginsDir, pluginFileName);
    await fs.writeFile(pluginPath, response.data);
    
    // Update server's plugin list in the database
    if (!server.plugins) {
      server.plugins = [];
    }
    
    // Check if plugin is already in the list
    const existingPluginIndex = server.plugins.findIndex(p => p.id === pluginId);
    if (existingPluginIndex >= 0) {
      // Update existing plugin
      server.plugins[existingPluginIndex] = {
        id: pluginId,
        name: plugin.name,
        version: version || plugin.version?.name || 'Unknown'
      };
    } else {
      // Add new plugin
      server.plugins.push({
        id: pluginId,
        name: plugin.name,
        version: version || plugin.version?.name || 'Unknown'
      });
    }
    
    await server.save();
    
    res.json({
      message: `Plugin ${plugin.name} installed successfully`,
      plugin: {
        id: pluginId,
        name: plugin.name,
        version: version || plugin.version?.name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Error installing plugin:', error);
    res.status(500).json({ error: 'Failed to install plugin' });
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
    
    // Check if server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if server is Paper type
    if (server.serverType !== 'paper') {
      return res.status(400).json({ error: 'Plugin management is only available for Paper servers' });
    }
    
    // Check if server is stopped (recommended for plugin uninstallation)
    if (server.status !== 'stopped') {
      return res.status(400).json({ error: 'Server should be stopped before uninstalling plugins' });
    }
    
    // Get plugin details from Spiget to get the name
    let pluginName;
    try {
      const plugin = await spiget.getResource(pluginId);
      pluginName = plugin.name;
    } catch (error) {
      console.error('Error getting plugin details:', error);
      // If we can't get the plugin name, we'll try to find it in the server's plugins list
      const plugin = server.plugins.find(p => p.id === pluginId);
      if (plugin) {
        pluginName = plugin.name;
      } else {
        return res.status(404).json({ error: 'Plugin not found' });
      }
    }
    
    // Get the plugins directory for this server
    const pluginsDir = path.join(__dirname, '../servers', serverId, 'plugins');
    
    // Try to find the plugin file
    const pluginFileName = `${pluginName.replace(/\s+/g, '_')}.jar`;
    const pluginPath = path.join(pluginsDir, pluginFileName);
    
    try {
      // Check if the file exists
      await fs.access(pluginPath);
      
      // Delete the plugin file
      await fs.unlink(pluginPath);
      
      // Update server's plugin list in the database
      if (server.plugins) {
        server.plugins = server.plugins.filter(p => p.id !== pluginId);
        await server.save();
      }
      
      res.json({ message: `Plugin ${pluginName} uninstalled successfully` });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, but we'll still remove it from the database
        if (server.plugins) {
          server.plugins = server.plugins.filter(p => p.id !== pluginId);
          await server.save();
        }
        
        res.json({ message: `Plugin ${pluginName} was not found in the plugins directory but removed from the database` });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error uninstalling plugin:', error);
    res.status(500).json({ error: 'Failed to uninstall plugin' });
  }
};