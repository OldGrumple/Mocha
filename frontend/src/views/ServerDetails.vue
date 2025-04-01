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

    <div v-if="server" class="bg-white shadow overflow-hidden sm:rounded-lg">
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

    <div v-else class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const server = ref(null)

const fetchServer = async () => {
  try {
    const response = await axios.get(`/api/servers/${route.params.id}`)
    server.value = response.data.server
  } catch (error) {
    console.error('Error fetching server:', error)
  }
}

const startServer = async () => {
  try {
    await axios.post(`/api/servers/${server.value._id}/start`)
    server.value.status = 'running'
  } catch (error) {
    console.error('Error starting server:', error)
  }
}

const stopServer = async () => {
  try {
    await axios.post(`/api/servers/${server.value._id}/stop`)
    server.value.status = 'stopped'
  } catch (error) {
    console.error('Error stopping server:', error)
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
    stopping: 'text-yellow-600'
  }
  return classes[status] || 'text-gray-600'
}

onMounted(() => {
  fetchServer()
})
</script> 