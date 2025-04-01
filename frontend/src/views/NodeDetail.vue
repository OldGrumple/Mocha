<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <router-link to="/nodes" class="text-blue-600 hover:text-blue-800 flex items-center">
        <svg 
          class="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Nodes
      </router-link>
    </div>

    <div v-if="node" class="space-y-8">
      <!-- Node Header -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-3xl font-bold">{{ node.name }}</h1>
          <span :class="getStatusBadgeClass(node.status)">
            {{ node.status }}
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Hostname</p>
            <p class="font-medium">{{ node.hostname }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Operating System</p>
            <p class="font-medium">{{ node.os }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Last Seen</p>
            <p class="font-medium">{{ formatTime(node.lastSeen) }}</p>
          </div>
        </div>
      </div>

      <!-- System Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CPU Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">CPU Usage</h2>
          <div class="relative h-48">
            <canvas ref="cpuChart"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Current Usage</p>
              <p class="text-2xl font-bold">{{ metrics.cpuUsage }}%</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Cores</p>
              <p class="text-2xl font-bold">{{ node.cpuCores }}</p>
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Memory Usage</h2>
          <div class="relative h-48">
            <canvas ref="memoryChart"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Used</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.memoryUsed) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-2xl font-bold">{{ formatBytes(node.memoryBytes) }}</p>
            </div>
          </div>
        </div>

        <!-- Disk Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Disk Usage</h2>
          <div class="relative h-48">
            <canvas ref="diskChart"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Used</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.diskUsage) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-2xl font-bold">{{ formatBytes(node.memoryBytes) }}</p>
            </div>
          </div>
        </div>

        <!-- Network Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Network Usage</h2>
          <div class="relative h-48">
            <canvas ref="networkChart"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Upload</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.networkUpload) }}/s</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Download</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.networkDownload) }}/s</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Running Servers -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Running Servers</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="server in runningServers" :key="server._id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ server.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.type }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.version }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getServerStatusBadgeClass(server.status)">
                    {{ server.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.players }}/{{ server.maxPlayers }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button @click="viewServer(server._id)" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                  <button @click="stopServer(server._id)" class="text-red-600 hover:text-red-900">Stop</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Chart from 'chart.js/auto';

const route = useRoute();
const router = useRouter();
const node = ref(null);
const metrics = ref({
  cpuUsage: 0,
  memoryUsed: 0,
  memoryTotal: 0,
  diskUsage: 0,
  networkUpload: 0,
  networkDownload: 0
});
const runningServers = ref([]);
let pollInterval;
let charts = {
  cpu: null,
  memory: null,
  disk: null,
  network: null
};

const fetchNodeDetails = async () => {
  try {
    const response = await axios.get(`/api/nodes/${route.params.id}`);
    node.value = response.data.node;
    // Update metrics from node details
    metrics.value = {
      cpuUsage: node.value.metrics.cpuUsage,
      memoryUsed: node.value.metrics.memoryUsed,
      memoryTotal: node.value.metrics.memoryTotal,
      diskUsage: node.value.metrics.diskUsage,
      networkUpload: node.value.metrics.networkBytesOut,
      networkDownload: node.value.metrics.networkBytesIn
    };
    // Initialize charts after node data is loaded
    initializeCharts();
    updateCharts();
  } catch (error) {
    console.error('Failed to fetch node details:', error);
  }
};

const fetchRunningServers = async () => {
  try {
    const response = await axios.get(`/api/nodes/${route.params.id}/servers`);
    runningServers.value = response.data.servers;
  } catch (error) {
    console.error('Failed to fetch running servers:', error);
  }
};

const getStatusBadgeClass = (status) => {
  const baseClasses = 'px-2 py-1 rounded-full text-sm font-medium';
  switch (status) {
    case 'online':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'offline':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'error':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getServerStatusBadgeClass = (status) => {
  const baseClasses = 'px-2 py-1 rounded-full text-sm font-medium';
  switch (status) {
    case 'running':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'stopped':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'starting':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const initializeCharts = () => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // CPU Chart
  const cpuCtx = document.querySelector('#cpuChart');
  if (cpuCtx) {
    charts.cpu = new Chart(cpuCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          tension: 0.1
        }]
      },
      options: chartOptions
    });
  }

  // Memory Chart
  const memoryCtx = document.querySelector('#memoryChart');
  if (memoryCtx) {
    charts.memory = new Chart(memoryCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Memory Usage',
          data: [],
          borderColor: 'rgb(16, 185, 129)',
          tension: 0.1
        }]
      },
      options: chartOptions
    });
  }

  // Disk Chart
  const diskCtx = document.querySelector('#diskChart');
  if (diskCtx) {
    charts.disk = new Chart(diskCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Disk Usage',
          data: [],
          borderColor: 'rgb(245, 158, 11)',
          tension: 0.1
        }]
      },
      options: chartOptions
    });
  }

  // Network Chart
  const networkCtx = document.querySelector('#networkChart');
  if (networkCtx) {
    charts.network = new Chart(networkCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Network Usage',
          data: [],
          borderColor: 'rgb(139, 92, 246)',
          tension: 0.1
        }]
      },
      options: chartOptions
    });
  }
};

const updateCharts = () => {
  const timestamp = new Date().toLocaleTimeString();
  
  // Update CPU Chart
  charts.cpu.data.labels.push(timestamp);
  charts.cpu.data.datasets[0].data.push(metrics.value.cpuUsage);
  if (charts.cpu.data.labels.length > 20) {
    charts.cpu.data.labels.shift();
    charts.cpu.data.datasets[0].data.shift();
  }
  charts.cpu.update();

  // Update Memory Chart
  charts.memory.data.labels.push(timestamp);
  charts.memory.data.datasets[0].data.push(metrics.value.memoryUsed);
  if (charts.memory.data.labels.length > 20) {
    charts.memory.data.labels.shift();
    charts.memory.data.datasets[0].data.shift();
  }
  charts.memory.update();

  // Update Disk Chart
  charts.disk.data.labels.push(timestamp);
  charts.disk.data.datasets[0].data.push(metrics.value.diskUsage);
  if (charts.disk.data.labels.length > 20) {
    charts.disk.data.labels.shift();
    charts.disk.data.datasets[0].data.shift();
  }
  charts.disk.update();

  // Update Network Chart
  charts.network.data.labels.push(timestamp);
  charts.network.data.datasets[0].data.push(metrics.value.networkUpload + metrics.value.networkDownload);
  if (charts.network.data.labels.length > 20) {
    charts.network.data.labels.shift();
    charts.network.data.datasets[0].data.shift();
  }
  charts.network.update();
};

const viewServer = (serverId) => {
  router.push(`/servers/${serverId}`);
};

const stopServer = async (serverId) => {
  try {
    await axios.post(`/api/servers/${serverId}/stop`);
    await fetchRunningServers();
  } catch (error) {
    console.error('Failed to stop server:', error);
  }
};

onMounted(() => {
  fetchNodeDetails();
  fetchRunningServers();
  
  // Poll for updates every 5 seconds
  pollInterval = setInterval(() => {
    fetchNodeDetails();
    fetchRunningServers();
  }, 5000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  // Clean up charts
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.destroy();
    }
  });
});
</script> 