export const STORAGE_ABI = [
	{
		inputs: [],
		name: 'get',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const

export const CALCULATOR_CONSUMER_ABI = [
	{ inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
	{
		inputs: [
			{ internalType: 'address', name: 'received', type: 'address' },
			{ internalType: 'address', name: 'expected', type: 'address' },
		],
		name: 'InvalidAuthor',
		type: 'error',
	},
	{
		inputs: [
			{ internalType: 'bytes10', name: 'received', type: 'bytes10' },
			{ internalType: 'bytes10', name: 'expected', type: 'bytes10' },
		],
		name: 'InvalidWorkflowName',
		type: 'error',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'uint256',
				name: 'resultId',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'finalResult',
				type: 'uint256',
			},
		],
		name: 'ResultUpdated',
		type: 'event',
	},
	{
		inputs: [],
		name: 'EXPECTED_AUTHOR',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'EXPECTED_WORKFLOW_NAME',
		outputs: [{ internalType: 'bytes10', name: '', type: 'bytes10' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'offchainValue', type: 'uint256' },
					{ internalType: 'int256', name: 'onchainValue', type: 'int256' },
					{ internalType: 'uint256', name: 'finalResult', type: 'uint256' },
				],
				internalType: 'struct CalculatorConsumer.CalculatorResult',
				name: '_prospectiveResult',
				type: 'tuple',
			},
		],
		name: 'isResultAnomalous',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'latestResult',
		outputs: [
			{ internalType: 'uint256', name: 'offchainValue', type: 'uint256' },
			{ internalType: 'int256', name: 'onchainValue', type: 'int256' },
			{ internalType: 'uint256', name: 'finalResult', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'bytes', name: '', type: 'bytes' },
			{ internalType: 'bytes', name: 'report', type: 'bytes' },
		],
		name: 'onReport',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'resultCount',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		name: 'results',
		outputs: [
			{ internalType: 'uint256', name: 'offchainValue', type: 'uint256' },
			{ internalType: 'int256', name: 'onchainValue', type: 'int256' },
			{ internalType: 'uint256', name: 'finalResult', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
		name: 'supportsInterface',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'pure',
		type: 'function',
	},
] as const
