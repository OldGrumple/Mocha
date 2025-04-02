<template>
  <div>
    <!-- Swap Jar Button -->
    <button
      @click="openModal"
      class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
      :disabled="isLoading"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clip-rule="evenodd"
        />
      </svg>
      Swap Jar
    </button>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Swap Server Jar</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Server Type Selection -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Server Type</label>
          <select
            v-model="selectedType"
            class="w-full p-2 border rounded-md"
            :disabled="isLoading"
          >
            <option value="">Select a type</option>
            <option v-for="type in serverTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>

        <!-- Version Selection -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Version</label>
          <select
            v-model="selectedVersion"
            class="w-full p-2 border rounded-md"
            :disabled="isLoading || !selectedType"
          >
            <option value="">Select a version</option>
            <option v-for="version in versions" :key="version.id" :value="version.id">
              {{ version.name }}
            </option>
          </select>
        </div>

        <!-- Warning Message -->
        <div v-if="showWarning" class="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
          <p class="text-sm">
            Warning: Swapping the jar file will stop the server if it's running. Make sure to backup your world before proceeding.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2">
          <button
            @click="closeModal"
            class="px-4 py-2 text-gray-700 hover:text-gray-900"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button
            @click="swapJar"
            class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
            :disabled="isLoading || !selectedType || !selectedVersion"
          >
            <span v-if="isLoading">Swapping...</span>
            <span v-else>Swap Jar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

export default {
  name: 'ServerJarSwap',
  props: {
    serverId: {
      type: String,
      required: true
    },
    currentType: {
      type: String,
      required: true
    },
    currentVersion: {
      type: String,
      required: true
    }
  },
  emits: ['jar-swapped'],
  setup(props, { emit }) {
    const isModalOpen = ref(false)
    const isLoading = ref(false)
    const showWarning = ref(true)
    const serverTypes = ref([])
    const versions = ref([])
    const selectedType = ref('')
    const selectedVersion = ref('')

    const fetchServerTypes = async () => {
      try {
        const response = await axios.get('/api/minecraft/types')
        serverTypes.value = response.data
      } catch (error) {
        console.error('Error fetching server types:', error)
      }
    }

    const fetchVersions = async (type) => {
      try {
        const response = await axios.get(`/api/minecraft/versions/${type}`)
        versions.value = response.data
        selectedVersion.value = ''
      } catch (error) {
        console.error('Error fetching versions:', error)
      }
    }

    const openModal = () => {
      isModalOpen.value = true
      selectedType.value = props.currentType
      if (selectedType.value) {
        fetchVersions(selectedType.value)
      }
    }

    const closeModal = () => {
      isModalOpen.value = false
      selectedType.value = ''
      selectedVersion.value = ''
      versions.value = []
    }

    const swapJar = async () => {
      if (!selectedType.value || !selectedVersion.value) return

      isLoading.value = true
      try {
        const response = await axios.post(`/api/servers/${props.serverId}/swap-jar`, {
          newType: selectedType.value,
          newVersion: selectedVersion.value
        })

        emit('jar-swapped', response.data.server)
        closeModal()
      } catch (error) {
        console.error('Error swapping jar:', error)
        // You might want to show an error message to the user here
      } finally {
        isLoading.value = false
      }
    }

    // Watch for type changes to fetch versions
    watch(selectedType, (newType) => {
      if (newType) {
        fetchVersions(newType)
      }
    })

    onMounted(() => {
      fetchServerTypes()
    })

    return {
      isModalOpen,
      isLoading,
      showWarning,
      serverTypes,
      versions,
      selectedType,
      selectedVersion,
      openModal,
      closeModal,
      swapJar
    }
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style> 