// otel.js – initialize OpenTelemetry for the React app

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

// Exporter sends traces to Grafana Alloy (OTLP over HTTP)
const traceExporter = new OTLPTraceExporter({
  url: import.meta.env.VITE_OTEL_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': 'sabhi-bank-frontend',
    'service.version': '0.1.0',
    'deployment.environment': 'development',
  }),
});

provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
provider.register();

console.log('OpenTelemetry for frontend initialized');
