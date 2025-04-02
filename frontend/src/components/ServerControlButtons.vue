<template>
  <div class="flex gap-2">
    <button
      v-if="['stopped', 'failed', 'provisioned'].includes(serverStatus)"
      @click="$emit('start')"
      :disabled="isStarting || ['starting', 'provisioning', 'provisioning_setup', 'provisioning_download', 'provisioning_config'].includes(serverStatus)"
      class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg 
        v-if="isStarting || serverStatus === 'starting'" 
        class="animate-spin h-4 w-4" 
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
      <span>{{ isStarting || serverStatus === 'starting' ? 'Starting...' : 'Start Server' }}</span>
    </button>
    <button
      v-if="['running', 'starting', 'provisioned'].includes(serverStatus)"
      @click="$emit('stop')"
      :disabled="isStopping || ['stopping', 'provisioning', 'provisioning_setup', 'provisioning_download', 'provisioning_config'].includes(serverStatus)"
      class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg 
        v-if="isStopping || serverStatus === 'stopping'" 
        class="animate-spin h-4 w-4" 
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
      <span>{{ isStopping || serverStatus === 'stopping' ? 'Stopping...' : 'Stop Server' }}</span>
    </button>
    <button
      v-if="['running', 'starting', 'provisioned'].includes(serverStatus)"
      @click="$emit('restart')"
      :disabled="isRestarting || ['stopping', 'starting', 'provisioning', 'provisioning_setup', 'provisioning_download', 'provisioning_config'].includes(serverStatus)"
      class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg 
        v-if="isRestarting || serverStatus === 'stopping'" 
        class="animate-spin h-4 w-4" 
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
      <span>{{ isRestarting || serverStatus === 'stopping' ? 'Restarting...' : 'Restart Server' }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ServerControlButtons',
  props: {
    serverStatus: {
      type: String,
      required: true
    },
    isStarting: {
      type: Boolean,
      default: false
    },
    isStopping: {
      type: Boolean,
      default: false
    },
    isRestarting: {
      type: Boolean,
      default: false
    }
  },
  emits: ['start', 'stop', 'restart']
}
</script> 