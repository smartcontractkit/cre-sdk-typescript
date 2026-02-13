/**
 * In-memory log sink for tests. Captures messages so tests can assert on log output.
 * Equivalent to Go's cre/testutils/test_writer.go.
 */
export class TestWriter {
	private logs: string[] = []

	/** Appends a message to the captured log buffer. */
	log(message: string): void {
		this.logs.push(message)
	}

	/** Returns a copy of all captured log messages in order. */
	getLogs(): string[] {
		return [...this.logs]
	}

	/** Clears the captured log buffer. */
	clear(): void {
		this.logs = []
	}
}
