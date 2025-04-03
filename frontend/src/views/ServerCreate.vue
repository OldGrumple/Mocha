<template>
  <div class="server-create">
    <h2 class="text-2xl font-bold mb-6">Add New Server</h2>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Server Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          id="name"
          v-model="formData.name"
          required
          class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          placeholder="Enter server name"
        />
      </div>

      <!-- Configuration Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Minecraft Configuration -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Configuration</label>
          <MinecraftServerSelector
            v-model="formData.minecraftConfig"
            @update:modelValue="handleMinecraftConfigUpdate"
          />
        </div>

        <!-- Server Configuration -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium text-gray-700">Server Settings</h3>
          <SimpleConfigEditor v-model="config" />
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="emit('cancel')"
          class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Add Server</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import MinecraftServerSelector from '../components/MinecraftServerSelector.vue'
import SimpleConfigEditor from '../components/SimpleConfigEditor.vue'

const emit = defineEmits(['cancel'])

const router = useRouter()
const nodes = ref([])
const loading = ref(false)
const error = ref(null)

const formData = ref({
  name: '',
  minecraftConfig: {
    type: '',
    version: ''
  }
})

const config = ref({
  maxPlayers: 20,
  difficulty: 'normal',
  gameMode: 'survival',
  memory: 2,
  port: 25565,
  viewDistance: 10,
  spawnProtection: 16,
  seed: '',
  worldType: 'default',
  generateStructures: true
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

const handleMinecraftConfigUpdate = (minecraftConfig) => {
  formData.value.minecraftConfig = minecraftConfig
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
      name: formData.value.name,
      minecraftVersion: formData.value.minecraftConfig.version,
      serverType: formData.value.minecraftConfig.type,
      ...config.value
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
  @apply p-6;
}
</style> 