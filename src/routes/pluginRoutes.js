const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/pluginController');

// Get available plugins
router.get('/servers/:serverId/plugins/available', pluginController.getAvailablePlugins);

// Get installed plugins for a server
router.get('/servers/:serverId/plugins', pluginController.getInstalledPlugins);

// Install a plugin
router.post('/servers/:serverId/plugins', pluginController.installPlugin);

// Uninstall a plugin
router.delete('/servers/:serverId/plugins/:pluginId', pluginController.uninstallPlugin);

module.exports = router; 