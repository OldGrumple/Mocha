module.exports = {
    // Supported server types
    serverTypes: {
        VANILLA: 'vanilla',
        PAPER: 'paper',
        FORGE: 'forge',
        FABRIC: 'fabric'
    },

    // API endpoints for different server types
    apiEndpoints: {
        vanilla: {
            manifest: 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
        },
        paper: {
            project: 'https://api.papermc.io/v2/projects/paper',
            version: 'https://api.papermc.io/v2/projects/paper/versions',
            build: 'https://api.papermc.io/v2/projects/paper/versions/{version}/builds',
            download: 'https://api.papermc.io/v2/projects/paper/versions/{version}/builds/{build}/downloads/{file}'
        },
        forge: {
            installer: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge/index.json'
        },
        fabric: {
            versions: 'https://meta.fabricmc.net/v2/versions'
        }
    },

    // Minimum required Java version for different Minecraft versions
    javaVersions: {
        '1.17': '16',
        '1.18': '17',
        '1.19': '17',
        '1.20': '17'
    },

    // Default server properties
    defaultServerProperties: {
        'server-port': '25565',
        'gamemode': 'survival',
        'difficulty': 'normal',
        'pvp': 'true',
        'max-players': '20',
        'online-mode': 'true',
        'allow-flight': 'false',
        'white-list': 'false',
        'spawn-protection': '16'
    }
}; 