import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from "prom-client";

export const prometheusRegister = new Registry();

collectDefaultMetrics({ register: prometheusRegister });

export const apiRequestsTotal = new Counter({
  name: "api_requests_total",
  help: "Total API requests",
  labelNames: ["method", "endpoint", "status"],
});

export const apiRequestDuration = new Histogram({
  name: "api_request_duration_seconds",
  help: "API request duration",
  labelNames: ["method", "endpoint", "status"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

prometheusRegister.registerMetric(apiRequestsTotal);
prometheusRegister.registerMetric(apiRequestDuration);
