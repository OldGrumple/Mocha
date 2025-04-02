<template>
  <div class="bg-white shadow rounded-lg">
    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="currentTab = tab.name"
          :class="[
            currentTab === tab.name
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="p-6">
      <NodeApiKeyManager
        v-if="currentTab === 'api-key'"
        :nodeId="nodeId"
      />
      <NodeCertificateManager
        v-if="currentTab === 'certificates'"
        :nodeId="nodeId"
      />
    </div>
  </div>
</template>

<script>
import NodeApiKeyManager from './NodeApiKeyManager.vue';
import NodeCertificateManager from './NodeCertificateManager.vue';

export default {
  name: 'NodeSecurityManager',
  components: {
    NodeApiKeyManager,
    NodeCertificateManager
  },
  props: {
    nodeId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      currentTab: 'api-key',
      tabs: [
        { name: 'api-key', label: 'API Key' },
        { name: 'certificates', label: 'Certificates' }
      ]
    };
  }
};
</script> 