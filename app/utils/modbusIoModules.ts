/**
 * Modbus DI/DO ioModules（主／副擴充）前端工具
 * 位址存 0-based；表單通道顯示 = address + 1
 */
import type { IoModuleConfig } from "~/types/device"

export const DEFAULT_IO_MODULE_WIDTH = 16

export const defaultMasterIoModule = (): IoModuleConfig => ({
	role: "master",
	moduleId: 0,
	addressStart: 0,
	addressEnd: DEFAULT_IO_MODULE_WIDTH - 1,
})

/** 通道（1-based）→ 位址（0-based） */
export const channelToAddress = (channel: number): number => Number(channel) - 1

/** 位址（0-based）→ 通道（1-based） */
export const addressToChannel = (address: number): number => Number(address) + 1

export type IoModuleFormRow = {
	role: "master" | "slave"
	moduleId: number
	serial: string
	/** 顯示用 1-based 起訖 */
	channelStart: number
	channelEnd: number
}

export const ioModulesToFormRows = (modules?: IoModuleConfig[] | null): IoModuleFormRow[] => {
	const list =
		Array.isArray(modules) && modules.length > 0 ? modules : [defaultMasterIoModule()]
	return list.map((m) => ({
		role: m.role,
		moduleId: m.moduleId,
		serial: m.serial || "",
		channelStart: addressToChannel(m.addressStart),
		channelEnd: addressToChannel(m.addressEnd),
	}))
}

export const formRowsToIoModules = (rows: IoModuleFormRow[]): IoModuleConfig[] => {
	return rows.map((r) => {
		const out: IoModuleConfig = {
			role: r.role,
			moduleId: r.moduleId,
			addressStart: channelToAddress(r.channelStart),
			addressEnd: channelToAddress(r.channelEnd),
		}
		const serial = String(r.serial || "").trim()
		if (serial) out.serial = serial
		return out
	})
}

export const validateIoModuleFormRows = (rows: IoModuleFormRow[]): string | null => {
	if (!rows.length) return "請至少保留主機模組"
	const masters = rows.filter((r) => r.role === "master")
	if (masters.length !== 1) return "須恰好一個主機模組"
	if (masters[0].moduleId !== 0) return "主機 moduleId 須為 0"

	const seen = new Set<number>()
	for (const r of rows) {
		if (!Number.isInteger(r.moduleId) || r.moduleId < 0) return "模組 ID 不合法"
		if (r.role === "slave" && r.moduleId < 1) return "副機 ID 須 ≥ 1"
		if (seen.has(r.moduleId)) return `模組 ID 重複：${r.moduleId}`
		seen.add(r.moduleId)
		if (
			!Number.isInteger(r.channelStart) ||
			!Number.isInteger(r.channelEnd) ||
			r.channelStart < 1 ||
			r.channelEnd < r.channelStart
		) {
			return `模組 ${r.moduleId} 點位起訖不合法（須為 ≥1 的整數且起 ≤ 訖）`
		}
	}

	const sorted = [...rows].sort(
		(a, b) => channelToAddress(a.channelStart) - channelToAddress(b.channelStart),
	)
	for (let i = 1; i < sorted.length; i++) {
		const prevEnd = channelToAddress(sorted[i - 1].channelEnd)
		const curStart = channelToAddress(sorted[i].channelStart)
		if (curStart <= prevEnd) {
			return `模組點位區間重疊（ID ${sorted[i - 1].moduleId} 與 ${sorted[i].moduleId}）`
		}
	}
	return null
}

export const nextSlaveFormRow = (rows: IoModuleFormRow[]): IoModuleFormRow => {
	const used = new Set(rows.map((r) => r.moduleId))
	let moduleId = 1
	while (used.has(moduleId)) moduleId += 1
	const maxEnd = rows.reduce((acc, r) => Math.max(acc, r.channelEnd), 0)
	const channelStart = maxEnd + 1
	return {
		role: "slave",
		moduleId,
		serial: "",
		channelStart,
		channelEnd: channelStart + DEFAULT_IO_MODULE_WIDTH - 1,
	}
}

/**
 * 地點表單：address（0-based）是否落在設備 ioModules 區間
 * 無明確 ioModules → 通過（相容舊設備）
 */
export const isAddressInDeviceIoModules = (
	deviceConfig: { ioModules?: IoModuleConfig[] } | null | undefined,
	address: number,
): { ok: true } | { ok: false; message: string } => {
	const modules = deviceConfig?.ioModules
	if (!Array.isArray(modules) || modules.length === 0) return { ok: true }
	const addr = Number(address)
	if (!Number.isInteger(addr) || addr < 0) {
		return { ok: false, message: "Modbus 位址須為非負整數（0-based）" }
	}
	const hit = modules.some((m) => addr >= m.addressStart && addr <= m.addressEnd)
	if (hit) return { ok: true }
	const ranges = modules
		.map((m) => `${m.moduleId}:[${m.addressStart}-${m.addressEnd}]`)
		.join(", ")
	return { ok: false, message: `位址 ${addr} 不在控制器 ioModules 區間內（${ranges}）` }
}
