<template>
  <div class="bg-white shadow overflow-hidden sm:rounded-lg">
    <div class="px-4 py-5 sm:px-6">
      <div class="flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Server Logs</h3>
        <div class="flex space-x-2">
          <select
            v-model="selectedLevel"
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
          </select>
          <button
            @click="refreshLogs"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200">
      <div class="bg-gray-50 px-4 py-5 sm:px-6">
        <div class="space-y-4">
          <div v-if="loading" class="text-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
          <div v-else-if="logs.length === 0" class="text-center py-4 text-gray-500">
            No logs available
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(log, index) in filteredLogs"
              :key="index"
              class="flex items-start space-x-2"
            >
              <span class="text-xs text-gray-500">{{ formatTimestamp(log.timestamp) }}</span>
              <span
                :class="{
                  'text-green-600': log.level === 'info',
                  'text-red-600': log.level === 'error',
                  'text-yellow-600': log.level === 'warn'
                }"
                class="text-xs font-medium"
              >
                [{{ log.level.toUpperCase() }}]
              </span>
              <span class="text-sm text-gray-900">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'ServerLogs',
  props: {
    serverId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const logs = ref([])
    const loading = ref(false)
    const selectedLevel = ref('')

    const fetchLogs = async () => {
      loading.value = true
      try {
        const response = await axios.get(`/api/servers/${props.serverId}/logs`)
        logs.value = response.data.logs
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        loading.value = false
      }
    }

    const filteredLogs = computed(() => {
      if (!selectedLevel.value) return logs.value
      return logs.value.filter(log => log.level === selectedLevel.value)
    })

    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleString()
    }

    const refreshLogs = () => {
      fetchLogs()
    }

    onMounted(() => {
      fetchLogs()
    })

    return {
      logs,
      loading,
      selectedLevel,
      filteredLogs,
      formatTimestamp,
      refreshLogs
    }
  }
}
</script> 