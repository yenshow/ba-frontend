import type { Person, SyncLocationCandidate, SyncLocationJobItem } from "~/types/personnel"

export type AccessControlConfigSummary = {
	cardNo: string
	fingerPrintData: string
	isLongTerm: boolean
	validBeginDate: string
	validEndDate: string
	password: string
}

const asRecord = (v: unknown): Record<string, unknown> | null => {
	if (!v || typeof v !== "object") return null
	return v as Record<string, unknown>
}

export const getAccessControlConfigSummary = (person: Person | null): AccessControlConfigSummary => {
	const config = asRecord(person?.config)
	const ac = asRecord(config?.access_control)
	if (!ac)
		return {
			cardNo: "",
			fingerPrintData: "",
			isLongTerm: true,
			validBeginDate: "",
			validEndDate: "",
			password: "",
		}

	const cardNo = typeof ac.cardNo === "string" ? ac.cardNo.trim() : ""
	const fps = Array.isArray(ac.fingerprints) ? ac.fingerprints : []
	const fingerPrintData =
		fps
			.map((x) => {
				const r = asRecord(x)
				return typeof r?.fingerData === "string" ? String(r.fingerData).trim() : ""
			})
			.find((x) => x) || ""

	const validity = asRecord(ac.validity)
	const isLongTerm = validity?.longTerm === false ? false : true
	const beginTime = typeof validity?.beginTime === "string" ? validity.beginTime.trim() : ""
	const endTime = typeof validity?.endTime === "string" ? validity.endTime.trim() : ""
	const toDate = (s: string) => {
		if (!s) return ""
		// "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD"
		if (s.includes("T")) return s.split("T")[0] || ""
		return s.length >= 10 ? s.slice(0, 10) : s
	}

	const password = typeof ac.password === "string" ? ac.password.trim() : ""

	return {
		cardNo,
		fingerPrintData,
		isLongTerm,
		validBeginDate: isLongTerm ? "" : toDate(beginTime),
		validEndDate: isLongTerm ? "" : toDate(endTime),
		password,
	}
}

export const updatePersonInList = (params: {
	people: Person[]
	next: Person
	editingPerson: Person | null
}) => {
	const { people, next, editingPerson } = params
	const idx = people.findIndex((x) => x.id === next.id)
	if (idx > -1) people[idx] = { ...people[idx], ...next }
	return editingPerson?.id === next.id ? { ...editingPerson, ...next } : editingPerson
}

export const revokeObjectUrl = (url: string | null) => {
	if (!url) return
	try {
		URL.revokeObjectURL(url)
	} catch {
		// ignore
	}
}

export const SYNC_WARNING_LABELS: Record<string, string> = {
	face: "人臉更新失敗",
	add: "新增失敗",
	update: "更新失敗",
	delete: "刪除失敗",
	sync: "同步失敗",
	card: "卡片寫入失敗",
	fingerprint: "指紋寫入失敗",
}

/** 人員／圖片／卡片／指紋 欄顯示狀態 */
export type SyncStepUiStatus = "pending" | "success" | "failed" | "skipped"

export type SyncPersonRow = {
	employeeNo: string
	fullName: string
	hasPassword: boolean
	hasCard: boolean
	fingerprintCount: number
	person: { status: SyncStepUiStatus; message: string | null }
	face: { status: SyncStepUiStatus; message: string | null }
	card: { status: SyncStepUiStatus; message: string | null }
	fingerprint: { status: SyncStepUiStatus; message: string | null }
}

const mergeDeviceStatuses = (parts: { status: SyncLocationJobItem["status"]; message: string | null }[]) => {
	const failed = parts.filter((p) => p.status === "failed")
	if (failed.length) {
		const msg = failed.map((f) => f.message).filter(Boolean).join("；")
		return { status: "failed" as const, message: msg || null }
	}
	const skipped = parts.filter((p) => p.status === "skipped")
	if (skipped.length) {
		// 只要有任一設備顯示 skipped，就用 skipped（避免誤判成 pending）
		return { status: "skipped" as const, message: null as string | null }
	}
	const ok = parts.filter((p) => p.status === "success")
	if (ok.length) {
		return { status: "success" as const, message: null as string | null }
	}
	return { status: "skipped" as const, message: null as string | null }
}

const normalizeStepStatus = (params: {
	hasData: boolean
	merged: { status: SyncStepUiStatus; message: string | null }
	emptyMessageWhenHasData?: string
}) => {
	const { hasData, merged, emptyMessageWhenHasData } = params
	// 規則：略過只代表「沒有資料」；若有資料但後端回 skipped（通常是未變更而略過寫入），視為成功
	if (!hasData) return { status: "skipped" as SyncStepUiStatus, message: null as string | null }
	if (merged.status === "skipped") {
		return { status: "success" as SyncStepUiStatus, message: merged.message || emptyMessageWhenHasData || "未變更，略過寫入" }
	}
	return merged
}

const collectForEmployee = (items: SyncLocationJobItem[], employeeNo: string) => {
	return items.filter((it) => it.employeeNo && String(it.employeeNo) === String(employeeNo))
}

const stageFaceItems = (list: SyncLocationJobItem[]) => {
	return list.filter((it) => it.action === "sync" && it.stage === "face")
}
const stageUserInfoItems = (list: SyncLocationJobItem[]) => {
	return list.filter((it) => it.action === "sync" && it.stage === "userInfo")
}
const stageCardItems = (list: SyncLocationJobItem[]) => {
	return list.filter((it) => it.action === "sync" && it.stage === "card")
}
const stageFingerprintItems = (list: SyncLocationJobItem[]) => {
	return list.filter((it) => it.action === "sync" && String(it.stage || "").startsWith("fingerprint:"))
}
const personWrapperItems = (list: SyncLocationJobItem[]) => {
	return list.filter(
		(it) => (it.action === "add" || it.action === "update") && (it.stage === "person" || it.stage == null)
	)
}

const toParts = (arr: SyncLocationJobItem[]) => {
	return arr.map((it) => ({
		status: it.status,
		message: it.message ?? null,
	}))
}

/**
 * 依候選人與目前 job items，產出每列四欄步驟狀態（多設備彙整）
 */
export const buildSyncPersonStepRows = (params: {
	/** 僅帶入「該地點」的 job items（單一同步或同步全部中已依 locationId 篩選） */
	candidates: SyncLocationCandidate[]
	items: SyncLocationJobItem[]
}): SyncPersonRow[] => {
	const { candidates, items } = params

	return candidates.map((c) => {
		const list = collectForEmployee(items, c.employeeNo)
		const needsSyncStepsRaw = (c as unknown as { needsSyncSteps?: unknown }).needsSyncSteps
		const needsSyncSteps = Array.isArray(needsSyncStepsRaw) ? needsSyncStepsRaw.map((s) => String(s)) : []
		const needsSet = new Set(needsSyncSteps)
		const pUi = (() => {
			const u = stageUserInfoItems(list)
			const wrap = personWrapperItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return {
					status: m.status,
					message: m.message,
				}
			}
			if (wrap.length) {
				const m = mergeDeviceStatuses(toParts(wrap))
				if (m.status === "success") {
					// 外層 person 僅在整段 sync 成功後寫入；內層以 userInfo 為準
					return { status: "success" as SyncStepUiStatus, message: null as string | null }
				}
				return { status: m.status, message: m.message }
			}
			// UI 精簡：沒有事件一律顯示略過（不區分待處理/處理中）
			if (needsSet.has("userInfo")) return { status: "pending" as const, message: "待同步" }
			return { status: "skipped" as const, message: null }
		})()

		const fFace = (() => {
			if (!c.hasFace) return { status: "skipped" as SyncStepUiStatus, message: null as string | null }
			const u = stageFaceItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed") {
				return { status: "skipped" as SyncStepUiStatus, message: "基本資料未成功，略過人臉" }
			}
			if (needsSet.has("face")) return { status: "pending" as const, message: "待同步" }
			// 有人臉資料但沒有任何 face 事件：視為失敗（避免「有資料卻沒處理」被略過掩蓋）
			return { status: "failed" as SyncStepUiStatus, message: "有大頭照但未寫入設備（請檢查同步紀錄/警告）" }
		})()

		const fCard = (() => {
			if (!c.hasCard) return { status: "skipped" as SyncStepUiStatus, message: null as string | null }
			const u = stageCardItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed")
				return { status: "skipped" as SyncStepUiStatus, message: "基本資料未成功，略過卡片" }
			if (needsSet.has("card")) return { status: "pending" as const, message: "待同步" }
			return { status: "failed" as SyncStepUiStatus, message: "有卡號但未寫入設備（請檢查同步紀錄/警告）" }
		})()

		const fFp = (() => {
			if (c.fingerprintCount <= 0) return { status: "skipped" as SyncStepUiStatus, message: null as string | null }
			const u = stageFingerprintItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed")
				return { status: "skipped" as SyncStepUiStatus, message: "基本資料未成功，略過指紋" }
			if (needsSet.has("fingerprint")) return { status: "pending" as const, message: "待同步" }
			return { status: "failed" as SyncStepUiStatus, message: "有指紋但未寫入設備（請檢查同步紀錄/警告）" }
		})()

		return {
			employeeNo: c.employeeNo,
			fullName: c.fullName,
			hasPassword: Boolean((c as unknown as { hasPassword?: unknown }).hasPassword),
			hasCard: Boolean(c.hasCard),
			fingerprintCount: Number(c.fingerprintCount) || 0,
			person: pUi,
			face: fFace,
			card: fCard,
			fingerprint: fFp,
		}
	})
}

