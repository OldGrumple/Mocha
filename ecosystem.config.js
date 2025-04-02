module.exports = {
  apps: [
    {
      name: 'mocha-api',
      script: './src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'mocha-grpc',
      script: './src/services/grpcServer.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'mocha-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 8080',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PM2_SERVE_PATH: './frontend/dist',
        PM2_SERVE_PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PM2_SERVE_PATH: './frontend/dist',
        PM2_SERVE_PORT: 8080
      }
    }
  ]
}; 