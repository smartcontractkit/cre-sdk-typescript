import { v4 as uuidv4 } from 'uuid'
import { privateKeyToAccount } from 'viem/accounts'
import stringify from 'json-stable-stringify'
import { createJWT, type JSONRPCRequest } from './create-jwt'
import { getConfig } from './get-config'
import type { TriggerInput, WorkflowSelector } from './schemas'

export async function triggerWorkflow(workflowSelector: WorkflowSelector, payload: TriggerInput) {
	const config = getConfig()

	// Create JSON-RPC request
	const requestID = uuidv4()
	const jsonrpcRequest: JSONRPCRequest = {
		jsonrpc: '2.0',
		id: requestID,
		method: `workflows.execute`,
		params: {
			input: payload.input,
			workflow: workflowSelector,
		},
	}

	console.log('🚀 Triggering workflow...')
	console.log('   Workflow:', workflowSelector)
	console.log('   Input:', JSON.stringify(payload.input, null, 2))

	// Create and sign JWT
	const jwt = await createJWT(jsonrpcRequest, config.privateKey)
	const account = privateKeyToAccount(config.privateKey)
	console.log('   Signed by:', account.address)

	// Send HTTP request
	const response = await fetch(config.gatewayURL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${jwt}`,
		},
		body: stringify(jsonrpcRequest),
	})

	console.log('   Response:', response)

	const result = await response.json()

	return result
}
