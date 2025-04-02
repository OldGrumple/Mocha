# Mocha Minecraft Server Manager

A comprehensive Minecraft server management system that allows you to manage multiple Minecraft servers, nodes, and configurations through a modern web interface.

## Project Structure

```
mocha/
├── backend/                 # Backend API and services
│   ├── src/                # Source code
│   │   ├── api/           # API-specific code and middleware
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic and external services
│   │   ├── utils/         # Utility functions
│   │   ├── proto/         # gRPC protocol definitions
│   │   └── generated/     # Generated gRPC code
│   ├── config/            # Environment and configuration files
│   │   └── env/          # Environment-specific configurations
│   └── frontend/          # Frontend Vue.js application
├── config/                # Project-wide configuration
│   └── nginx/            # Nginx configuration files
├── ecosystem.config.js     # PM2 process management configuration
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Protocol Buffers compiler (protoc)
- gRPC tools
- PM2 (for production deployment)
- Nginx (for serving frontend)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd mocha
```

2. Install backend dependencies:
```bash
cd backend/src
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
   - Copy `config/env/.env.example` to `config/env/.env.development` for development
   - Copy `config/env/.env.example` to `config/env/.env.production` for production
   - Update the environment variables as needed

5. Generate gRPC code:
```bash
cd src
npm run generate:grpc
```

## Development

1. Start the backend API server:
```bash
cd backend/src
npm run dev
```

2. Start the gRPC server:
```bash
npm run dev:grpc
```

3. Start the frontend development server:
```bash
cd ../frontend
npm run serve
```

## Production Deployment

### 1. Build the Application

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../src
npm run build:prod
```

### 2. Configure Nginx

1. Install Nginx:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

2. Copy the Nginx configuration:
```bash
sudo cp config/nginx/mocha.conf /etc/nginx/conf.d/
```

3. Update the configuration:
   - Replace `/path/to/your/project/frontend/dist` with your actual frontend build path
   - Update `server_name` with your domain
   - Adjust ports if needed

4. Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Start Backend Services with PM2

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the services:
```bash
# Start in production mode
pm2 start ecosystem.config.js --env production
```

3. Save PM2 process list:
```bash
pm2 save
```

4. Set up PM2 to start on boot:
```bash
pm2 startup
```

## Environment Variables

Key environment variables:

- `API_HOST`: API server host (default: localhost)
- `API_PORT`: API server port (default: 3000)
- `GRPC_HOST`: gRPC server host (default: localhost)
- `GRPC_PORT`: gRPC server port (default: 50051)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation

## Features

- Multi-server management
- Real-time server monitoring
- Server configuration management
- Player management (whitelist, bans, ops)
- Node management for distributed server hosting
- gRPC-based agent communication
- Modern web interface

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License. 