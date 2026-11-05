// Subset of the CapabilitiesRegistry ABI needed to read a DON's signers.
// Kept `as const` so viem's decoded results are fully typed.
export const capabilitiesRegistryAbi = [
	{
		type: 'function',
		name: 'getDON',
		stateMutability: 'view',
		inputs: [{ name: 'donId', type: 'uint32', internalType: 'uint32' }],
		outputs: [
			{
				name: '',
				type: 'tuple',
				internalType: 'struct CapabilitiesRegistry.DONInfo',
				components: [
					{ name: 'id', type: 'uint32', internalType: 'uint32' },
					{ name: 'configCount', type: 'uint32', internalType: 'uint32' },
					{ name: 'f', type: 'uint8', internalType: 'uint8' },
					{ name: 'isPublic', type: 'bool', internalType: 'bool' },
					{ name: 'acceptsWorkflows', type: 'bool', internalType: 'bool' },
					{ name: 'nodeP2PIds', type: 'bytes32[]', internalType: 'bytes32[]' },
					{ name: 'donFamilies', type: 'string[]', internalType: 'string[]' },
					{ name: 'name', type: 'string', internalType: 'string' },
					{ name: 'config', type: 'bytes', internalType: 'bytes' },
					{
						name: 'capabilityConfigurations',
						type: 'tuple[]',
						internalType: 'struct CapabilitiesRegistry.CapabilityConfiguration[]',
						components: [
							{ name: 'capabilityId', type: 'string', internalType: 'string' },
							{ name: 'config', type: 'bytes', internalType: 'bytes' },
						],
					},
				],
			},
		],
	},
	{
		type: 'function',
		name: 'getNodesByP2PIds',
		stateMutability: 'view',
		inputs: [{ name: 'p2pIds', type: 'bytes32[]', internalType: 'bytes32[]' }],
		outputs: [
			{
				name: '',
				type: 'tuple[]',
				internalType: 'struct INodeInfoProvider.NodeInfo[]',
				components: [
					{ name: 'nodeOperatorId', type: 'uint32', internalType: 'uint32' },
					{ name: 'configCount', type: 'uint32', internalType: 'uint32' },
					{ name: 'workflowDONId', type: 'uint32', internalType: 'uint32' },
					{ name: 'signer', type: 'bytes32', internalType: 'bytes32' },
					{ name: 'p2pId', type: 'bytes32', internalType: 'bytes32' },
					{ name: 'encryptionPublicKey', type: 'bytes32', internalType: 'bytes32' },
					{ name: 'csaKey', type: 'bytes32', internalType: 'bytes32' },
					{ name: 'capabilityIds', type: 'string[]', internalType: 'string[]' },
					{ name: 'capabilitiesDONIds', type: 'uint256[]', internalType: 'uint256[]' },
				],
			},
		],
	},
] as const
