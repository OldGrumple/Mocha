<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <router-link
        to="/servers"
        class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <svg class="w-4 h-4 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24">
          <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Servers
      </router-link>
    </div>

    <div v-if="server" class="space-y-6">
      <!-- Server Header -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                {{ server.name }}
              </h3>
              <p class="mt-1 max-w-2xl text-sm text-gray-500">
                Running on {{ server.nodeId.name }}
              </p>
            </div>
            <div class="flex space-x-3">
              <button
                v-if="server.status === 'stopped'"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                @click="startServer"
              >
                Start Server
              </button>
              <button
                v-if="server.status === 'running'"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                @click="stopServer"
              >
                Stop Server
              </button>
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                @click="navigateToConfig"
              >
                Configure Server
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200">
          <dl>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Status</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span :class="getStatusClass(server.status)">{{ server.status }}</span>
              </dd>
            </div>
            <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Minecraft Version</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {{ server.minecraftVersion }}
              </dd>
            </div>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Plugins</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul v-if="server.plugins && server.plugins.length > 0" class="list-disc list-inside">
                  <li v-for="(plugin, index) in server.plugins" :key="index">
                    {{ plugin.name }} (v{{ plugin.version }})
                  </li>
                </ul>
                <span v-else class="text-gray-500">No plugins installed</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white shadow">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.name"
              @click="currentTab = tab.name"
              :class="[
                currentTab === tab.name
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
        <div class="p-6">
          <!-- Overview Tab -->
          <div v-if="currentTab === 'overview'" class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Server Information</h4>
              <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Server Type</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ server.serverType }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Player Count</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ server.playerCount || 0 }} / {{ server.config?.maxPlayers || 20 }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Difficulty</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ server.config?.difficulty || 'normal' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Game Mode</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ server.config?.gameMode || 'survival' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Logs Tab -->
          <div v-if="currentTab === 'logs'">
            <ServerLogs :serverId="server._id" />
          </div>

          <!-- Plugins Tab -->
          <div v-if="currentTab === 'plugins' && server.serverType === 'paper'">
            <ServerPlugins :serverId="server._id" />
          </div>
          <div v-else-if="currentTab === 'plugins' && server.serverType !== 'paper'" class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Plugin management not available</h3>
            <p class="mt-1 text-sm text-gray-500">Plugin management is only available for Paper servers.</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import ServerLogs from '../components/ServerLogs.vue'
import ServerPlugins from '../components/ServerPlugins.vue'

const route = useRoute()
const router = useRouter()
const server = ref(null)
const currentTab = ref('overview')

const tabs = [
  { name: 'overview', label: 'Overview' },
  { name: 'logs', label: 'Logs' },
  { name: 'plugins', label: 'Plugins' }
]

const fetchServer = async () => {
  try {
    const response = await axios.get(`/api/servers/${route.params.id}`)
    server.value = response.data.server
    // If status is missing, set it to unknown
    if (!server.value.status) {
      server.value.status = 'unknown'
    }
  } catch (error) {
    console.error('Error fetching server:', error)
  }
}

const startServer = async () => {
  try {
    server.value.status = 'starting';
    server.value.statusMessage = 'Starting server...';
    const response = await axios.post(`/api/servers/${server.value._id}/start`);
    server.value = response.data.server;
  } catch (error) {
    console.error('Error starting server:', error);
    server.value.status = 'stopped';
    server.value.statusMessage = error.response?.data?.error || 'Failed to start server';
  }
}

const stopServer = async () => {
  try {
    server.value.status = 'stopping';
    server.value.statusMessage = 'Stopping server...';
    await axios.post(`/api/servers/${server.value._id}/stop`);
    
    // Poll for server status until it's stopped or error
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/servers/${server.value._id}`);
        server.value = response.data.server;
        
        if (server.value.status === 'stopped' || server.value.status === 'error') {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling server status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Clear interval after 35 seconds (timeout)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 35000);
  } catch (error) {
    console.error('Error stopping server:', error);
    server.value.status = 'error';
    server.value.statusMessage = error.response?.data?.error || 'Failed to stop server';
  }
}

const navigateToConfig = () => {
  router.push(`/servers/${server.value._id}/config`)
}

const getStatusClass = (status) => {
  const classes = {
    running: 'text-green-600',
    stopped: 'text-red-600',
    starting: 'text-yellow-600',
    stopping: 'text-yellow-600',
    error: 'text-red-600',
    provisioning: 'text-blue-600',
    unknown: 'text-gray-600'
  }
  return classes[status] || classes.unknown
}

// Poll for server status updates
const pollStatus = async () => {
  try {
    const response = await axios.get(`/api/servers/${route.params.id}/status`)
    if (server.value) {
      server.value.status = response.data.status.status || 'unknown'
      server.value.statusMessage = response.data.status.statusMessage
      server.value.playerCount = response.data.status.playerCount
    }
  } catch (error) {
    console.error('Error polling server status:', error)
  }
}

// Set up polling interval
let pollInterval
onMounted(() => {
  fetchServer()
  // Start polling every 5 seconds
  pollInterval = setInterval(pollStatus, 5000)
})

// Clean up polling on component unmount
onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script> 