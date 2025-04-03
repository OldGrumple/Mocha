const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

// Create the trace exporter
const traceExporter = new OTLPTraceExporter();

// Create the SDK
const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize OpenTelemetry
async function initializeTracing() {
  try {
    await sdk.start();
    console.log('OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK:', error);
  }
});

// Initialize tracing
initializeTracing();

module.exports = sdk;