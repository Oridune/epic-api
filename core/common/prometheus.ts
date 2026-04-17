import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

export const prometheusRegister = new Registry();

collectDefaultMetrics({ register: prometheusRegister });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total API requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "API request duration",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

export const httpRequestInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Number of in-flight HTTP requests",
});

export const httpRequestSizeBytes = new Histogram({
  name: "http_request_size_bytes",
  help: "HTTP request size in bytes",
  labelNames: ["method", "route"],
  buckets: [
    100,
    500,
    1_000,
    5_000,
    10_000,
    50_000,
    100_000,
    500_000,
    1_000_000,
  ],
});

export const httpResponseSizeBytes = new Histogram({
  name: "http_response_size_bytes",
  help: "HTTP response size in bytes",
  labelNames: ["method", "route", "status"],
  buckets: [
    100,
    500,
    1_000,
    5_000,
    10_000,
    50_000,
    100_000,
    500_000,
    1_000_000,
  ],
});

prometheusRegister.registerMetric(httpRequestsTotal);
prometheusRegister.registerMetric(httpRequestDuration);
prometheusRegister.registerMetric(httpRequestInFlight);
prometheusRegister.registerMetric(httpRequestSizeBytes);
prometheusRegister.registerMetric(httpResponseSizeBytes);
