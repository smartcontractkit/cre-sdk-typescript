import { serve } from 'bun'
import { triggerInputSchema, workflowSelectorSchema } from './schemas'
import { triggerWorkflow } from './trigger-workflow'

const server = serve({
	port: 2000,
	routes: {
		// Health check endpoint
		'/health': new Response('OK'),

		// Single unified trigger endpoint
		'/trigger': {
			POST: async (req) => {
				try {
					// Parse query parameters from URL
					const url = new URL(req.url)
					const queryParams = Object.fromEntries(url.searchParams)

					// Validate query params as workflow selector
					const selectorValidation = workflowSelectorSchema.safeParse(queryParams)

					if (!selectorValidation.success) {
						const errors = selectorValidation.error.flatten()
						return Response.json(
							{
								error:
									"Invalid query parameters. Please provide either 'workflowID' OR all three of 'workflowOwner', 'workflowName', and 'workflowTag'",
								details: errors,
							},
							{ status: 400 },
						)
					}

					// Parse and validate POST body
					const body = await req.json()
					const inputValidation = triggerInputSchema.safeParse(body)

					if (!inputValidation.success) {
						const errors = inputValidation.error.flatten()
						return Response.json(
							{
								error: "Invalid body. Please provide an 'input' field",
								details: errors,
							},
							{ status: 400 },
						)
					}

					const response = await triggerWorkflow(selectorValidation.data, inputValidation.data)

					return Response.json({
						success: true,
						response,
					})
				} catch (error) {
					if (error instanceof SyntaxError) {
						return Response.json({ error: 'Invalid JSON payload' }, { status: 400 })
					}
					const errorMessage = error instanceof Error ? error.message : 'Unknown error'
					return Response.json({ error: errorMessage }, { status: 500 })
				}
			},
		},
	},

	// Fallback for unmatched routes
	fetch(req) {
		return Response.json(
			{
				error: 'Not Found',
				path: new URL(req.url).pathname,
				availableRoutes: [
					'GET /health',
					"POST /trigger?workflowID=<id> (with 'input' in body)",
					"POST /trigger?workflowOwner=<owner>&workflowName=<name>&workflowTag=<tag> (with 'input' in body)",
				],
			},
			{ status: 404 },
		)
	},
})

console.log(`🚀 HTTP Trigger Server running at http://localhost:${server.port}`)
console.log('\nAvailable routes:')
console.log('  GET  /health')
console.log("  POST /trigger?workflowID=<id> (with 'input' in body)")
console.log(
	"  POST /trigger?workflowOwner=<owner>&workflowName=<name>&workflowTag=<tag> (with 'input' in body)",
)
