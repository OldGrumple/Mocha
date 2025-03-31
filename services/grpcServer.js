const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, '../proto/agent.proto'),
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);

// Create the server
const server = new grpc.Server();

// Implement the service methods
const agentService = {
    ProvisionServer: (call, callback) => {
        console.log('ProvisionServer called with:', call.request);
        // TODO: Implement actual server provisioning
        callback(null, {
            instanceId: `server-${Date.now()}`,
            message: 'Server provisioned successfully'
        });
    },

    StartServer: (call, callback) => {
        console.log('StartServer called with:', call.request);
        // TODO: Implement actual server start
        callback(null, {
            message: 'Server started successfully'
        });
    },

    StopServer: (call, callback) => {
        console.log('StopServer called with:', call.request);
        // TODO: Implement actual server stop
        callback(null, {
            message: 'Server stopped successfully'
        });
    },

    DeleteServer: (call, callback) => {
        console.log('DeleteServer called with:', call.request);
        // TODO: Implement actual server deletion
        callback(null, {
            message: 'Server deleted successfully'
        });
    },

    UpdatePlugins: (call, callback) => {
        console.log('UpdatePlugins called with:', call.request);
        // TODO: Implement actual plugin update
        callback(null, {
            message: 'Plugins updated successfully'
        });
    },

    GetServerStatus: (call, callback) => {
        console.log('GetServerStatus called with:', call.request);
        // TODO: Implement actual status check
        callback(null, {
            instanceId: call.request.instanceId,
            status: 'running',
            message: 'Server is running'
        });
    }
};

// Add the service to the server
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
server.addService(protoDescriptor.agent.AgentService.service, agentService);

// Start the server
const port = process.env.GRPC_PORT || 50051;
server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Failed to bind server:', err);
            return;
        }
        server.start();
        console.log(`gRPC server running on port ${port}`);
    }
); 