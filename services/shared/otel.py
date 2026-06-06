import os
import logging
from fastapi import FastAPI
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanProcessor, OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Get endpoints
OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://alloy:4317")

def setup_otel(service_name: str, app: FastAPI = None):
    # Resource attributes
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "environment": "production"
    })

    # Tracer Setup
    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)
    
    # Trace exporter
    span_exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT, insecure=True)
    span_processor = BatchSpanProcessor(span_exporter)
    tracer_provider.add_span_processor(span_processor)

    # Meter Setup
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=OTLP_ENDPOINT, insecure=True)
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Logging interceptor to format logs with trace_id and span_id
    setup_logging(service_name)

    # FastAPI instrumentation
    if app:
        FastAPIInstrumentor.instrument_app(app)
        
    return trace.get_tracer(service_name)

class TraceIDFilter(logging.Filter):
    def filter(self, record):
        current_span = trace.get_current_span()
        if current_span and current_span.get_span_context().is_valid:
            ctx = current_span.get_span_context()
            record.trace_id = format(ctx.trace_id, "032x")
            record.span_id = format(ctx.span_id, "016x")
        else:
            record.trace_id = "0" * 32
            record.span_id = "0" * 16
        return True

def setup_logging(service_name: str):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup is called multiple times
    if not any(isinstance(f, TraceIDFilter) for h in logger.handlers for f in h.filters):
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(name)s [trace_id=%(trace_id)s span_id=%(span_id)s]: %(message)s'
        )
        handler.setFormatter(formatter)
        handler.addFilter(TraceIDFilter())
        logger.addHandler(handler)
