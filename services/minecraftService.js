const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
const MinecraftCache = require('../models/MinecraftCache')

const CACHE_DIR = path.join(__dirname, '../cache/minecraft')
const PAPER_API = 'https://papermc.io/api/v2/projects/paper'
const VANILLA_API = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
const SPIGOT_API = 'https://hub.spigotmc.org/versions'

class MinecraftService {
  constructor() {
    this.ensureCacheDir()
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true })
    } catch (error) {
      console.error('Error creating cache directory:', error)
    }
  }

  async getServerTypes() {
    return [
      { id: 'vanilla', name: 'Vanilla' },
      { id: 'paper', name: 'Paper' },
      { id: 'spigot', name: 'Spigot' },
      { id: 'forge', name: 'Forge' },
      { id: 'fabric', name: 'Fabric' }
    ]
  }

  async getVersions(type) {
    switch (type) {
      case 'paper':
        return this.getPaperVersions()
      case 'vanilla':
        return this.getVanillaVersions()
      case 'spigot':
        return this.getSpigotVersions()
      case 'forge':
        return this.getForgeVersions()
      case 'fabric':
        return this.getFabricVersions()
      default:
        throw new Error('Invalid server type')
    }
  }

  async getPaperVersions() {
    try {
      const response = await axios.get(PAPER_API)
      return response.data.versions.map(version => ({
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
      const response = await axios.get(VANILLA_API)
      return response.data.versions.map(version => ({
        id: version.id,
        name: version.id
      }))
    } catch (error) {
      console.error('Error fetching Vanilla versions:', error)
      throw new Error('Failed to fetch Vanilla versions')
    }
  }

  async getSpigotVersions() {
    try {
      const response = await axios.get(SPIGOT_API)
      return response.data.map(version => ({
        id: version,
        name: version
      }))
    } catch (error) {
      console.error('Error fetching Spigot versions:', error)
      throw new Error('Failed to fetch Spigot versions')
    }
  }

  async getForgeVersions() {
    // TODO: Implement Forge version fetching
    return []
  }

  async getFabricVersions() {
    // TODO: Implement Fabric version fetching
    return []
  }

  async downloadServer(type, version) {
    try {
      // Check if already cached
      const cached = await MinecraftCache.findOne({ type, version })
      if (cached) {
        await cached.updateLastAccessed()
        return cached.path
      }

      // Download based on type
      let downloadUrl
      let fileName
      switch (type) {
        case 'paper':
          downloadUrl = await this.getPaperDownloadUrl(version)
          fileName = `paper-${version}.jar`
          break
        case 'vanilla':
          downloadUrl = await this.getVanillaDownloadUrl(version)
          fileName = `minecraft-${version}.jar`
          break
        case 'spigot':
          downloadUrl = await this.getSpigotDownloadUrl(version)
          fileName = `spigot-${version}.jar`
          break
        default:
          throw new Error('Unsupported server type')
      }

      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' })
      const filePath = path.join(CACHE_DIR, fileName)
      await fs.writeFile(filePath, response.data)

      // Create cache entry
      const stats = await fs.stat(filePath)
      await MinecraftCache.create({
        type,
        version,
        size: stats.size,
        path: filePath
      })

      return filePath
    } catch (error) {
      console.error('Error downloading server:', error)
      throw new Error('Failed to download server')
    }
  }

  async getPaperDownloadUrl(version) {
    const response = await axios.get(`${PAPER_API}/versions/${version}`)
    const build = response.data.builds[response.data.builds.length - 1]
    return `${PAPER_API}/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`
  }

  async getVanillaDownloadUrl(version) {
    const response = await axios.get(VANILLA_API)
    const versionInfo = response.data.versions.find(v => v.id === version)
    if (!versionInfo) throw new Error('Version not found')
    
    const versionData = await axios.get(versionInfo.url)
    return versionData.data.downloads.server.url
  }

  async getSpigotDownloadUrl(version) {
    return `${SPIGOT_API}/${version}/latest`
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
}

module.exports = new MinecraftService() 