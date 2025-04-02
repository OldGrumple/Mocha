// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var proto_agent_pb = require('../proto/agent_pb.js');

function serialize_agent_HeartbeatRequest(arg) {
  if (!(arg instanceof proto_agent_pb.HeartbeatRequest)) {
    throw new Error('Expected argument of type agent.HeartbeatRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_HeartbeatRequest(buffer_arg) {
  return proto_agent_pb.HeartbeatRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_HeartbeatResponse(arg) {
  if (!(arg instanceof proto_agent_pb.HeartbeatResponse)) {
    throw new Error('Expected argument of type agent.HeartbeatResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_HeartbeatResponse(buffer_arg) {
  return proto_agent_pb.HeartbeatResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_InstallJavaRequest(arg) {
  if (!(arg instanceof proto_agent_pb.InstallJavaRequest)) {
    throw new Error('Expected argument of type agent.InstallJavaRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_InstallJavaRequest(buffer_arg) {
  return proto_agent_pb.InstallJavaRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_InstallJavaResponse(arg) {
  if (!(arg instanceof proto_agent_pb.InstallJavaResponse)) {
    throw new Error('Expected argument of type agent.InstallJavaResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_InstallJavaResponse(buffer_arg) {
  return proto_agent_pb.InstallJavaResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_MetricsRequest(arg) {
  if (!(arg instanceof proto_agent_pb.MetricsRequest)) {
    throw new Error('Expected argument of type agent.MetricsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_MetricsRequest(buffer_arg) {
  return proto_agent_pb.MetricsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_MetricsResponse(arg) {
  if (!(arg instanceof proto_agent_pb.MetricsResponse)) {
    throw new Error('Expected argument of type agent.MetricsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_MetricsResponse(buffer_arg) {
  return proto_agent_pb.MetricsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ProvisionRequest(arg) {
  if (!(arg instanceof proto_agent_pb.ProvisionRequest)) {
    throw new Error('Expected argument of type agent.ProvisionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ProvisionRequest(buffer_arg) {
  return proto_agent_pb.ProvisionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ProvisionResponse(arg) {
  if (!(arg instanceof proto_agent_pb.ProvisionResponse)) {
    throw new Error('Expected argument of type agent.ProvisionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ProvisionResponse(buffer_arg) {
  return proto_agent_pb.ProvisionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_RegisterNodeRequest(arg) {
  if (!(arg instanceof proto_agent_pb.RegisterNodeRequest)) {
    throw new Error('Expected argument of type agent.RegisterNodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_RegisterNodeRequest(buffer_arg) {
  return proto_agent_pb.RegisterNodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_RegisterNodeResponse(arg) {
  if (!(arg instanceof proto_agent_pb.RegisterNodeResponse)) {
    throw new Error('Expected argument of type agent.RegisterNodeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_RegisterNodeResponse(buffer_arg) {
  return proto_agent_pb.RegisterNodeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerActionRequest(arg) {
  if (!(arg instanceof proto_agent_pb.ServerActionRequest)) {
    throw new Error('Expected argument of type agent.ServerActionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerActionRequest(buffer_arg) {
  return proto_agent_pb.ServerActionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerActionResponse(arg) {
  if (!(arg instanceof proto_agent_pb.ServerActionResponse)) {
    throw new Error('Expected argument of type agent.ServerActionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerActionResponse(buffer_arg) {
  return proto_agent_pb.ServerActionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_ServerStatusResponse(arg) {
  if (!(arg instanceof proto_agent_pb.ServerStatusResponse)) {
    throw new Error('Expected argument of type agent.ServerStatusResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_ServerStatusResponse(buffer_arg) {
  return proto_agent_pb.ServerStatusResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_UpdatePluginsRequest(arg) {
  if (!(arg instanceof proto_agent_pb.UpdatePluginsRequest)) {
    throw new Error('Expected argument of type agent.UpdatePluginsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_UpdatePluginsRequest(buffer_arg) {
  return proto_agent_pb.UpdatePluginsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agent_UpdatePluginsResponse(arg) {
  if (!(arg instanceof proto_agent_pb.UpdatePluginsResponse)) {
    throw new Error('Expected argument of type agent.UpdatePluginsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agent_UpdatePluginsResponse(buffer_arg) {
  return proto_agent_pb.UpdatePluginsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var AgentServiceService = exports.AgentServiceService = {
  registerNode: {
    path: '/agent.AgentService/RegisterNode',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.RegisterNodeRequest,
    responseType: proto_agent_pb.RegisterNodeResponse,
    requestSerialize: serialize_agent_RegisterNodeRequest,
    requestDeserialize: deserialize_agent_RegisterNodeRequest,
    responseSerialize: serialize_agent_RegisterNodeResponse,
    responseDeserialize: deserialize_agent_RegisterNodeResponse,
  },
  provisionServer: {
    path: '/agent.AgentService/ProvisionServer',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.ProvisionRequest,
    responseType: proto_agent_pb.ProvisionResponse,
    requestSerialize: serialize_agent_ProvisionRequest,
    requestDeserialize: deserialize_agent_ProvisionRequest,
    responseSerialize: serialize_agent_ProvisionResponse,
    responseDeserialize: deserialize_agent_ProvisionResponse,
  },
  startServer: {
    path: '/agent.AgentService/StartServer',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.ServerActionRequest,
    responseType: proto_agent_pb.ServerActionResponse,
    requestSerialize: serialize_agent_ServerActionRequest,
    requestDeserialize: deserialize_agent_ServerActionRequest,
    responseSerialize: serialize_agent_ServerActionResponse,
    responseDeserialize: deserialize_agent_ServerActionResponse,
  },
  stopServer: {
    path: '/agent.AgentService/StopServer',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.ServerActionRequest,
    responseType: proto_agent_pb.ServerActionResponse,
    requestSerialize: serialize_agent_ServerActionRequest,
    requestDeserialize: deserialize_agent_ServerActionRequest,
    responseSerialize: serialize_agent_ServerActionResponse,
    responseDeserialize: deserialize_agent_ServerActionResponse,
  },
  deleteServer: {
    path: '/agent.AgentService/DeleteServer',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.ServerActionRequest,
    responseType: proto_agent_pb.ServerActionResponse,
    requestSerialize: serialize_agent_ServerActionRequest,
    requestDeserialize: deserialize_agent_ServerActionRequest,
    responseSerialize: serialize_agent_ServerActionResponse,
    responseDeserialize: deserialize_agent_ServerActionResponse,
  },
  updatePlugins: {
    path: '/agent.AgentService/UpdatePlugins',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.UpdatePluginsRequest,
    responseType: proto_agent_pb.UpdatePluginsResponse,
    requestSerialize: serialize_agent_UpdatePluginsRequest,
    requestDeserialize: deserialize_agent_UpdatePluginsRequest,
    responseSerialize: serialize_agent_UpdatePluginsResponse,
    responseDeserialize: deserialize_agent_UpdatePluginsResponse,
  },
  getServerStatus: {
    path: '/agent.AgentService/GetServerStatus',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.ServerActionRequest,
    responseType: proto_agent_pb.ServerStatusResponse,
    requestSerialize: serialize_agent_ServerActionRequest,
    requestDeserialize: deserialize_agent_ServerActionRequest,
    responseSerialize: serialize_agent_ServerStatusResponse,
    responseDeserialize: deserialize_agent_ServerStatusResponse,
  },
  heartbeat: {
    path: '/agent.AgentService/Heartbeat',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.HeartbeatRequest,
    responseType: proto_agent_pb.HeartbeatResponse,
    requestSerialize: serialize_agent_HeartbeatRequest,
    requestDeserialize: deserialize_agent_HeartbeatRequest,
    responseSerialize: serialize_agent_HeartbeatResponse,
    responseDeserialize: deserialize_agent_HeartbeatResponse,
  },
  updateMetrics: {
    path: '/agent.AgentService/UpdateMetrics',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.MetricsRequest,
    responseType: proto_agent_pb.MetricsResponse,
    requestSerialize: serialize_agent_MetricsRequest,
    requestDeserialize: deserialize_agent_MetricsRequest,
    responseSerialize: serialize_agent_MetricsResponse,
    responseDeserialize: deserialize_agent_MetricsResponse,
  },
  installJava: {
    path: '/agent.AgentService/InstallJava',
    requestStream: false,
    responseStream: false,
    requestType: proto_agent_pb.InstallJavaRequest,
    responseType: proto_agent_pb.InstallJavaResponse,
    requestSerialize: serialize_agent_InstallJavaRequest,
    requestDeserialize: deserialize_agent_InstallJavaRequest,
    responseSerialize: serialize_agent_InstallJavaResponse,
    responseDeserialize: deserialize_agent_InstallJavaResponse,
  },
};

exports.AgentServiceClient = grpc.makeGenericClientConstructor(AgentServiceService, 'AgentService');
