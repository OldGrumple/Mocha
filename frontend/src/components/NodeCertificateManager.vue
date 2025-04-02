<template>
  <div class="bg-white shadow rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium text-gray-900">Certificate Management</h3>
      <button
        @click="regenerateCertificates"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Regenerate Certificates
      </button>
    </div>

    <div v-if="certificates" class="mt-4 space-y-4">
      <!-- Public Key -->
      <div class="bg-gray-50 p-4 rounded-md">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-500">Public Key</p>
            <div class="mt-1 flex items-center">
              <input
                type="password"
                :value="certificates.publicKey"
                readonly
                class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                @click="copyPublicKey"
                class="ml-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  class="h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Generated at: {{ new Date(certificates.generatedAt).toLocaleString() }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="mt-4">
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">{{ error }}</span>
      </div>
    </div>

    <div v-if="success" class="mt-4">
      <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">{{ success }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'NodeCertificateManager',
  props: {
    nodeId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      certificates: null,
      error: null,
      success: null
    };
  },
  methods: {
    async regenerateCertificates() {
      try {
        this.error = null;
        this.success = null;
        
        const response = await axios.post(`/api/nodes/${this.nodeId}/regenerate-certificates`);
        this.certificates = response.data;
        this.success = 'Certificates regenerated successfully';
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to regenerate certificates';
      }
    },
    copyPublicKey() {
      navigator.clipboard.writeText(this.certificates.publicKey)
        .then(() => {
          this.success = 'Public key copied to clipboard';
          setTimeout(() => {
            this.success = null;
          }, 2000);
        })
        .catch(() => {
          this.error = 'Failed to copy public key';
        });
    }
  }
};
</script> 