/**
 * Circuit breaker pattern for external API calls
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening circuit
  resetTimeoutMs?: number; // Time before attempting to close circuit
  halfOpenMaxCalls?: number; // Max calls in half-open state before closing
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenMaxCalls: 3,
};

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit is open, failing fast
  HALF_OPEN = 'half-open', // Testing if service recovered
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  successCount: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Update circuit state based on time and thresholds
   */
  private updateState(): void {
    const now = Date.now();

    if (this.state.state === CircuitState.OPEN) {
      // Check if reset timeout has passed
      if (
        this.state.lastFailureTime &&
        now - this.state.lastFailureTime >= this.options.resetTimeoutMs
      ) {
        this.state.state = CircuitState.HALF_OPEN;
        this.state.successCount = 0;
      }
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.successCount++;
      if (this.state.successCount >= this.options.halfOpenMaxCalls) {
        // Circuit recovered, close it
        this.state.state = CircuitState.CLOSED;
        this.state.failureCount = 0;
        this.state.lastFailureTime = null;
      }
    } else {
      // Reset failure count on success
      this.state.failureCount = 0;
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, open circuit again
      this.state.state = CircuitState.OPEN;
      this.state.successCount = 0;
    } else if (this.state.failureCount >= this.options.failureThreshold) {
      // Too many failures, open circuit
      this.state.state = CircuitState.OPEN;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
    };
  }
}

// Create circuit breakers for different services
export const llmCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000,
});

export const mcpCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});
