// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var agent_pb = require('./agent_pb.js');

function serialize_agent_HeartbeatRequest(arg) {
  if (!(arg instanceof agent_pb.HeartbeatRequest)) {
    throw new Error('Expected argument of type agent.HeartbeatRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_HeartbeatRequest(buffer_arg) {
  return agent_pb.HeartbeatRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_HeartbeatResponse(arg) {
  if (!(arg instanceof agent_pb.HeartbeatResponse)) {
    throw new Error('Expected argument of type agent.HeartbeatResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_HeartbeatResponse(buffer_arg) {
  return agent_pb.HeartbeatResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ProvisionRequest(arg) {
  if (!(arg instanceof agent_pb.ProvisionRequest)) {
    throw new Error('Expected argument of type agent.ProvisionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ProvisionRequest(buffer_arg) {
  return agent_pb.ProvisionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ProvisionResponse(arg) {
  if (!(arg instanceof agent_pb.ProvisionResponse)) {
    throw new Error('Expected argument of type agent.ProvisionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ProvisionResponse(buffer_arg) {
  return agent_pb.ProvisionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_RegisterNodeRequest(arg) {
  if (!(arg instanceof agent_pb.RegisterNodeRequest)) {
    throw new Error('Expected argument of type agent.RegisterNodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_RegisterNodeRequest(buffer_arg) {
  return agent_pb.RegisterNodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_RegisterNodeResponse(arg) {
  if (!(arg instanceof agent_pb.RegisterNodeResponse)) {
    throw new Error('Expected argument of type agent.RegisterNodeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_RegisterNodeResponse(buffer_arg) {
  return agent_pb.RegisterNodeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerActionRequest(arg) {
  if (!(arg instanceof agent_pb.ServerActionRequest)) {
    throw new Error('Expected argument of type agent.ServerActionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerActionRequest(buffer_arg) {
  return agent_pb.ServerActionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerActionResponse(arg) {
  if (!(arg instanceof agent_pb.ServerActionResponse)) {
    throw new Error('Expected argument of type agent.ServerActionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerActionResponse(buffer_arg) {
  return agent_pb.ServerActionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerOperationRequest(arg) {
  if (!(arg instanceof agent_pb.ServerOperationRequest)) {
    throw new Error('Expected argument of type agent.ServerOperationRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerOperationRequest(buffer_arg) {
  return agent_pb.ServerOperationRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerOperationResponse(arg) {
  if (!(arg instanceof agent_pb.ServerOperationResponse)) {
    throw new Error('Expected argument of type agent.ServerOperationResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerOperationResponse(buffer_arg) {
  return agent_pb.ServerOperationResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerStatusResponse(arg) {
  if (!(arg instanceof agent_pb.ServerStatusResponse)) {
    throw new Error('Expected argument of type agent.ServerStatusResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerStatusResponse(buffer_arg) {
  return agent_pb.ServerStatusResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_UpdatePluginsRequest(arg) {
  if (!(arg instanceof agent_pb.UpdatePluginsRequest)) {
    throw new Error('Expected argument of type agent.UpdatePluginsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_UpdatePluginsRequest(buffer_arg) {
  return agent_pb.UpdatePluginsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_UpdatePluginsResponse(arg) {
  if (!(arg instanceof agent_pb.UpdatePluginsResponse)) {
    throw new Error('Expected argument of type agent.UpdatePluginsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_UpdatePluginsResponse(buffer_arg) {
  return agent_pb.UpdatePluginsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// The agent service definition
var AgentServiceService = exports.AgentServiceService = {
  // Register a new node
registerNode: {
    path: '/agent.AgentService/RegisterNode',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.RegisterNodeRequest,
    responseType: agent_pb.RegisterNodeResponse,
    requestSerialize: serialize_agent_RegisterNodeRequest,
    requestDeserialize: deserialize_agent_RegisterNodeRequest,
    responseSerialize: serialize_agent_RegisterNodeResponse,
    responseDeserialize: deserialize_agent_RegisterNodeResponse,
  },
  // Send heartbeat
heartbeat: {
    path: '/agent.AgentService/Heartbeat',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.HeartbeatRequest,
    responseType: agent_pb.HeartbeatResponse,
    requestSerialize: serialize_agent_HeartbeatRequest,
    requestDeserialize: deserialize_agent_HeartbeatRequest,
    responseSerialize: serialize_agent_HeartbeatResponse,
    responseDeserialize: deserialize_agent_HeartbeatResponse,
  },
  // Start a server
startServer: {
    path: '/agent.AgentService/StartServer',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ServerOperationRequest,
    responseType: agent_pb.ServerOperationResponse,
    requestSerialize: serialize_agent_ServerOperationRequest,
    requestDeserialize: deserialize_agent_ServerOperationRequest,
    responseSerialize: serialize_agent_ServerOperationResponse,
    responseDeserialize: deserialize_agent_ServerOperationResponse,
  },
  // Stop a server
stopServer: {
    path: '/agent.AgentService/StopServer',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ServerOperationRequest,
    responseType: agent_pb.ServerOperationResponse,
    requestSerialize: serialize_agent_ServerOperationRequest,
    requestDeserialize: deserialize_agent_ServerOperationRequest,
    responseSerialize: serialize_agent_ServerOperationResponse,
    responseDeserialize: deserialize_agent_ServerOperationResponse,
  },
  // Delete a server
deleteServer: {
    path: '/agent.AgentService/DeleteServer',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ServerOperationRequest,
    responseType: agent_pb.ServerOperationResponse,
    requestSerialize: serialize_agent_ServerOperationRequest,
    requestDeserialize: deserialize_agent_ServerOperationRequest,
    responseSerialize: serialize_agent_ServerOperationResponse,
    responseDeserialize: deserialize_agent_ServerOperationResponse,
  },
  // Provision a server
provisionServer: {
    path: '/agent.AgentService/ProvisionServer',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ProvisionRequest,
    responseType: agent_pb.ProvisionResponse,
    requestSerialize: serialize_agent_ProvisionRequest,
    requestDeserialize: deserialize_agent_ProvisionRequest,
    responseSerialize: serialize_agent_ProvisionResponse,
    responseDeserialize: deserialize_agent_ProvisionResponse,
  },
  // Execute server action
executeServerAction: {
    path: '/agent.AgentService/ExecuteServerAction',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ServerActionRequest,
    responseType: agent_pb.ServerActionResponse,
    requestSerialize: serialize_agent_ServerActionRequest,
    requestDeserialize: deserialize_agent_ServerActionRequest,
    responseSerialize: serialize_agent_ServerActionResponse,
    responseDeserialize: deserialize_agent_ServerActionResponse,
  },
  // Update server plugins
updateServerPlugins: {
    path: '/agent.AgentService/UpdateServerPlugins',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.UpdatePluginsRequest,
    responseType: agent_pb.UpdatePluginsResponse,
    requestSerialize: serialize_agent_UpdatePluginsRequest,
    requestDeserialize: deserialize_agent_UpdatePluginsRequest,
    responseSerialize: serialize_agent_UpdatePluginsResponse,
    responseDeserialize: deserialize_agent_UpdatePluginsResponse,
  },
  // Get server status
getServerStatus: {
    path: '/agent.AgentService/GetServerStatus',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.ServerOperationRequest,
    responseType: agent_pb.ServerStatusResponse,
    requestSerialize: serialize_agent_ServerOperationRequest,
    requestDeserialize: deserialize_agent_ServerOperationRequest,
    responseSerialize: serialize_agent_ServerStatusResponse,
    responseDeserialize: deserialize_agent_ServerStatusResponse,
  },
};

exports.AgentServiceClient = grpc.makeGenericClientConstructor(AgentServiceService, 'AgentService');
