<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ error }}</span>
    </div>

    <!-- Server Content -->
    <div v-else-if="server" class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ server.name }}</h1>
        <div class="flex gap-2">
          <ServerJarSwap
            :server-id="server._id"
            :current-type="server.serverType"
            :current-version="server.minecraftVersion"
            @jar-swapped="handleJarSwapped"
          />
          <ServerControlButtons
            :server-status="server.status"
            :is-starting="isStarting"
            :is-stopping="isStopping"
            :is-restarting="isRestarting"
            @start="startServer"
            @stop="stopServer"
            @restart="restartServer"
          />
        </div>
      </div>

      <!-- Server Status -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-2">Server Status</h2>
        <div class="flex items-center gap-2">
          <span
            :class="{
              'bg-green-100 text-green-800': server.status === 'running',
              'bg-red-100 text-red-800': server.status === 'stopped',
              'bg-yellow-100 text-yellow-800': ['provisioning', 'provisioning_setup', 'provisioning_download', 'provisioning_config', 'starting', 'stopping'].includes(server.status),
              'bg-blue-100 text-blue-800': server.status === 'provisioned',
              'bg-gray-100 text-gray-800': server.status === 'error'
            }"
            class="px-2 py-1 rounded-full text-sm font-medium"
          >
            {{ server.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
          </span>
          <span v-if="server.playerCount !== undefined" class="text-gray-600">
            Players: {{ server.playerCount }}
          </span>
        </div>
        <p v-if="server.statusMessage" class="mt-1 text-sm text-gray-600">
          {{ server.statusMessage }}
        </p>
      </div>

      <!-- Server Details -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 class="text-lg font-semibold mb-2">Server Details</h2>
          <dl class="grid grid-cols-2 gap-2">
            <dt class="text-gray-600">Type:</dt>
            <dd>{{ server.serverType }}</dd>
            <dt class="text-gray-600">Version:</dt>
            <dd>{{ server.minecraftVersion }}</dd>
            <dt class="text-gray-600">Node:</dt>
            <dd>{{ server.nodeId?.name || 'Unknown' }}</dd>
          </dl>
        </div>
        <div>
          <h2 class="text-lg font-semibold mb-2">Actions</h2>
          <div class="flex gap-2">
            <button
              @click="navigateToConfig"
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Configure Server
            </button>
          </div>
        </div>
      </div>

      <!-- Server Configuration Files -->
      <ServerConfigFiles
      />

      <!-- Provisioning Status -->
      <ServerProvisioningStatus
        v-if="server && (server.status === 'provisioning' || server.status === 'jar_swap_in_progress')"
        :server="server"
      />
    </div>

    <!-- No Server Found -->
    <div v-else class="text-center py-12">
      <h2 class="text-xl font-semibold text-gray-900">Server not found</h2>
      <p class="mt-2 text-gray-600">The server you're looking for doesn't exist or has been deleted.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import ServerProvisioningStatus from '@/components/ServerProvisioningStatus.vue'
import ServerJarSwap from '../components/ServerJarSwap.vue'
import ServerControlButtons from '../components/ServerControlButtons.vue'
import ServerConfigFiles from '../components/ServerConfigFiles.vue'

export default {
  name: 'ServerDetail',

  components: {
    ServerProvisioningStatus,
    ServerJarSwap,
    ServerControlButtons,
    ServerConfigFiles
  },

  setup() {
    const route = useRoute()
    const router = useRouter()
    const server = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const isStarting = ref(false)
    const isStopping = ref(false)
    const isRestarting = ref(false)
    let statusPollInterval = null

    const fetchServer = async () => {
      try {
        loading.value = true
        error.value = null
        const response = await axios.get(`/api/servers/${route.params.id}`)
        if (!server.value || server.value.status !== response.data.server.status) {
          console.log('Server status updated:', response.data.server.status)
        }
        server.value = response.data.server
      } catch (err) {
        console.error('Error fetching server:', err)
        error.value = err.response?.data?.error || 'Failed to fetch server details'
      } finally {
        loading.value = false
      }
    }

    const startServer = async () => {
      try {
        isStarting.value = true
        error.value = null
        await axios.post(`/api/servers/${route.params.id}/start`)
        statusPollInterval && clearInterval(statusPollInterval)
        statusPollInterval = setInterval(fetchServer, 2000)
        server.value = {
          ...server.value,
          status: 'starting',
          statusMessage: 'Starting server...'
        }
        let attempts = 0
        const maxAttempts = 30
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const statusResponse = await axios.get(`/api/servers/${route.params.id}`)
          const currentStatus = statusResponse.data.server.status
          if (currentStatus === 'running') break
          if (currentStatus === 'stopped' || currentStatus === 'failed') {
            throw new Error('Server failed to start')
          }
          attempts++
        }
        if (attempts >= maxAttempts) throw new Error('Server start timed out')
        await fetchServer()
      } catch (err) {
        console.error('Error starting server:', err)
        error.value = err.response?.data?.error || err.message || 'Failed to start server'
        if (server.value) {
          server.value.status = 'stopped'
          server.value.statusMessage = 'Failed to start server'
        }
      } finally {
        isStarting.value = false
        statusPollInterval && clearInterval(statusPollInterval)
        statusPollInterval = setInterval(fetchServer, 5000)
      }
    }

    const stopServer = async () => {
      try {
        isStopping.value = true
        error.value = null
        await axios.post(`/api/servers/${route.params.id}/stop`)
        await fetchServer()
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to stop server'
        console.error('Error stopping server:', err)
      } finally {
        isStopping.value = false
      }
    }

    const restartServer = async () => {
      try {
        isRestarting.value = true
        error.value = null
        await axios.post(`/api/servers/${route.params.id}/stop`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        await axios.post(`/api/servers/${route.params.id}/start`)
        await fetchServer()
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to restart server'
        console.error('Error restarting server:', err)
      } finally {
        isRestarting.value = false
      }
    }

    const navigateToConfig = () => {
      router.push(`/servers/${route.params.id}/config`)
    }

    const handleJarSwapped = (updatedServer) => {
      server.value = updatedServer
    }

    const startStatusPolling = () => {
      if (server.value?.status === 'running' || server.value?.status === 'provisioning') {
        statusPollInterval = setInterval(fetchServer, 5000)
      }
    }

    const stopStatusPolling = () => {
      if (statusPollInterval) {
        clearInterval(statusPollInterval)
        statusPollInterval = null
      }
    }

    onMounted(async () => {
      await fetchServer()
      startStatusPolling()
    })

    onUnmounted(() => {
      stopStatusPolling()
    })

    return {
      server,
      loading,
      error,
      isStarting,
      isStopping,
      isRestarting,
      startServer,
      stopServer,
      restartServer,
      navigateToConfig,
      handleJarSwapped
    }
  }
}
</script>
