const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
const MinecraftCache = require('../models/MinecraftCache')
const config = require('./minecraft/config')
const { createHash } = require('crypto')
const mongoose = require('mongoose')

const CACHE_DIR = path.join(__dirname, '../cache/minecraft')

class MinecraftService {
  constructor() {
    this.ensureCacheDir()
    this.downloadCache = new Map()
    this.serverTypes = {
      PAPER: 'paper',
      VANILLA: 'vanilla'
    }
    this.cacheDir = path.join(__dirname, '../cache')
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true })
    } catch (error) {
      console.error('Error creating cache directory:', error)
    }
  }

  async getServerTypes() {
    return Object.entries(config.serverTypes).map(([key, value]) => ({
      id: value,
      name: key.charAt(0) + key.slice(1).toLowerCase()
    }))
  }

  async getVersions(type) {
    switch (type) {
      case config.serverTypes.PAPER:
        return this.getPaperVersions()
      case config.serverTypes.VANILLA:
        return this.getVanillaVersions()
      case config.serverTypes.FORGE:
        return this.getForgeVersions()
      case config.serverTypes.FABRIC:
        return this.getFabricVersions()
      default:
        throw new Error('Invalid server type')
    }
  }

  async getPaperVersions() {
    try {
      const response = await axios.get('https://api.papermc.io/v2/projects/paper')
      if (!response.data || !response.data.versions) {
        throw new Error('Invalid response from Paper API')
      }

      // Filter out snapshots and sort versions
      const versions = response.data.versions
        .filter(version => !version.includes('SNAPSHOT'))
        .sort((a, b) => {
          const [majorA, minorA, patchA] = a.split('.').map(Number)
          const [majorB, minorB, patchB] = b.split('.').map(Number)
          
          if (majorA !== majorB) return majorB - majorA
          if (minorA !== minorB) return minorB - minorA
          return patchB - patchA
        })

      return versions.map(version => ({
        id: version,
        name: version
      }))
    } catch (error) {
      console.error('Error fetching Paper versions:', error)
      throw new Error('Failed to fetch Paper versions')
    }
  }

  async getVanillaVersions() {
    try {
      const response = await axios.get(config.apiEndpoints.vanilla.manifest)
      return response.data.versions.map(version => ({
        id: version.id,
        name: version.id
      }))
    } catch (error) {
      console.error('Error fetching Vanilla versions:', error)
      throw new Error('Failed to fetch Vanilla versions')
    }
  }

  async getForgeVersions() {
    try {
      const response = await axios.get(config.apiEndpoints.forge.installer)
      return response.data.versions.map(version => ({
        id: version.id,
        name: version.id
      }))
    } catch (error) {
      console.error('Error fetching Forge versions:', error)
      throw new Error('Failed to fetch Forge versions')
    }
  }

  async getFabricVersions() {
    try {
      const response = await axios.get(config.apiEndpoints.fabric.versions)
      return response.data.game.map(version => ({
        id: version.version,
        name: version.version
      }))
    } catch (error) {
      console.error('Error fetching Fabric versions:', error)
      throw new Error('Failed to fetch Fabric versions')
    }
  }

  async downloadServer(type, version) {
    try {
      // Check cache first
      const cacheKey = `${type}-${version}`;
      const cachedPath = this.downloadCache.get(cacheKey);
      if (cachedPath) {
        console.log(`Using cached server: ${cachedPath}`);
        return cachedPath;
      }

      // Check database cache
      const cachedEntry = await MinecraftCache.findOne({ type, version });
      if (cachedEntry) {
        console.log(`Found cached server in database: ${cachedEntry.path}`);
        this.downloadCache.set(cacheKey, cachedEntry.path);
        await cachedEntry.updateLastAccessed();
        return cachedEntry.path;
      }

      // Create cache directory if it doesn't exist
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${type}-${version}-${timestamp}.jar`;
      const filePath = path.join(this.cacheDir, filename);

      // Get download URL based on server type
      let downloadUrl;
      if (type.toLowerCase() === 'paper') {
        downloadUrl = await this.getPaperDownloadUrl(version);
      } else if (type.toLowerCase() === 'vanilla') {
        downloadUrl = await this.getVanillaDownloadUrl(version);
      } else {
        throw new Error(`Unsupported server type: ${type}`);
      }

      console.log(`Downloading server from: ${downloadUrl}`);
      await this.downloadFile(downloadUrl, filePath);

      // Validate the downloaded file
      await this.validateServerJar(filePath, type, version);

      // Get file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Store in memory cache
      this.downloadCache.set(cacheKey, filePath);

      // Save to database cache
      await MinecraftCache.create({
        type,
        version,
        size: fileSize,
        path: filePath,
        downloadedAt: new Date(),
        lastAccessed: new Date(),
        downloadCount: 1
      });

      return filePath;
    } catch (error) {
      console.error('Error downloading server:', error);
      throw error;
    }
  }

  async getPaperDownloadUrl(version) {
    try {
      // Get latest build number for the version
      const versionResponse = await axios.get(`https://api.papermc.io/v2/projects/paper/versions/${version}`)
      if (!versionResponse.data || !versionResponse.data.builds || versionResponse.data.builds.length === 0) {
        throw new Error(`No builds found for version ${version}`)
      }

      // Get the latest build
      const latestBuild = versionResponse.data.builds[versionResponse.data.builds.length - 1]

      // Get build details
      const buildResponse = await axios.get(
        `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}`
      )

      if (!buildResponse.data || !buildResponse.data.downloads || !buildResponse.data.downloads.application) {
        throw new Error(`Invalid build data for version ${version} build ${latestBuild}`)
      }

      // Construct download URL
      const downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}/downloads/${buildResponse.data.downloads.application.name}`
      console.log(`Generated Paper download URL: ${downloadUrl}`)
      return downloadUrl
    } catch (error) {
      console.error('Error getting Paper download URL:', error)
      throw error
    }
  }

  async getVanillaDownloadUrl(version) {
    try {
      // Get version manifest
      const manifestResponse = await axios.get(config.apiEndpoints.vanilla.manifest)
      const versionInfo = manifestResponse.data.versions.find(v => v.id === version)

      if (!versionInfo) {
        throw new Error(`Version ${version} not found`)
      }

      // Get version details
      const versionResponse = await axios.get(versionInfo.url)
      return versionResponse.data.downloads.server.url
    } catch (error) {
      console.error('Error getting Vanilla download URL:', error)
      throw error
    }
  }

  async getForgeDownloadUrl(version) {
    // TODO: Implement Forge download URL generation
    throw new Error('Forge downloads not yet implemented')
  }

  async getFabricDownloadUrl(version) {
    // TODO: Implement Fabric download URL generation
    throw new Error('Fabric downloads not yet implemented')
  }

  async downloadFile(url, filepath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      })

      const writer = await fs.open(filepath, 'w')
      const stream = response.data
      const hash = createHash('sha256')

      return new Promise((resolve, reject) => {
        stream.on('data', chunk => {
          hash.update(chunk)
          writer.write(chunk)
        })
        stream.on('end', () => {
          writer.close()
          resolve(hash.digest('hex'))
        })
        stream.on('error', err => {
          writer.close()
          reject(err)
        })
      })
    } catch (error) {
      console.error('Error downloading file:', error)
      throw error
    }
  }

  async validateServerJar(filepath, type, version) {
    try {
      // Read file buffer
      const buffer = await fs.readFile(filepath)
      
      // Calculate SHA-256 hash
      const hash = createHash('sha256')
      hash.update(buffer)
      const fileHash = hash.digest('hex')

      // Verify based on server type
      if (type.toLowerCase() === 'vanilla') {
        // Get version manifest
        const manifestResponse = await axios.get(config.apiEndpoints.vanilla.manifest)
        const versionInfo = manifestResponse.data.versions.find(v => v.id === version)
        
        if (!versionInfo) {
          throw new Error(`Version ${version} not found in manifest`)
        }

        // Get version details
        const versionResponse = await axios.get(versionInfo.url)
        const expectedSha1 = versionResponse.data.downloads.server.sha1

        // Calculate SHA-1 hash
        const sha1Hash = createHash('sha1')
        sha1Hash.update(buffer)
        const actualSha1 = sha1Hash.digest('hex')

        if (actualSha1.toLowerCase() !== expectedSha1.toLowerCase()) {
          console.error(`SHA-1 hash mismatch for vanilla server ${version}`)
          console.error(`Expected: ${expectedSha1}`)
          console.error(`Got: ${actualSha1}`)
          return false
        }
      } else if (type.toLowerCase() === 'paper') {
        // For Paper, we need to verify the build hash
        const versionResponse = await axios.get(`https://api.papermc.io/v2/projects/paper/versions/${version}`)
        if (!versionResponse.data || !versionResponse.data.builds || versionResponse.data.builds.length === 0) {
          throw new Error(`No builds found for Paper version ${version}`)
        }

        // Get the latest build
        const latestBuild = versionResponse.data.builds[versionResponse.data.builds.length - 1]
        
        // Get build details
        const buildResponse = await axios.get(
          `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}`
        )

        if (!buildResponse.data || !buildResponse.data.downloads || !buildResponse.data.downloads.application) {
          throw new Error(`Invalid build data for version ${version} build ${latestBuild}`)
        }

        const expectedSha256 = buildResponse.data.downloads.application.sha256
        if (fileHash.toLowerCase() !== expectedSha256.toLowerCase()) {
          console.error(`SHA-256 hash mismatch for Paper server ${version}`)
          console.error(`Expected: ${expectedSha256}`)
          console.error(`Got: ${fileHash}`)
          return false
        }
      }

      // If we get here, the hash is valid
      return true
    } catch (error) {
      console.error('Error validating server JAR:', error)
      return false
    }
  }

  async getCacheContents() {
    try {
      const cacheEntries = await MinecraftCache.find().sort({ lastAccessed: -1 })
      return cacheEntries.map(entry => ({
        type: entry.type,
        version: entry.version,
        size: entry.size,
        downloadedAt: entry.downloadedAt,
        lastAccessed: entry.lastAccessed,
        downloadCount: entry.downloadCount
      }))
    } catch (error) {
      console.error('Error fetching cache contents:', error)
      throw new Error('Failed to fetch cache contents')
    }
  }

  async removeFromCache(type, version) {
    try {
      const entry = await MinecraftCache.findOne({ type, version })
      if (!entry) return

      await fs.unlink(entry.path)
      await MinecraftCache.deleteOne({ _id: entry._id })
    } catch (error) {
      console.error('Error removing from cache:', error)
      throw new Error('Failed to remove from cache')
    }
  }

  async clearCache() {
    try {
      const entries = await MinecraftCache.find()
      for (const entry of entries) {
        await fs.unlink(entry.path)
      }
      await MinecraftCache.deleteMany({})
    } catch (error) {
      console.error('Error clearing cache:', error)
      throw new Error('Failed to clear cache')
    }
  }

  async cleanupCache() {
    try {
      const files = await fs.readdir(this.cacheDir)
      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      for (const file of files) {
        const filepath = path.join(this.cacheDir, file)
        const stats = await fs.stat(filepath)
        const age = now - stats.mtime.getTime()

        if (age > maxAge) {
          await fs.unlink(filepath)
          console.log(`Deleted old cache file: ${file}`)
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error)
    }
  }
}

module.exports = new MinecraftService() 