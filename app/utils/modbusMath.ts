export type AddressGroup = { start: number; length: number; addresses: number[] }

export const groupConsecutiveAddresses = (addresses: number[]): AddressGroup[] => {
	if (addresses.length === 0) return []

	const sorted = [...addresses].sort((a, b) => a - b)
	const groups: AddressGroup[] = []
	let currentGroup: number[] = []

	for (let i = 0; i < sorted.length; i++) {
		if (currentGroup.length === 0) {
			currentGroup.push(sorted[i])
			continue
		}

		const lastAddr = currentGroup[currentGroup.length - 1]
		if (sorted[i] === lastAddr + 1) {
			currentGroup.push(sorted[i])
			continue
		}

		groups.push({
			start: currentGroup[0],
			length: currentGroup.length,
			addresses: [...currentGroup],
		})
		currentGroup = [sorted[i]]
	}

	if (currentGroup.length > 0) {
		groups.push({
			start: currentGroup[0],
			length: currentGroup.length,
			addresses: [...currentGroup],
		})
	}

	return groups
}

/**
 * 統一使用簡化格式：直接填入運算符和數值，例如 "-1", "/ 10", "* 2", "+ 5"
 * 若輸入為純數值（例如 "1"），視為 "value - 1"（向後兼容）。
 */
export const applyTransform = (value: number, transform?: string): number => {
	if (!transform || !transform.trim()) return value

	try {
		const trimmed = transform.trim()
		let formula = ""

		if (/^[\+\-\*\/]/.test(trimmed)) {
			if (trimmed.startsWith("-")) {
				const numPart = trimmed.substring(1).trim()
				formula = `${value} - ${numPart}`
			} else {
				formula = `${value} ${trimmed}`
			}
		} else {
			if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
				formula = `${value} - ${trimmed}`
			} else {
				formula = trimmed.replace(/value/gi, String(value))
			}
		}

		const result = Function(`"use strict"; return (${formula})`)()
		return typeof result === "number" && !isNaN(result) ? result : value
	} catch {
		return value
	}
}

