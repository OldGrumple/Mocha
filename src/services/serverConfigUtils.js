const fs = require('fs').promises;
const path = require('path');

// Helper function to generate server.properties
async function generateServerProperties(config, serverDir) {
    const properties = [
        // Basic Settings
        `server-name=${config.serverName}`,
        `max-players=${config.maxPlayers}`,
        `difficulty=${config.difficulty}`,
        `gamemode=${config.gameMode}`,

        // World Settings
        `level-seed=${config.seed || ''}`,
        `level-type=${config.worldType || 'default'}`,
        `generate-structures=${config.generateStructures !== false}`,

        // Performance Settings
        `view-distance=${config.viewDistance || 10}`,
        `spawn-protection=${config.spawnProtection || 16}`,
        `max-tick-time=${config.maxTickTime || 60000}`,

        // Network Settings
        `server-port=${config.port || 25565}`,
        `online-mode=${config.onlineMode !== false}`,
        `white-list=${config.whiteList === true}`,

        // Gameplay Settings
        `pvp=${config.pvp !== false}`,
        `allow-flight=${config.allowFlight === true}`,
        `allow-nether=${config.allowNether !== false}`,
        `enable-command-block=${config.enableCommandBlock === true}`,

        // Additional Settings
        `motd=${config.motd || 'A Minecraft Server'}`,
        `enable-query=${config.enableQuery === true}`,
        `query.port=${config.queryPort || 25565}`,
        `enable-rcon=${config.enableRcon === true}`,
        `rcon.port=${config.rconPort || 25575}`,
        `rcon.password=${config.rconPassword || ''}`,
        `op-permission-level=${config.opPermissionLevel || 4}`,
        `function-permission-level=${config.functionPermissionLevel || 2}`,
        `force-gamemode=${config.forceGamemode === true}`,
        `hardcore=${config.hardcore === true}`,
        `hide-online-players=${config.hideOnlinePlayers === true}`,
        `broadcast-console-to-ops=${config.broadcastConsoleToOps !== false}`,
        `broadcast-rcon-to-ops=${config.broadcastRconToOps !== false}`,
        `enable-jmx-monitoring=${config.enableJmxMonitoring === true}`,
        `enable-status=${config.enableStatus !== false}`,
        `enforce-secure-profile=${config.enforceSecureProfile !== false}`,
        `entity-broadcast-range-percentage=${config.entityBroadcastRangePercentage || 100}`,
        `max-chained-neighbor-updates=${config.maxChainedNeighborUpdates || 1000000}`,
        `max-world-size=${config.maxWorldSize || 29999984}`,
        `network-compression-threshold=${config.networkCompressionThreshold || 256}`,
        `pause-when-empty=${config.pauseWhenEmpty === true}`,
        `player-idle-timeout=${config.playerIdleTimeout || 0}`,
        `prevent-proxy-connections=${config.preventProxyConnections === true}`,
        `rate-limit=${config.rateLimit || 0}`,
        `simulation-distance=${config.simulationDistance || 10}`,
        `spawn-monsters=${config.spawnMonsters !== false}`,
        `sync-chunk-writes=${config.syncChunkWrites !== false}`,
        `text-filtering-config=${config.textFilteringConfig || ''}`,
        `use-native-transport=${config.useNativeTransport !== false}`
    ].join('\n');

    await fs.writeFile(path.join(serverDir, 'server.properties'), properties);
}

module.exports = {
    generateServerProperties
}; 