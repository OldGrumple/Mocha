<template>
  <div class="minecraft-server-selector">
    <h2 class="text-xl font-semibold mb-4">Select Minecraft Server</h2>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div class="space-y-4">
      <!-- Server Type Selection -->
      <div class="mb-4">
        <label for="serverType" class="block text-sm font-medium text-gray-700">Server Type</label>
        <select
          id="serverType"
          v-model="selectedType"
          @change="handleTypeChange"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">Select server type</option>
          <option v-for="type in serverTypes" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <!-- Version Selection -->
      <div class="mb-4">
        <label for="version" class="block text-sm font-medium text-gray-700">Version</label>
        <div class="relative">
          <select
            id="version"
            v-model="selectedVersion"
            @change="handleVersionChange"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Select version</option>
            <option v-for="version in versions" :key="version.id" :value="version.id">
              {{ version.name }}
              <span v-if="downloadQueue[version.id]" class="text-gray-500">
                (Downloading...)
              </span>
            </option>
          </select>
          <div v-if="loadingVersions" class="absolute inset-y-0 right-0 flex items-center pr-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>

      <!-- Download Progress -->
      <div v-if="Object.keys(downloadQueue).length > 0" class="mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Downloads in Progress</h4>
        <div class="space-y-2">
          <div v-for="(progress, versionId) in downloadQueue" 
               :key="versionId" 
               class="bg-gray-50 p-3 rounded-md">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm font-medium text-gray-700">
                {{ getVersionName(versionId) }}
              </span>
              <span class="text-sm text-gray-500">{{ progress.status }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-indigo-600 h-2 rounded-full" :style="{ width: progress.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineProps, defineEmits } from 'vue'
import axios from 'axios'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ type: '', version: '' })
  }
})

const emit = defineEmits(['update:modelValue', 'download-complete'])

const serverTypes = ref([])
const versions = ref([])
const selectedType = ref(props.modelValue.type)
const selectedVersion = ref(props.modelValue.version)
const loadingVersions = ref(false)
const error = ref(null)
const downloadQueue = ref({})

const fetchServerTypes = async () => {
  try {
    error.value = null
    const response = await axios.get('/api/minecraft/types')
    serverTypes.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch server types'
    console.error('Error fetching server types:', err)
  }
}

const fetchVersions = async (type) => {
  if (!type) {
    versions.value = []
    return
  }

  try {
    loadingVersions.value = true
    error.value = null
    const response = await axios.get(`/api/minecraft/versions/${type}`)
    versions.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch versions'
    console.error('Error fetching versions:', err)
  } finally {
    loadingVersions.value = false
  }
}

const handleTypeChange = async () => {
  emit('update:modelValue', { type: selectedType.value, version: '' })
  selectedVersion.value = ''
  await fetchVersions(selectedType.value)
}

const handleVersionChange = async () => {
  if (!selectedType.value || !selectedVersion.value) {
    emit('update:modelValue', { type: selectedType.value, version: '' })
    return
  }

  emit('update:modelValue', { type: selectedType.value, version: selectedVersion.value })
  await downloadServer(selectedType.value, selectedVersion.value)
}

const downloadServer = async (type, version) => {
  if (downloadQueue.value[version]) return

  downloadQueue.value[version] = {
    status: 'Starting download...',
    percentage: 0
  }

  try {
    const response = await axios.post('/api/minecraft/download', { type, version }, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        downloadQueue.value[version].percentage = percentage
        downloadQueue.value[version].status = `Downloading: ${percentage}%`
      }
    })

    // Create a blob from the response data
    const blob = new Blob([response.data], { type: 'application/java-archive' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-${version}.jar`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    downloadQueue.value[version].status = 'Download complete'
    setTimeout(() => {
      delete downloadQueue.value[version]
    }, 3000)

    emit('download-complete')
  } catch (err) {
    downloadQueue.value[version].status = 'Download failed'
    error.value = 'Failed to download server'
    console.error('Error downloading server:', err)
    setTimeout(() => {
      delete downloadQueue.value[version]
    }, 3000)
  }
}

const getVersionName = (versionId) => {
  const version = versions.value.find(v => v.id === versionId)
  return version ? version.name : versionId
}

watch(() => props.modelValue, (newValue) => {
  selectedType.value = newValue.type
  selectedVersion.value = newValue.version
})

onMounted(async () => {
  await fetchServerTypes()
  if (selectedType.value) {
    await fetchVersions(selectedType.value)
  }
})
</script>

<style scoped>
.minecraft-server-selector {
  @apply p-4 bg-white rounded-lg shadow;
}
</style> 