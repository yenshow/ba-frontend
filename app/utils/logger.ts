/**
 * 統一日誌工具：集中 dev/prod gate
 */

const isDevOutputEnabled = (): boolean => process.dev

const formatMessage = (msg: string): string => `[${new Date().toISOString()}] ${msg}`

const writeDevLog = (
	consoleFn: (...args: unknown[]) => void,
	msg: string,
	...args: unknown[]
) => {
	if (!isDevOutputEnabled()) return
	consoleFn(formatMessage(msg), ...args)
}

export const logger = {
	debug: (msg: string, ...args: unknown[]) => writeDevLog(console.debug, msg, ...args),

	info: (msg: string, ...args: unknown[]) => writeDevLog(console.info, msg, ...args),

	warn: (msg: string, ...args: unknown[]) => writeDevLog(console.warn, msg, ...args),

	error: (msg: string, ...args: unknown[]) => {
		console.error(formatMessage(msg), ...args)
	},

	createLogger: (moduleName: string) => ({
		debug: (msg: string, ...args: unknown[]) => logger.debug(`[${moduleName}] ${msg}`, ...args),
		info: (msg: string, ...args: unknown[]) => logger.info(`[${moduleName}] ${msg}`, ...args),
		warn: (msg: string, ...args: unknown[]) => logger.warn(`[${moduleName}] ${msg}`, ...args),
		error: (msg: string, ...args: unknown[]) => logger.error(`[${moduleName}] ${msg}`, ...args),
	}),
}
