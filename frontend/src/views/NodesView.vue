<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Nodes</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Master Node -->
      <div v-if="masterNode" class="bg-white rounded-lg shadow-md p-6 border-2 border-blue-500">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-blue-600">Master Node</h2>
          <span :class="getStatusBadgeClass(masterNode.status)">
            {{ masterNode.status }}
          </span>
        </div>
        <div class="space-y-2">
          <p><span class="font-medium">Hostname:</span> {{ masterNode.hostname }}</p>
          <p><span class="font-medium">OS:</span> {{ masterNode.os }}</p>
          <p><span class="font-medium">CPU Cores:</span> {{ masterNode.cpuCores }}</p>
          <p><span class="font-medium">Memory:</span> {{ formatBytes(masterNode.memoryBytes) }}</p>
          <p><span class="font-medium">Last Seen:</span> {{ formatTime(masterNode.lastSeen) }}</p>
        </div>
        <div class="mt-4">
          <router-link 
            :to="{ name: 'node-detail', params: { id: masterNode._id }}"
            class="text-blue-600 hover:text-blue-800"
          >
            View Details →
          </router-link>
        </div>
      </div>

      <!-- Agent Nodes -->
      <div v-for="node in agentNodes" :key="node._id" class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">{{ node.name }}</h2>
          <span :class="getStatusBadgeClass(node.status)">
            {{ node.status }}
          </span>
        </div>
        <div class="space-y-2">
          <p><span class="font-medium">Hostname:</span> {{ node.hostname }}</p>
          <p><span class="font-medium">OS:</span> {{ node.os }}</p>
          <p><span class="font-medium">CPU Cores:</span> {{ node.cpuCores }}</p>
          <p><span class="font-medium">Memory:</span> {{ formatBytes(node.metrics.memoryUsed) }} / {{ formatBytes(node.metrics.memoryTotal) }}</p>
          <p><span class="font-medium">CPU Usage:</span> {{ node.metrics.cpuUsage.toFixed(1) }}%</p>
          <p><span class="font-medium">Disk Usage:</span> {{ node.metrics.diskUsage.toFixed(1) }}%</p>
          <p><span class="font-medium">Last Seen:</span> {{ formatTime(node.lastSeen) }}</p>
        </div>
        <div class="mt-4">
          <router-link 
            :to="{ name: 'node-detail', params: { id: node._id }}"
            class="text-blue-600 hover:text-blue-800"
          >
            View Details →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

const masterNode = ref(null);
const agentNodes = ref([]);
let pollInterval;

const fetchNodes = async () => {
  try {
    const response = await axios.get('/api/nodes');
    const nodes = response.data.nodes;
    
    // Separate master and agent nodes
    masterNode.value = nodes.find(node => node.name === 'Master');
    agentNodes.value = nodes.filter(node => node.name !== 'Master');
  } catch (error) {
    console.error('Failed to fetch nodes:', error);
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

onMounted(() => {
  fetchNodes();
  // Poll for updates every 5 seconds
  pollInterval = setInterval(fetchNodes, 5000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script> 