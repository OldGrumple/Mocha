<template>
  <div class="server-properties-editor">
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div class="space-y-6">
      <!-- Basic Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label for="motd" class="block text-sm font-medium text-gray-700">Message of the Day (MOTD)</label>
            <input
              type="text"
              id="motd"
              v-model="config.motd"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Welcome message shown in the server list"
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

      <!-- World Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">World Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="single_biome_surface">Single Biome</option>
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
                <span class="ml-2">Enable structure generation</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Performance Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label for="spawnProtection" class="block text-sm font-medium text-gray-700">Spawn Protection</label>
            <input
              type="number"
              id="spawnProtection"
              v-model="config.spawnProtection"
              min="0"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="maxTickTime" class="block text-sm font-medium text-gray-700">Max Tick Time (ms)</label>
            <input
              type="number"
              id="maxTickTime"
              v-model="config.maxTickTime"
              min="0"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Network Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Network Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="port" class="block text-sm font-medium text-gray-700">Server Port</label>
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
            <label for="onlineMode" class="block text-sm font-medium text-gray-700">Online Mode</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.onlineMode"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Require authentication</span>
              </label>
            </div>
          </div>
          <div>
            <label for="whiteList" class="block text-sm font-medium text-gray-700">Whitelist</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.whiteList"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Enable whitelist</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Gameplay Settings -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Gameplay Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="pvp" class="block text-sm font-medium text-gray-700">PvP</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.pvp"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Enable PvP</span>
              </label>
            </div>
          </div>
          <div>
            <label for="allowFlight" class="block text-sm font-medium text-gray-700">Allow Flight</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.allowFlight"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Allow players to fly</span>
              </label>
            </div>
          </div>
          <div>
            <label for="allowNether" class="block text-sm font-medium text-gray-700">Allow Nether</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.allowNether"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Enable Nether dimension</span>
              </label>
            </div>
          </div>
          <div>
            <label for="enableCommandBlock" class="block text-sm font-medium text-gray-700">Command Blocks</label>
            <div class="mt-1">
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="config.enableCommandBlock"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span class="ml-2">Enable command blocks</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Save and Reset Buttons -->
      <div class="flex justify-between">
        <button
          @click="resetToDefaults"
          class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset to Defaults
        </button>
        <button
          @click="confirmSave"
          :disabled="loading"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
      </div>

      <!-- Confirmation Dialog -->
      <div v-if="showConfirmation" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Confirm Changes</h3>
          <p class="text-gray-600 mb-4">
            Saving these changes will restart the server if it's currently running. Are you sure you want to continue?
          </p>
          <div class="flex justify-end gap-4">
            <button
              @click="showConfirmation = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              @click="saveConfig"
              class="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Confirm
            </button>
          </div>
        </div>
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

const defaultConfig = {
  serverName: 'Minecraft Server',
  maxPlayers: 20,
  difficulty: 'normal',
  gameMode: 'survival',
  viewDistance: 10,
  spawnProtection: 16,
  seed: '',
  worldType: 'default',
  generateStructures: true,
  port: 25565,
  onlineMode: true,
  whiteList: false,
  pvp: true,
  allowFlight: false,
  allowNether: true,
  enableCommandBlock: true,
  maxTickTime: 60000,
  motd: 'Welcome to your Minecraft server!',
  enableQuery: true,
  queryPort: 25565,
  enableRcon: false,
  rconPort: 25575,
  rconPassword: '',
  opPermissionLevel: 4,
  functionPermissionLevel: 2,
  forceGamemode: false,
  hardcore: false,
  hideOnlinePlayers: false
}

const config = ref({ ...defaultConfig })
const loading = ref(false)
const error = ref(null)
const showConfirmation = ref(false)

const resetToDefaults = () => {
  config.value = { ...defaultConfig }
}

const confirmSave = () => {
  showConfirmation.value = true
}

const fetchConfig = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.get(`/api/servers/${props.serverId}/config`)
    config.value = { ...defaultConfig, ...response.data }
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
    showConfirmation.value = false
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
.server-properties-editor {
  @apply p-6 bg-gray-50 rounded-lg;
}
</style> 