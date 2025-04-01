<template>
  <div class="minecraft-config-editor">
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div class="space-y-6">
      <!-- Basic Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
        <div class="space-y-4">
          <div>
            <label for="serverName" class="block text-sm font-medium text-gray-700">Server Name</label>
            <input
              type="text"
              id="serverName"
              v-model="config.serverName"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="My Minecraft Server"
            />
          </div>
          <div>
            <label for="maxPlayers" class="block text-sm font-medium text-gray-700">Max Players</label>
            <input
              type="number"
              id="maxPlayers"
              v-model="config.maxPlayers"
              min="1"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="difficulty" class="block text-sm font-medium text-gray-700">Difficulty</label>
            <select
              id="difficulty"
              v-model="config.difficulty"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="peaceful">Peaceful</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label for="gameMode" class="block text-sm font-medium text-gray-700">Game Mode</label>
            <select
              id="gameMode"
              v-model="config.gameMode"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="survival">Survival</option>
              <option value="creative">Creative</option>
              <option value="adventure">Adventure</option>
              <option value="spectator">Spectator</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        <div class="space-y-4">
          <div>
            <label for="memory" class="block text-sm font-medium text-gray-700">Memory (GB)</label>
            <input
              type="number"
              id="memory"
              v-model="config.memory"
              min="1"
              step="0.5"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="port" class="block text-sm font-medium text-gray-700">Port</label>
            <input
              type="number"
              id="port"
              v-model="config.port"
              min="1"
              max="65535"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="viewDistance" class="block text-sm font-medium text-gray-700">View Distance</label>
            <input
              type="number"
              id="viewDistance"
              v-model="config.viewDistance"
              min="3"
              max="32"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="spawnProtection" class="block text-sm font-medium text-gray-700">Spawn Protection Radius</label>
            <input
              type="number"
              id="spawnProtection"
              v-model="config.spawnProtection"
              min="0"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <!-- World Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">World Settings</h3>
        <div class="space-y-4">
          <div>
            <label for="seed" class="block text-sm font-medium text-gray-700">World Seed</label>
            <input
              type="text"
              id="seed"
              v-model="config.seed"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Leave empty for random"
            />
          </div>
          <div>
            <label for="worldType" class="block text-sm font-medium text-gray-700">World Type</label>
            <select
              id="worldType"
              v-model="config.worldType"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="default">Default</option>
              <option value="flat">Flat</option>
              <option value="large_biomes">Large Biomes</option>
              <option value="amplified">Amplified</option>
            </select>
          </div>
          <div>
            <label for="generateStructures" class="block text-sm font-medium text-gray-700">Generate Structures</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.generateStructures"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2 text-sm text-gray-700">Enable structure generation</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          @click="saveConfig"
          :disabled="loading"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, defineEmits } from 'vue'
import axios from 'axios'

const props = defineProps({
  serverId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['config-saved'])

const config = ref({
  serverName: '',
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

const loading = ref(false)
const error = ref(null)

const fetchConfig = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.get(`/api/servers/${props.serverId}/config`)
    config.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch server configuration'
    console.error('Error fetching config:', err)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  try {
    loading.value = true
    error.value = null
    await axios.put(`/api/servers/${props.serverId}/config`, config.value)
    emit('config-saved')
  } catch (err) {
    error.value = 'Failed to save server configuration'
    console.error('Error saving config:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.minecraft-config-editor {
  @apply p-6 bg-gray-50 rounded-lg;
}
</style> 