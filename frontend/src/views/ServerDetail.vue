<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="space-y-8">
      <!-- Header -->
      <div class="md:flex md:items-center md:justify-between">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {{ server?.name || 'Unnamed Server' }}
            <span
              v-if="server?.statusMessage"
              class="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2 align-middle"
            >
              {{ server.statusMessage }}
            </span>
          </h2>
        </div>
        <div class="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            v-if="server?.status === 'stopped'"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            @click="startServer"
          >
            Start Server
          </button>
          <button
            v-if="server?.status === 'running'"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="stopServer"
          >
            Stop Server
          </button>
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="navigateToConfig"
          >
            Configure
          </button>
        </div>
      </div>

      <!-- Server Status -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <ServerProvisioningStatus v-if="server" :server="server" />
        </div>
      </div>

      <!-- Server Information -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Server Information
          </h3>
        </div>
        <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Version</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ server?.minecraftVersion || '—' }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Node</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ server?.nodeId || 'No Node' }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Players</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ server?.playerCount || 0 }} online</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Instance ID</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ server?.instanceId || 'Not assigned' }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Server Type</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ server?.serverType || '—' }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">Created At</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ new Date(server?.createdAt).toLocaleString() }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import ServerProvisioningStatus from '@/components/ServerProvisioningStatus.vue';

export default {
  name: 'ServerDetail',

  components: {
    ServerProvisioningStatus
  },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const server = ref(null);
    const loading = ref(true);
    const error = ref(null);

    const fetchServer = async () => {
      try {
        const response = await axios.get(`/api/servers/${route.params.id}`);
        server.value = response.data.server;
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to fetch server';
      } finally {
        loading.value = false;
      }
    };

    const startServer = async () => {
      try {
        await axios.post(`/api/servers/${route.params.id}/start`);
        await fetchServer();
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to start server';
      }
    };

    const stopServer = async () => {
      try {
        await axios.post(`/api/servers/${route.params.id}/stop`);
        await fetchServer();
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to stop server';
      }
    };

    const navigateToConfig = () => {
      router.push(`/servers/${route.params.id}/config`);
    };

    // Poll for updates every 5 seconds
    let pollInterval;
    onMounted(() => {
      fetchServer();
      pollInterval = setInterval(fetchServer, 5000);
    });

    onUnmounted(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    });

    return {
      server,
      loading,
      error,
      startServer,
      stopServer,
      navigateToConfig
    };
  }
};
</script>
