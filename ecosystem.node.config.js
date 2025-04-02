module.exports = {
  apps: [
    {
      name: 'mocha-node',
      script: 'scripts/runNode.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      env_file: 'config/env/node.env'
    }
  ]
}; 