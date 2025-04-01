const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const config = require('./config');

class MinecraftService {
    constructor() {
        this.repositoryPath = path.join(__dirname, 'repository');
        this.versionsFile = path.join(__dirname, 'versions.json');
        this.manifestFile = path.join(__dirname, 'manifest.json');
    }

    async initialize() {
        // Ensure repository directory exists
        await fs.mkdir(this.repositoryPath, { recursive: true });
        
        // Initialize versions file if it doesn't exist
        try {
            await fs.access(this.versionsFile);
        } catch {
            await this.saveVersions({});
        }
    }

    async getAvailableVersions() {
        try {
            const data = await fs.readFile(this.versionsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading versions file:', error);
            return {};
        }
    }

    async saveVersions(versions) {
        await fs.writeFile(this.versionsFile, JSON.stringify(versions, null, 2));
    }

    async getVersionManifest() {
        try {
            // Try to read from cache first
            try {
                const cachedManifest = await fs.readFile(this.manifestFile, 'utf8');
                const manifest = JSON.parse(cachedManifest);
                
                // Check if manifest is less than 1 hour old
                const manifestAge = Date.now() - new Date(manifest.lastUpdated).getTime();
                if (manifestAge < 3600000) { // 1 hour in milliseconds
                    return manifest;
                }
            } catch (error) {
                // Cache miss or invalid cache, continue to fetch
            }

            // Fetch fresh manifest
            const response = await axios.get(config.apiEndpoints.vanilla.manifest);
            const manifest = {
                ...response.data,
                lastUpdated: new Date().toISOString()
            };

            // Cache the manifest
            await fs.writeFile(this.manifestFile, JSON.stringify(manifest, null, 2));
            return manifest;
        } catch (error) {
            console.error('Error fetching version manifest:', error);
            throw error;
        }
    }

    async getVersionMetadata(version) {
        try {
            const manifest = await this.getVersionManifest();
            const versionInfo = manifest.versions.find(v => v.id === version);
            
            if (!versionInfo) {
                throw new Error(`Version ${version} not found in manifest`);
            }

            const response = await axios.get(versionInfo.url);
            return response.data;
        } catch (error) {
            console.error('Error fetching version metadata:', error);
            throw error;
        }
    }

    async downloadVanillaServer(version) {
        try {
            // Get version metadata
            const metadata = await this.getVersionMetadata(version);
            
            // Find the server jar in downloads
            const serverJar = metadata.downloads.server;
            if (!serverJar) {
                throw new Error(`No server jar found for version ${version}`);
            }

            // Create the local file path
            const fileName = `minecraft-${version}.jar`;
            const localPath = path.join(this.repositoryPath, fileName);

            // Download the file
            const response = await axios({
                method: 'GET',
                url: serverJar.url,
                responseType: 'stream'
            });

            // Save the file
            const writer = await fs.open(localPath, 'w');
            await writer.writeFile(response.data);
            await writer.close();

            // Update versions database
            const versions = await this.getAvailableVersions();
            const versionKey = `vanilla-${version}`;
            versions[versionKey] = {
                localPath,
                sha1: serverJar.sha1,
                size: serverJar.size,
                downloadedAt: new Date().toISOString()
            };
            await this.saveVersions(versions);

            return localPath;
        } catch (error) {
            console.error('Error downloading vanilla server:', error);
            throw error;
        }
    }

    async downloadPaperServer(version) {
        try {
            // Get the latest build for the specified version
            const buildsUrl = config.apiEndpoints.paper.build.replace('{version}', version);
            const buildsResponse = await axios.get(buildsUrl);
            const builds = buildsResponse.data.builds;
            
            if (!builds || builds.length === 0) {
                throw new Error(`No builds found for Paper version ${version}`);
            }

            // Get the latest build
            const latestBuild = builds[builds.length - 1];
            
            // Find the application jar file
            const applicationJar = latestBuild.downloads['application'];
            if (!applicationJar) {
                throw new Error('No application jar found in the latest build');
            }

            // Create the download URL
            const downloadUrl = config.apiEndpoints.paper.download
                .replace('{version}', version)
                .replace('{build}', latestBuild.build)
                .replace('{file}', applicationJar.name);

            // Create the local file path
            const fileName = `paper-${version}-${latestBuild.build}.jar`;
            const localPath = path.join(this.repositoryPath, fileName);

            // Download the file
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream'
            });

            // Save the file
            const writer = await fs.open(localPath, 'w');
            await writer.writeFile(response.data);
            await writer.close();

            // Update versions database
            const versions = await this.getAvailableVersions();
            const versionKey = `paper-${version}`;
            versions[versionKey] = {
                localPath,
                build: latestBuild.build,
                downloadedAt: new Date().toISOString()
            };
            await this.saveVersions(versions);

            return localPath;
        } catch (error) {
            console.error('Error downloading Paper server:', error);
            throw error;
        }
    }

    async downloadServerJar(version, type = 'vanilla') {
        const versions = await this.getAvailableVersions();
        const versionKey = `${type}-${version}`;
        
        if (versions[versionKey]) {
            return versions[versionKey].localPath;
        }

        switch (type) {
            case 'paper':
                return await this.downloadPaperServer(version);
            case 'vanilla':
                return await this.downloadVanillaServer(version);
            case 'forge':
                // TODO: Implement forge server download
                throw new Error('Forge server download not implemented yet');
            case 'fabric':
                // TODO: Implement fabric server download
                throw new Error('Fabric server download not implemented yet');
            default:
                throw new Error(`Unsupported server type: ${type}`);
        }
    }

    async validateServerJar(version, type = 'vanilla') {
        const versionKey = `${type}-${version}`;
        const versions = await this.getAvailableVersions();
        
        if (!versions[versionKey]) {
            return false;
        }

        try {
            await fs.access(versions[versionKey].localPath);
            return true;
        } catch {
            return false;
        }
    }

    async getAvailableServerTypes() {
        return Object.entries(config.serverTypes).map(([key, value]) => ({
            id: value,
            name: key.charAt(0) + key.slice(1).toLowerCase(),
            description: this.getServerTypeDescription(value)
        }));
    }

    getServerTypeDescription(type) {
        const descriptions = {
            vanilla: 'Official Minecraft server from Mojang',
            paper: 'High-performance fork of Spigot',
            forge: 'Modded server with Forge support',
            fabric: 'Lightweight modding platform'
        };
        return descriptions[type] || 'Unknown server type';
    }

    async getAvailableVersionsForType(type) {
        switch (type) {
            case 'vanilla':
                return await this.getVanillaVersions();
            case 'paper':
                return await this.getPaperVersions();
            case 'forge':
                return await this.getForgeVersions();
            case 'fabric':
                return await this.getFabricVersions();
            default:
                throw new Error(`Unsupported server type: ${type}`);
        }
    }

    async getVanillaVersions() {
        try {
            const manifest = await this.getVersionManifest();
            return manifest.versions
                .filter(v => v.type === 'release')
                .map(v => ({
                    id: v.id,
                    type: v.type,
                    releaseDate: v.releaseTime,
                    url: v.url
                }));
        } catch (error) {
            console.error('Error fetching vanilla versions:', error);
            throw error;
        }
    }

    async getPaperVersions() {
        try {
            const response = await axios.get(config.apiEndpoints.paper.project);
            return response.data.versions
                .filter(v => v.type === 'release')
                .map(v => ({
                    id: v.id,
                    type: v.type,
                    releaseDate: v.releaseTime,
                    builds: v.builds
                }));
        } catch (error) {
            console.error('Error fetching Paper versions:', error);
            throw error;
        }
    }

    async getForgeVersions() {
        // TODO: Implement Forge version fetching
        throw new Error('Forge version fetching not implemented yet');
    }

    async getFabricVersions() {
        // TODO: Implement Fabric version fetching
        throw new Error('Fabric version fetching not implemented yet');
    }
}

module.exports = new MinecraftService(); 