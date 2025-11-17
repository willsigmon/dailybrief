/**
 * Application metrics collection for monitoring
 */

import { logger } from './logger';

interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private readonly maxMetricsPerType = 1000; // Keep last 1000 metrics per type

  /**
   * Record a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.recordMetric({
      name: `counter_${name}`,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name: `gauge_${name}`,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name: `histogram_${name}`,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only last N metrics
    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    // Log metric for now (in production, would send to Prometheus/DataDog/etc)
    logger.debug('Metric recorded', metric);
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [name, metrics] of this.metrics.entries()) {
      // Group by labels
      const byLabels = new Map<string, Metric[]>();

      for (const metric of metrics) {
        const labelStr = metric.labels
          ? Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';
        const key = labelStr;

        if (!byLabels.has(key)) {
          byLabels.set(key, []);
        }
        byLabels.get(key)!.push(metric);
      }

      // Output metrics
      for (const [labelStr, labelMetrics] of byLabels.entries()) {
        const latest = labelMetrics[labelMetrics.length - 1];
        const labels = labelStr ? `{${labelStr}}` : '';
        lines.push(`${name}${labels} ${latest.value}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get summary statistics
   */
  getSummary(): Record<string, { count: number; latest: number; avg?: number }> {
    const summary: Record<string, { count: number; latest: number; avg?: number }> = {};

    for (const [name, metrics] of this.metrics.entries()) {
      const latest = metrics[metrics.length - 1];
      const sum = metrics.reduce((acc, m) => acc + m.value, 0);
      const avg = metrics.length > 0 ? sum / metrics.length : undefined;

      summary[name] = {
        count: metrics.length,
        latest: latest?.value || 0,
        avg,
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const metrics = new MetricsCollector();

// Track briefing generation metrics
export function trackBriefingGeneration(success: boolean, durationMs: number): void {
  metrics.incrementCounter('briefing_generation_total', { status: success ? 'success' : 'failure' });
  metrics.recordHistogram('briefing_generation_duration_ms', durationMs);
}

// Track LLM API calls
export function trackLLMCall(model: string, success: boolean, durationMs: number): void {
  metrics.incrementCounter('llm_calls_total', { model, status: success ? 'success' : 'failure' });
  metrics.recordHistogram('llm_call_duration_ms', durationMs, { model });
}

// Track MCP calls
export function trackMCPCall(service: string, success: boolean): void {
  metrics.incrementCounter('mcp_calls_total', { service, status: success ? 'success' : 'failure' });
}

// Track database operations
export function trackDatabaseOperation(operation: string, durationMs: number): void {
  metrics.recordHistogram('database_operation_duration_ms', durationMs, { operation });
}

// Track cache operations
export function trackCacheOperation(hit: boolean, cacheType: string): void {
  metrics.incrementCounter('cache_operations_total', { type: cacheType, result: hit ? 'hit' : 'miss' });
}
