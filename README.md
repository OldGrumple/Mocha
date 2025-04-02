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
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Protocol Buffers compiler (protoc)
- gRPC tools

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

## Production Build

1. Build the entire project:
```bash
cd backend/src
npm run build:prod
```

2. Start the production servers:
```bash
# Start API server
npm start

# Start gRPC server
npm run grpc
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