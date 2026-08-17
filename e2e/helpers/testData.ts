export const E2E_PREFIX = "E2E-"

export const makeE2eTag = () => {
	const stamp = Date.now().toString(36)
	const rand = Math.random().toString(36).slice(2, 6)
	return `${E2E_PREFIX}${stamp}-${rand}`
}
