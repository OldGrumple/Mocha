<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="statusClass"
  >
    {{ formatStatus }}
  </span>
</template>

<script>
export default {
  name: 'StatusBadge',
  
  props: {
    status: {
      type: String,
      required: true
    }
  },

  computed: {
    statusClass() {
      const classes = {
        'provisioning': 'bg-blue-100 text-blue-800',
        'provisioning_setup': 'bg-blue-100 text-blue-800',
        'provisioning_download': 'bg-blue-100 text-blue-800',
        'provisioning_config': 'bg-blue-100 text-blue-800',
        'provisioned': 'bg-green-100 text-green-800',
        'running': 'bg-green-100 text-green-800',
        'stopped': 'bg-yellow-100 text-yellow-800',
        'failed': 'bg-red-100 text-red-800',
        'jar_swap_in_progress': 'bg-purple-100 text-purple-800'
      };
      return classes[this.status] || 'bg-gray-100 text-gray-800';
    },

    formatStatus() {
      if (this.status.startsWith('provisioning_')) {
        return 'Provisioning';
      }
      if (this.status === 'jar_swap_in_progress') {
        return 'Swapping Jar';
      }
      return this.status.charAt(0).toUpperCase() + this.status.slice(1);
    }
  }
};
</script> 