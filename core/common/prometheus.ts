import { collectDefaultMetrics, Registry } from "prom-client";

export const prometheusRegister = new Registry();

collectDefaultMetrics({ register: prometheusRegister });
