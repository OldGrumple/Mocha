<template>
  <div class="minecraft-cache-manager">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">Server Jar Cache</h2>
      <button
        @click="clearCache"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Clear Cache
      </button>
    </div>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-if="loading" class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>

    <div v-else-if="cache.length === 0" class="text-gray-500 text-center py-4">
      No server jars in cache
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="item in cache" 
        :key="`${item.type}-${item.version}`"
        class="bg-white p-4 rounded-lg shadow flex justify-between items-center"
      >
        <div>
          <div class="font-medium">{{ item.type }}</div>
          <div class="text-sm text-gray-500">Version: {{ item.version }}</div>
          <div class="text-sm text-gray-500">Size: {{ formatSize(item.size) }}</div>
          <div class="text-sm text-gray-500">Downloaded: {{ formatDate(item.downloadedAt) }}</div>
        </div>
        <button
          @click="removeFromCache(item.type, item.version)"
          class="px-3 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Download New Server Section -->
    <div class="mt-8">
      <h3 class="text-lg font-medium mb-4">Download New Server</h3>
      <MinecraftServerSelector v-model="downloadConfig" @download-complete="refreshCache" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import MinecraftServerSelector from './MinecraftServerSelector.vue'

const cache = ref([])
const loading = ref(false)
const error = ref(null)
const downloadConfig = ref({ type: '', version: '' })

const fetchCache = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.get('/api/minecraft/cache')
    cache.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch cache contents'
    console.error('Error fetching cache:', err)
  } finally {
    loading.value = false
  }
}

const removeFromCache = async (type, version) => {
  try {
    await axios.delete(`/api/minecraft/cache/${type}/${version}`)
    await fetchCache()
  } catch (err) {
    error.value = 'Failed to remove from cache'
    console.error('Error removing from cache:', err)
  }
}

const clearCache = async () => {
  if (!confirm('Are you sure you want to clear the entire cache?')) return

  try {
    await axios.post('/api/minecraft/cache/clear')
    await fetchCache()
  } catch (err) {
    error.value = 'Failed to clear cache'
    console.error('Error clearing cache:', err)
  }
}

const refreshCache = async () => {
  await fetchCache()
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

onMounted(() => {
  fetchCache()
})
</script>

<style scoped>
.minecraft-cache-manager {
  @apply p-6 bg-white rounded-lg shadow;
}
</style> 