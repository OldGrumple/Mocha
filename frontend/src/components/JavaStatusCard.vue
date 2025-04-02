<template>
  <div class="bg-white shadow rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Java Status</h3>
      <div v-if="!javaStatus.installed || !javaStatus.meetsRequirement" class="flex items-center">
        <button
          @click="installJava"
          :disabled="isInstalling"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            v-if="isInstalling"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ isInstalling ? 'Installing...' : 'Install Java' }}
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div
            :class="[
              'h-2.5 w-2.5 rounded-full',
              javaStatus.installed ? 'bg-green-400' : 'bg-red-400'
            ]"
          ></div>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">
            Installation Status
          </p>
          <p class="text-sm text-gray-500">
            {{ javaStatus.installed ? 'Java is installed' : 'Java is not installed' }}
          </p>
        </div>
      </div>

      <div v-if="javaStatus.installed" class="flex items-center">
        <div class="flex-shrink-0">
          <div
            :class="[
              'h-2.5 w-2.5 rounded-full',
              javaStatus.meetsRequirement ? 'bg-green-400' : 'bg-yellow-400'
            ]"
          ></div>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">
            Version Compatibility
          </p>
          <p class="text-sm text-gray-500">
            {{ javaStatus.meetsRequirement ? 'Version meets requirements' : 'Version does not meet requirements' }}
          </p>
        </div>
      </div>

      <div v-if="javaStatus.installed" class="flex items-center">
        <div class="flex-shrink-0">
          <div class="h-2.5 w-2.5 rounded-full bg-blue-400"></div>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">
            Current Version
          </p>
          <p class="text-sm text-gray-500">
            {{ javaStatus.version || 'Unknown' }}
          </p>
        </div>
      </div>

      <div v-if="error" class="mt-4">
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                {{ error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue'
import axios from 'axios'

const props = defineProps({
  nodeId: {
    type: String,
    required: true
  }
})

const javaStatus = ref({
  installed: false,
  meetsRequirement: false,
  version: null
})

const isInstalling = ref(false)
const error = ref(null)

const fetchJavaStatus = async () => {
  try {
    const response = await axios.get(`/api/nodes/${props.nodeId}`)
    if (response.data.node.javaStatus) {
      javaStatus.value = response.data.node.javaStatus
    }
  } catch (err) {
    error.value = 'Failed to fetch Java status'
    console.error('Error fetching Java status:', err)
  }
}

const installJava = async () => {
  isInstalling.value = true
  error.value = null
  
  try {
    await axios.post(`/api/nodes/${props.nodeId}/install-java`)
    // Start polling for status updates
    const pollInterval = setInterval(async () => {
      await fetchJavaStatus()
      if (javaStatus.value.installed && javaStatus.value.meetsRequirement) {
        clearInterval(pollInterval)
        isInstalling.value = false
      }
    }, 5000) // Poll every 5 seconds

    // Clear interval after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isInstalling.value) {
        isInstalling.value = false
        error.value = 'Installation timed out'
      }
    }, 300000) // 5 minutes
  } catch (err) {
    isInstalling.value = false
    error.value = 'Failed to initiate Java installation'
    console.error('Error installing Java:', err)
  }
}

onMounted(() => {
  fetchJavaStatus()
})
</script> 