export type Environment = {
	chainSelector: bigint
	registryAddress: string
}

export type Zone = {
	environment: Environment
	donID: number
}

export function productionEnvironment(): Environment {
	return {
		chainSelector: 5009297550715157269n,
		registryAddress: '0x76c9cf548b4179F8901cda1f8623568b58215E62',
	}
}

export function zoneFromEnvironment(environment: Environment, donID: number): Zone {
	return { environment, donID }
}
