<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900">
          Servers
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Manage your Minecraft servers across different nodes.
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          @click="showAddServerModal = true"
        >
          Add Server
        </button>
      </div>
    </div>

    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Name
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Node
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Version
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="server in servers" 
                    :key="server._id" 
                    class="cursor-pointer hover:bg-gray-50" 
                    @click="navigateToServer(server)"
                >
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ server.name }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ server.nodeId?.name || 'No Node' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ server.minecraftVersion }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <div v-if="isProvisioning(server.status)">
                      <ServerProvisioningStatus :server="server" />
                    </div>
                    <span v-else :class="getStatusClass(server.status)">
                      {{ server.status }}
                    </span>
                  </td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div class="flex justify-end space-x-2">
                      <button
                        v-if="server.status === 'stopped'"
                        class="text-green-600 hover:text-green-900"
                        @click.stop="startServer(server)"
                      >
                        Start
                      </button>
                      <button
                        v-if="server.status === 'running'"
                        class="text-red-600 hover:text-red-900"
                        @click.stop="stopServer(server)"
                      >
                        Stop
                      </button>
                      <button
                        class="text-indigo-600 hover:text-indigo-900"
                        @click.stop="navigateToConfig(server)"
                      >
                        Configure
                      </button>
                      <button
                        class="text-red-600 hover:text-red-900"
                        @click.stop="confirmDeleteServer(server)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Server Modal -->
    <div v-if="showAddServerModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-lg font-medium mb-4">
          Add New Server
        </h2>
        <form @submit.prevent="addServer">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newServer.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Node</label>
            <!-- <select
              v-model="newServer.nodeId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option v-for="node in nodes" :key="node._id" :value="node._id">
                {{ node.name }}
              </option>
            </select> -->
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Configuration</label>
            <MinecraftServerSelector
              v-model="newServer.minecraftConfig"
              @update:modelValue="handleMinecraftConfigUpdate"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              @click="showAddServerModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              Add Server
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Server Details Modal -->
    <div v-if="selectedServer" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-lg font-medium mb-4">
          Server Details
        </h2>
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-700">
              Status
            </h3>
            <p class="mt-1 text-sm text-gray-900">
              {{ selectedServer.status }}
            </p>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-700">
              Plugins
            </h3>
            <ul class="mt-1 space-y-1">
              <li v-for="(plugin, index) in selectedServer.plugins" :key="index" class="text-sm text-gray-900">
                {{ plugin.name }} (v{{ plugin.version }})
              </li>
            </ul>
          </div>
          <div class="flex justify-end">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              @click="selectedServer = null"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-lg font-medium mb-4">
          Delete Server
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to delete this server? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            @click="deleteServer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import ServerProvisioningStatus from '@/components/ServerProvisioningStatus.vue'
import MinecraftServerSelector from '../components/MinecraftServerSelector.vue'

const router = useRouter()
const servers = ref([])
const nodes = ref([])
const showAddServerModal = ref(false)
const selectedServer = ref(null)
const error = ref(null)
const newServer = ref({
  name: '',
  minecraftConfig: {
    type: '',
    version: ''
  }
})
const showDeleteModal = ref(false)
const serverToDelete = ref(null)

const fetchServers = async () => {
  try {
    const response = await axios.get('/api/servers')
    servers.value = response.data.servers.map(server => ({
      ...server,
      instanceId: server.instanceId || server._id // Use _id as fallback for instanceId
    }))
    console.log('Fetched servers:', servers.value)
  } catch (error) {
    console.error('Error fetching servers:', error)
  }
}

const fetchNodes = async () => {
  try {
    const response = await axios.get('/api/nodes')
    nodes.value = response.data.nodes
  } catch (error) {
    console.error('Error fetching nodes:', error)
  }
}

const handleMinecraftConfigUpdate = (config) => {
  newServer.value.minecraftConfig = config
}

const addServer = async () => {
  error.value = null // Reset error state
  if (!newServer.value.minecraftConfig.type || !newServer.value.minecraftConfig.version) {
    error.value = 'Please select both server type and version'
    return
  }

  try {
    const serverData = {
      name: newServer.value.name,
      minecraftVersion: newServer.value.minecraftConfig.version,
      serverType: newServer.value.minecraftConfig.type
    }

    await axios.post('/api/servers', serverData)
    showAddServerModal.value = false
    newServer.value = {
      name: '',
      minecraftConfig: {
        type: '',
        version: ''
      }
    }
    fetchServers()
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create server'
    console.error('Error creating server:', err)
  }
}

const startServer = async (server) => {
  try {
    await axios.post(`/api/servers/${server._id}/start`)
    server.status = 'running'
  } catch (error) {
    console.error('Error starting server:', error)
  }
}

const stopServer = async (server) => {
  try {
    await axios.post(`/api/servers/${server._id}/stop`)
    server.status = 'stopped'
  } catch (error) {
    console.error('Error stopping server:', error)
  }
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

const confirmDeleteServer = (server) => {
  serverToDelete.value = server
  showDeleteModal.value = true
}

const deleteServer = async () => {
  try {
    if (!serverToDelete.value) {
      console.error('No server selected for deletion');
      return;
    }

    console.log('Deleting server:', {
      id: serverToDelete.value._id,
      instanceId: serverToDelete.value.instanceId,
      name: serverToDelete.value.name
    });

    if (!serverToDelete.value.instanceId) {
      console.error('Server has no instanceId:', serverToDelete.value._id);
      alert('Server has no instanceId. Please try again.');
      return;
    }

    await axios.delete(`/api/servers/${serverToDelete.value._id}`);
    servers.value = servers.value.filter(s => s._id !== serverToDelete.value._id);
    showDeleteModal.value = false;
    serverToDelete.value = null;
  } catch (error) {
    console.error('Error deleting server:', error);
    alert(error.response?.data?.error || 'Failed to delete server. Please try again.');
  }
}

const navigateToServer = (server) => {
  router.push(`/servers/${server._id}`)
}

const navigateToConfig = (server) => {
  router.push(`/servers/${server._id}/config`)
}

const isProvisioning = (status) => {
  return status.startsWith('provisioning') || status === 'failed'
}

onMounted(() => {
  fetchServers()
  fetchNodes()
})
</script> 