<template>
  <div class="server-create">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">Create New Server</h2>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Node Selection -->
        <div>
          <label for="node" class="block text-sm font-medium text-gray-700">Node</label>
          <select
            id="node"
            v-model="formData.nodeId"
            required
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Select a node</option>
            <option v-for="node in nodes" :key="node._id" :value="node._id">
              {{ node.name }}
            </option>
          </select>
        </div>

        <!-- Server Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Server Name</label>
          <input
            type="text"
            id="name"
            v-model="formData.name"
            required
            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            placeholder="Enter server name"
          />
        </div>

        <!-- Minecraft Configuration -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Configuration</label>
          <MinecraftServerSelector
            v-model="formData.minecraftConfig"
            @update:modelValue="handleMinecraftConfigUpdate"
          />
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Creating...</span>
            <span v-else>Create Server</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import MinecraftServerSelector from '../components/MinecraftServerSelector.vue'

const router = useRouter()
const nodes = ref([])
const loading = ref(false)
const error = ref(null)

const formData = ref({
  nodeId: '',
  name: '',
  minecraftConfig: {
    type: '',
    version: ''
  }
})

const fetchNodes = async () => {
  try {
    const response = await axios.get('/api/nodes')
    nodes.value = response.data.nodes
  } catch (err) {
    error.value = 'Failed to fetch nodes'
    console.error('Error fetching nodes:', err)
  }
}

const handleMinecraftConfigUpdate = (config) => {
  formData.value.minecraftConfig = config
}

const handleSubmit = async () => {
  if (!formData.value.minecraftConfig.type || !formData.value.minecraftConfig.version) {
    error.value = 'Please select both server type and version'
    return
  }

  try {
    loading.value = true
    error.value = null

    const serverData = {
      nodeId: formData.value.nodeId,
      name: formData.value.name,
      minecraftVersion: formData.value.minecraftConfig.version,
      serverType: formData.value.minecraftConfig.type
    }

    await axios.post('/api/servers', serverData)
    router.push('/servers')
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create server'
    console.error('Error creating server:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNodes()
})
</script>

<style scoped>
.server-create {
  @apply p-6 bg-white rounded-lg shadow;
}
</style> 