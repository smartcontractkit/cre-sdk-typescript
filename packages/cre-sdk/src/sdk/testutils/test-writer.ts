import { fromBinary } from '@bufbuild/protobuf'
import {
	type WorkflowUserMetric,
	WorkflowUserMetricSchema,
} from '@cre/generated/workflows/v2/workflow_user_metric_pb'

/**
 * In-memory log sink for tests. Captures messages so tests can assert on log output.
 * Equivalent to Go's cre/testutils/test_writer.go.
 */
export class TestWriter {
	private logs: string[] = []
	private metrics: Uint8Array[] = []

	/** Appends a message to the captured log buffer. */
	log(message: string): void {
		this.logs.push(message)
	}

	/** Returns a copy of all captured log messages in order. */
	getLogs(): string[] {
		return [...this.logs]
	}

	/** Captures a serialized WorkflowUserMetric payload. */
	emitMetric(payload: Uint8Array): void {
		this.metrics.push(payload)
	}

	/** Returns captured metric payloads decoded as `WorkflowUserMetric` protos. */
	getMetrics(): WorkflowUserMetric[] {
		return this.metrics.map((bytes) => fromBinary(WorkflowUserMetricSchema, bytes))
	}

	/** Clears captured logs and metrics. */
	clear(): void {
		this.logs = []
		this.metrics = []
	}
}
