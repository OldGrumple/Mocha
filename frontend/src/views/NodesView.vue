<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900">
          Nodes
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Manage your Minecraft server nodes and their configurations.
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          @click="showAddNodeModal = true"
        >
          Add Node
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
                    Address
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Last Seen
                  </th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="node in nodes" :key="node._id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ node.name }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ node.address }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span :class="getStatusClass(node.status)">{{ node.status }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ formatDate(node.lastSeen) }}
                  </td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      class="text-indigo-600 hover:text-indigo-900"
                      @click="showNodeActions(node)"
                    >
                      Actions
                    </button>
                    <button
                      class="text-red-600 hover:text-red-900 ml-4"
                      @click="confirmDeleteNode(node)"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Node Modal -->
    <div v-if="showAddNodeModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-lg font-medium mb-4">
          Add New Node
        </h2>
        <form @submit.prevent="addNode">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newNode.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Address</label>
            <input
              v-model="newNode.address"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="node.example.com:50051"
              required
            >
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              @click="showAddNodeModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              Add Node
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Node Actions Modal -->
    <div v-if="selectedNode" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-lg font-medium mb-4">
          Node Actions
        </h2>
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-700">
              API Key
            </h3>
            <div class="mt-1 flex items-center space-x-2">
              <input
                type="text"
                :value="selectedNode.apiKey"
                readonly
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
              <button
                class="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                @click="regenerateApiKey"
              >
                Regenerate
              </button>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-700">
              Certificates
            </h3>
            <div class="mt-1">
              <button
                class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                @click="regenerateCertificates"
              >
                Regenerate Certificates
              </button>
            </div>
          </div>
          <div class="flex justify-end">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              @click="selectedNode = null"
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
          Delete Node
        </h2>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to delete this node? This action cannot be undone.
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
            @click="deleteNode"
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
import axios from 'axios'

const nodes = ref([])
const showAddNodeModal = ref(false)
const selectedNode = ref(null)
const newNode = ref({
  name: '',
  address: ''
})
const showDeleteModal = ref(false)
const nodeToDelete = ref(null)

const fetchNodes = async () => {
  try {
    const response = await axios.get('/api/nodes')
    nodes.value = response.data.nodes
  } catch (error) {
    console.error('Error fetching nodes:', error)
  }
}

const addNode = async () => {
  try {
    const response = await axios.post('/api/nodes', newNode.value)
    nodes.value.push(response.data.node)
    showAddNodeModal.value = false
    newNode.value = { name: '', address: '' }
  } catch (error) {
    console.error('Error adding node:', error)
  }
}

const showNodeActions = (node) => {
  selectedNode.value = node
}

const regenerateApiKey = async () => {
  try {
    const response = await axios.post(`/api/nodes/${selectedNode.value._id}/generate-api-key`)
    selectedNode.value.apiKey = response.data.apiKey
  } catch (error) {
    console.error('Error regenerating API key:', error)
  }
}

const regenerateCertificates = async () => {
  try {
    const response = await axios.post(`/api/nodes/${selectedNode.value._id}/regenerate-certificates`)
    selectedNode.value.certificate = response.data
  } catch (error) {
    console.error('Error regenerating certificates:', error)
  }
}

const getStatusClass = (status) => {
  const classes = {
    active: 'text-green-600',
    inactive: 'text-red-600',
    maintenance: 'text-yellow-600'
  }
  return classes[status] || 'text-gray-600'
}

const formatDate = (date) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}

const confirmDeleteNode = (node) => {
  nodeToDelete.value = node
  showDeleteModal.value = true
}

const deleteNode = async () => {
  try {
    await axios.delete(`/api/nodes/${nodeToDelete.value._id}`)
    nodes.value = nodes.value.filter(n => n._id !== nodeToDelete.value._id)
    showDeleteModal.value = false
    nodeToDelete.value = null
  } catch (error) {
    console.error('Error deleting node:', error)
    alert(error.response?.data?.error || 'Failed to delete node. Please try again.')
  }
}

onMounted(() => {
  fetchNodes()
})
</script> 