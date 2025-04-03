const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Spiget API base URL
const SPIGET_API_BASE_URL = 'https://api.spiget.org/v2';

/**
 * Get available plugins from the Spiget API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { search, size = 20, page = 1 } = req.query;
    
    // Build the API URL
    let apiUrl = `${SPIGET_API_BASE_URL}/resources?size=${size}&page=${page}`;
    
    // Add search parameter if provided
    if (search) {
      apiUrl += `&search=${encodeURIComponent(search)}`;
    }
    
    // Add fields to get only what we need
    apiUrl += '&fields=id,name,description,version,downloads,rating,updateDate';
    
    // Make the API request
    const response = await axios.get(apiUrl);
    
    // Transform the response to match our expected format
    const plugins = response.data.map(plugin => ({
      id: plugin.id.toString(),
      name: plugin.name,
      description: plugin.description || 'No description available',
      version: plugin.version.name || 'Unknown',
      downloads: plugin.downloads,
      rating: plugin.rating.average || 0,
      updatedAt: plugin.updateDate,
      downloadUrl: `${SPIGET_API_BASE_URL}/resources/${plugin.id}/download`
    }));
    
    res.json({
      success: true,
      plugins
    });
  } catch (error) {
    console.error('Error fetching available plugins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available plugins'
    });
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
    
    // Get server details to find the plugins directory
    const server = await req.app.locals.db.collection('servers').findOne({ _id: serverId });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }
    
    // Check if server is a Paper server
    if (server.serverType !== 'paper') {
      return res.status(400).json({
        success: false,
        error: 'Plugin management is only available for Paper servers'
      });
    }
    
    // Path to the plugins directory
    const pluginsDir = path.join(process.env.SERVERS_DIR || 'servers', serverId, 'plugins');
    
    // Check if plugins directory exists
    try {
      await fs.access(pluginsDir);
    } catch (error) {
      // If plugins directory doesn't exist, return empty list
      return res.json({
        success: true,
        plugins: []
      });
    }
    
    // Read the plugins directory
    const files = await fs.readdir(pluginsDir);
    
    // Filter for .jar files
    const jarFiles = files.filter(file => file.endsWith('.jar'));
    
    // Get plugin information
    const plugins = await Promise.all(
      jarFiles.map(async (file) => {
        try {
          // Extract plugin name from filename (remove .jar extension)
          const pluginName = file.replace('.jar', '');
          
          // Try to find the plugin in Spiget API
          try {
            const searchResponse = await axios.get(`${SPIGET_API_BASE_URL}/search/resources/${encodeURIComponent(pluginName)}?size=1`);
            
            if (searchResponse.data && searchResponse.data.length > 0) {
              const pluginInfo = searchResponse.data[0];
              return {
                id: pluginInfo.id.toString(),
                name: pluginInfo.name,
                version: pluginInfo.version.name || 'Unknown'
              };
            }
          } catch (searchError) {
            console.error(`Error searching for plugin ${pluginName}:`, searchError);
          }
          
          // If not found in Spiget API, return basic info
          return {
            id: file,
            name: pluginName,
            version: 'unknown'
          };
        } catch (error) {
          console.error(`Error getting info for plugin ${file}:`, error);
          return {
            id: file,
            name: file.replace('.jar', ''),
            version: 'unknown'
          };
        }
      })
    );
    
    res.json({
      success: true,
      plugins
    });
  } catch (error) {
    console.error('Error getting installed plugins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installed plugins'
    });
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
    
    // Get server details
    const server = await req.app.locals.db.collection('servers').findOne({ _id: serverId });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }
    
    // Check if server is a Paper server
    if (server.serverType !== 'paper') {
      return res.status(400).json({
        success: false,
        error: 'Plugin management is only available for Paper servers'
      });
    }
    
    // Check if server is running
    if (server.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot install plugins while server is running'
      });
    }
    
    // Get plugin details from Spiget API
    const pluginResponse = await axios.get(`${SPIGET_API_BASE_URL}/resources/${pluginId}`);
    const plugin = pluginResponse.data;
    
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: 'Plugin not found'
      });
    }
    
    // Path to the plugins directory
    const pluginsDir = path.join(process.env.SERVERS_DIR || 'servers', serverId, 'plugins');
    
    // Create plugins directory if it doesn't exist
    try {
      await fs.access(pluginsDir);
    } catch (error) {
      await fs.mkdir(pluginsDir, { recursive: true });
    }
    
    // Download the plugin
    const pluginPath = path.join(pluginsDir, `${plugin.name}.jar`);
    
    // Download the plugin from Spiget
    const downloadResponse = await axios({
      method: 'get',
      url: `${SPIGET_API_BASE_URL}/resources/${pluginId}/download`,
      responseType: 'stream'
    });
    
    // Write the plugin to the plugins directory
    const writer = fs.createWriteStream(pluginPath);
    downloadResponse.data.pipe(writer);
    
    // Wait for the download to complete
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Update server plugins in database
    const updatedPlugins = [...(server.plugins || [])];
    updatedPlugins.push({
      name: plugin.name,
      version: plugin.version.name || 'Unknown'
    });
    
    await req.app.locals.db.collection('servers').updateOne(
      { _id: serverId },
      { $set: { plugins: updatedPlugins } }
    );
    
    res.json({
      success: true,
      message: `Plugin ${plugin.name} installed successfully`
    });
  } catch (error) {
    console.error('Error installing plugin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install plugin'
    });
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
    
    // Get server details
    const server = await req.app.locals.db.collection('servers').findOne({ _id: serverId });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }
    
    // Check if server is a Paper server
    if (server.serverType !== 'paper') {
      return res.status(400).json({
        success: false,
        error: 'Plugin management is only available for Paper servers'
      });
    }
    
    // Check if server is running
    if (server.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot uninstall plugins while server is running'
      });
    }
    
    // Get plugin details from Spiget API
    let pluginName;
    try {
      const pluginResponse = await axios.get(`${SPIGET_API_BASE_URL}/resources/${pluginId}`);
      pluginName = pluginResponse.data.name;
    } catch (error) {
      console.error('Error getting plugin details:', error);
      // If we can't get the plugin name from the API, use the ID
      pluginName = pluginId;
    }
    
    // Path to the plugins directory
    const pluginsDir = path.join(process.env.SERVERS_DIR || 'servers', serverId, 'plugins');
    
    // Check if plugins directory exists
    try {
      await fs.access(pluginsDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Plugins directory not found'
      });
    }
    
    // Path to the plugin file
    const pluginPath = path.join(pluginsDir, `${pluginName}.jar`);
    
    // Check if plugin file exists
    try {
      await fs.access(pluginPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Plugin file not found'
      });
    }
    
    // Delete the plugin file
    await fs.unlink(pluginPath);
    
    // Update server plugins in database
    const updatedPlugins = (server.plugins || []).filter(p => p.name !== pluginName);
    
    await req.app.locals.db.collection('servers').updateOne(
      { _id: serverId },
      { $set: { plugins: updatedPlugins } }
    );
    
    res.json({
      success: true,
      message: `Plugin ${pluginName} uninstalled successfully`
    });
  } catch (error) {
    console.error('Error uninstalling plugin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to uninstall plugin'
    });
  }
};