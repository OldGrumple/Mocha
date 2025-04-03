const fs = require('fs').promises;
const path = require('path');

// Helper function to get the server directory path
function getServerDir(serverId) {
    return path.join(__dirname, '../servers', serverId.toString());
}

// Helper function to read a JSON file
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        throw error;
    }
}

// Helper function to write a JSON file
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Get banned IPs
async function getBannedIPs(serverId) {
    const filePath = path.join(getServerDir(serverId), 'banned-ips.json');
    return readJsonFile(filePath);
}

// Add banned IP
async function addBannedIP(serverId, ip, reason, expires) {
    const filePath = path.join(getServerDir(serverId), 'banned-ips.json');
    const bannedIPs = await readJsonFile(filePath);
    
    // Check if IP is already banned
    const existingBan = bannedIPs.find(ban => ban.ip === ip);
    if (existingBan) {
        throw new Error('IP is already banned');
    }

    // Add new ban
    bannedIPs.push({
        ip,
        reason,
        expires: expires ? new Date(expires).getTime() : null,
        created: Date.now()
    });

    await writeJsonFile(filePath, bannedIPs);
    return bannedIPs;
}

// Remove banned IP
async function removeBannedIP(serverId, ip) {
    const filePath = path.join(getServerDir(serverId), 'banned-ips.json');
    const bannedIPs = await readJsonFile(filePath);
    
    const filteredIPs = bannedIPs.filter(ban => ban.ip !== ip);
    await writeJsonFile(filePath, filteredIPs);
    return filteredIPs;
}

// Get banned players
async function getBannedPlayers(serverId) {
    const filePath = path.join(getServerDir(serverId), 'banned-players.json');
    return readJsonFile(filePath);
}

// Add banned player
async function addBannedPlayer(serverId, name, reason, expires) {
    const filePath = path.join(getServerDir(serverId), 'banned-players.json');
    const bannedPlayers = await readJsonFile(filePath);
    
    // Check if player is already banned
    const existingBan = bannedPlayers.find(ban => ban.name === name);
    if (existingBan) {
        throw new Error('Player is already banned');
    }

    // Add new ban
    bannedPlayers.push({
        name,
        reason,
        expires: expires ? new Date(expires).getTime() : null,
        created: Date.now()
    });

    await writeJsonFile(filePath, bannedPlayers);
    return bannedPlayers;
}

// Remove banned player
async function removeBannedPlayer(serverId, name) {
    const filePath = path.join(getServerDir(serverId), 'banned-players.json');
    const bannedPlayers = await readJsonFile(filePath);
    
    const filteredPlayers = bannedPlayers.filter(ban => ban.name !== name);
    await writeJsonFile(filePath, filteredPlayers);
    return filteredPlayers;
}

// Get operators
async function getOperators(serverId) {
    const filePath = path.join(getServerDir(serverId), 'ops.json');
    return readJsonFile(filePath);
}

// Add operator
async function addOperator(serverId, name, level) {
    const filePath = path.join(getServerDir(serverId), 'ops.json');
    const operators = await readJsonFile(filePath);
    
    // Check if player is already an operator
    const existingOp = operators.find(op => op.name === name);
    if (existingOp) {
        throw new Error('Player is already an operator');
    }

    // Add new operator
    operators.push({
        name,
        level: parseInt(level),
        uuid: '', // This will be filled in by the server when the player joins
        bypassesPlayerLimit: false
    });

    await writeJsonFile(filePath, operators);
    return operators;
}

// Remove operator
async function removeOperator(serverId, name) {
    const filePath = path.join(getServerDir(serverId), 'ops.json');
    const operators = await readJsonFile(filePath);
    
    const filteredOperators = operators.filter(op => op.name !== name);
    await writeJsonFile(filePath, filteredOperators);
    return filteredOperators;
}

// Get whitelist
async function getWhitelist(serverId) {
    const filePath = path.join(getServerDir(serverId), 'whitelist.json');
    return readJsonFile(filePath);
}

// Add player to whitelist
async function addToWhitelist(serverId, name) {
    const filePath = path.join(getServerDir(serverId), 'whitelist.json');
    const whitelist = await readJsonFile(filePath);
    
    // Check if player is already whitelisted
    const existingPlayer = whitelist.find(player => player.name === name);
    if (existingPlayer) {
        throw new Error('Player is already whitelisted');
    }

    // Add new player
    whitelist.push({
        name,
        uuid: '', // This will be filled in by the server when the player joins
        ignoresPlayerLimit: false
    });

    await writeJsonFile(filePath, whitelist);
    return whitelist;
}

// Remove player from whitelist
async function removeFromWhitelist(serverId, name) {
    const filePath = path.join(getServerDir(serverId), 'whitelist.json');
    const whitelist = await readJsonFile(filePath);
    
    const filteredWhitelist = whitelist.filter(player => player.name !== name);
    await writeJsonFile(filePath, filteredWhitelist);
    return filteredWhitelist;
}

module.exports = {
    getBannedIPs,
    addBannedIP,
    removeBannedIP,
    getBannedPlayers,
    addBannedPlayer,
    removeBannedPlayer,
    getOperators,
    addOperator,
    removeOperator,
    getWhitelist,
    addToWhitelist,
    removeFromWhitelist,
    writeJsonFile
}; 