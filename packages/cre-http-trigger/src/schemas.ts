import { z } from 'zod'

// Schema for triggering by workflow ID
export const workflowIdSelectorSchema = z.object({
	workflowID: z.string().min(1, 'Workflow ID must be a non-empty string'),
})

// Schema for triggering by workflow details
export const workflowDetailsSelectorSchema = z.object({
	workflowOwner: z.string().min(1, 'Workflow owner must be a non-empty string'),
	workflowName: z.string().min(1, 'Workflow name must be a non-empty string'),
	workflowTag: z.string().min(1, 'Workflow tag must be a non-empty string'),
})

// Schema for selecting a workflow
export const workflowSelectorSchema = z.union([
	workflowIdSelectorSchema,
	workflowDetailsSelectorSchema,
])

// Schema for the input to the workflow - any json serializable data
export const triggerInputSchema = z.object({
	input: z.any(), // Can be any JSON-serializable data
})

export type WorkflowSelector = z.infer<typeof workflowSelectorSchema>
export type TriggerInput = z.infer<typeof triggerInputSchema>
