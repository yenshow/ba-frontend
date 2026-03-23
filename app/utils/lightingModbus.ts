import type { CategoryModbusConfig, LightingLocation } from "~/types/lighting"

export const hasInlineModbusDeviceConfig = (modbus: CategoryModbusConfig): boolean => {
	return !!(modbus.host && modbus.port && modbus.unitId !== undefined)
}

export const hasLocationControllerConfig = (location: LightingLocation): boolean => {
	if (location.deviceId) return true
	if (!location.modbus) return false
	return !!location.modbus.deviceId || hasInlineModbusDeviceConfig(location.modbus)
}

export const filterDoPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DO") return true
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils") return true
		return false
	})
}

export const filterDiPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DI") return true
		if (p.method === "getDiscreteInputs") return true
		return false
	})
}

export const extractDiAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.diAddresses && modbus.diAddresses.length > 0) {
		return modbus.diAddresses
	}
	if (modbus.diAddress !== undefined) {
		const start = modbus.diAddress
		const length = modbus.diLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

export const extractDoAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.doAddresses && modbus.doAddresses.length > 0) {
		return modbus.doAddresses
	}
	if (modbus.doAddress !== undefined) {
		const start = modbus.doAddress
		const length = modbus.doLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	if (modbus.address !== undefined) {
		const start = modbus.address
		const length = modbus.length ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

export const needsModbusConnection = (location: LightingLocation): boolean => {
	return !!location.modbus
}

export const extractReadPoint = (
	modbus: CategoryModbusConfig
): { address: number; type: "coil" | "discrete" } | null => {
	if (modbus.points && modbus.points.length > 0) {
		const diPoints = filterDiPoints(modbus.points)
		if (diPoints.length > 0) {
			return { address: diPoints[0].address, type: "discrete" }
		}
		const doPoints = filterDoPoints(modbus.points)
		if (doPoints.length > 0) {
			return { address: doPoints[0].address, type: "coil" }
		}
	} else {
		const diAddresses = extractDiAddresses(modbus)
		if (diAddresses.length > 0) {
			return { address: Math.min(...diAddresses), type: "discrete" }
		}
		const doAddresses = extractDoAddresses(modbus)
		if (doAddresses.length > 0) {
			return { address: Math.min(...doAddresses), type: "coil" }
		}
	}
	return null
}

export const extractWritePoints = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.points && modbus.points.length > 0) {
		const doPoints = filterDoPoints(modbus.points)
		return doPoints.map((p) => p.address)
	}
	return extractDoAddresses(modbus)
}
