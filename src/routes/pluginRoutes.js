const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/pluginController');
const { authenticate } = require('../middleware/auth');

// Get available plugins
router.get('/servers/:serverId/plugins/available', authenticate, pluginController.getAvailablePlugins);

// Get installed plugins for a server
router.get('/servers/:serverId/plugins', authenticate, pluginController.getInstalledPlugins);

// Install a plugin
router.post('/servers/:serverId/plugins', authenticate, pluginController.installPlugin);

// Uninstall a plugin
router.delete('/servers/:serverId/plugins/:pluginId', authenticate, pluginController.uninstallPlugin);

module.exports = router; 