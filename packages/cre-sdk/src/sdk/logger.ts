export type Logger = {
	log: (message: string) => void
	info: (message: string) => void
	error: (message: string) => void
	warn: (message: string) => void
}

export const logger: Logger = {
	log: (message: string) => {
		console.log(message)
		log(message)
	},
	info: (message: string) => {
		console.info(message)
		log(message)
	},
	error: (message: string) => {
		console.error(message)
		log(message)
	},
	warn: (message: string) => {
		console.warn(message)
		log(message)
	},
}
