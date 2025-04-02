<template>
  <div class="bg-white shadow rounded-lg p-4">
    <div class="space-y-4">
      <!-- Status Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">
          Server Status
        </h3>
        <StatusBadge :status="server.status" />
      </div>

      <!-- Progress Bar -->
      <div v-if="isProvisioning" class="w-full">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-gray-700">
            {{ formatStatus(server.status) }}
          </span>
          <span class="text-sm font-medium text-gray-700">
            {{ server.progress ?? 0 }}%
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            :style="{ width: `${server.progress ?? 0}%` }"
          ></div>
        </div>
      </div>

      <!-- Status Message -->
      <div class="text-sm text-gray-600">
        {{ server.status === 'jar_swap_in_progress' ? 'Swapping server jar file...' : (server.statusMessage || 'Working on provisioning the server...') }}
      </div>

      <!-- Error Message -->
      <div v-if="server.status === 'failed'" class="mt-2 text-sm text-red-600">
        {{ server.statusMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import StatusBadge from './StatusBadge.vue';

export default {
  name: 'ServerProvisioningStatus',

  components: {
    StatusBadge
  },

  props: {
    server: {
      type: Object,
      required: true
    }
  },

  computed: {
    isProvisioning() {
      return this.server.status?.startsWith('provisioning') || false;
    }
  },

  methods: {
    formatStatus(status) {
      if (!status) return 'Unknown';
      if (status.startsWith('provisioning_')) {
        const stage = status.split('_')[1];
        return stage.charAt(0).toUpperCase() + stage.slice(1);
      }
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
};
</script>
