import type { BaseRuntime } from './runtime'

/** Execution metadata supplied by the host for this invocation. */
export type WorkflowExecutionMetadata = {
	/** 32-byte lowercase hex without a 0x prefix. */
	readonly workflowID: string
	/** Host-generated execution ID; empty during subscription. */
	readonly executionID: string
	/** 20-byte lowercase hex without a 0x prefix. */
	readonly workflowOwner: string
	readonly donID: number
	/** Fault tolerance setting. Zero is valid. */
	readonly donF: number
}

/** Optional extension implemented by runtimes that expose execution metadata. */
export interface ExecutionMetadataProvider {
	executionMetadata(): WorkflowExecutionMetadata
}

export function executionMetadata<C>(runtime: BaseRuntime<C>): WorkflowExecutionMetadata {
	const provider = runtime as BaseRuntime<C> & Partial<ExecutionMetadataProvider>
	if (typeof provider.executionMetadata === 'function') {
		return { ...provider.executionMetadata() }
	}
	return { workflowID: '', executionID: '', workflowOwner: '', donID: 0, donF: 0 }
}
