import type {
	Person,
	SyncLocationCandidate,
	SyncLocationJobItem,
	SyncWarning,
} from "~/types/personnel"

export const PERSON_STATUS_LABELS: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
}

export const getPersonStatusLabel = (status: unknown) =>
	PERSON_STATUS_LABELS[String(status)] ?? String(status || "未知")

export const getPersonStatusBadgeClass = (status: unknown) => {
	const s = String(status)
	if (s === "active") return "bg-emerald-500/20 text-emerald-200"
	if (s === "inactive") return "bg-yellow-500/20 text-yellow-200"
	return "bg-gray-500/20 text-gray-200"
}

export const getPersonStatusPillClass = (status: unknown) => {
	const s = String(status)
	if (s === "active") return "bg-emerald-500/15 text-emerald-100"
	if (s === "inactive") return "bg-yellow-500/15 text-yellow-100"
	return "bg-gray-500/15 text-gray-100"
}

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

export const getAccessControlConfigSummary = (
	person: Person | null
): AccessControlConfigSummary => {
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
	const toDateTimeLocal = (s: string, mode: "begin" | "end") => {
		if (!s) return ""
		// 支援後端常見格式：
		// - "YYYY-MM-DD" -> "YYYY-MM-DDT00:00" or "YYYY-MM-DDT23:59"
		// - "YYYY-MM-DDTHH:mm" -> 原樣
		// - "YYYY-MM-DDTHH:mm:ss" -> 去秒
		// - ISO string -> 盡量轉成本地 datetime-local（到分鐘）
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T${mode === "begin" ? "00:00" : "23:59"}`
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 16)
		const d = new Date(s)
		if (Number.isNaN(d.getTime())) return ""
		const y = d.getFullYear()
		const m = String(d.getMonth() + 1).padStart(2, "0")
		const day = String(d.getDate()).padStart(2, "0")
		const hh = String(d.getHours()).padStart(2, "0")
		const mm = String(d.getMinutes()).padStart(2, "0")
		return `${y}-${m}-${day}T${hh}:${mm}`
	}

	const password = typeof ac.password === "string" ? ac.password.trim() : ""

	return {
		cardNo,
		fingerPrintData,
		isLongTerm,
		validBeginDate: isLongTerm ? "" : toDateTimeLocal(beginTime, "begin"),
		validEndDate: isLongTerm ? "" : toDateTimeLocal(endTime, "end"),
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
export type SyncStepUiStatus = "pending" | "success" | "failed" | "unchanged" | "no_data"

/** 「已同步」欄整體狀態（見 docs/40-systems/personnel.md §7.2） */
export type OverallSyncUiStatus = "pending" | "success" | "failed"

export type LastCompletedSyncCache = {
	finishedAt: unknown
	locationRunFailure: boolean
	warningsByEmployeeNo: Record<string, true>
	processedByEmployeeNo: Record<string, true>
}

export const formatSyncAt = (v: unknown): string | null => {
	if (!v) return null
	const d = v instanceof Date ? v : new Date(String(v))
	if (Number.isNaN(d.getTime())) return null
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, "0")
	const dd = String(d.getDate()).padStart(2, "0")
	const hh = String(d.getHours()).padStart(2, "0")
	const mi = String(d.getMinutes()).padStart(2, "0")
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export const lastSyncStatusLabel = (raw: unknown) => {
	const s = String(raw || "").trim()
	if (s === "success") return "成功"
	if (s === "failed") return "失敗"
	if (s === "unchanged") return "未變更"
	if (s === "no_data") return "無資料"
	return s || "—"
}

export const lastSyncAtFromCandidate = (
	cand: { last_sync?: SyncLocationCandidate["last_sync"] } | null
) => {
	const s = cand?.last_sync
	if (!s) return null
	const atCandidates = [s.user_info?.at, s.face?.at, s.card?.at, s.fingerprint?.at]
		.map(formatSyncAt)
		.filter(Boolean)
	return atCandidates.length ? atCandidates[0]! : null
}

/** 失敗優先於待同步（方案 1） */
export const resolveOverallSyncStatus = (input: {
	employeeNo: string
	candidate: SyncLocationCandidate | null
	warnings: SyncWarning[]
	locationId: number
	activeSyncLocationId: number | null
	activeSyncJobStatus: string | null
	activeSyncJobFinishedAt: unknown
	lastCompletedCache: LastCompletedSyncCache | undefined
}): { status: OverallSyncUiStatus; at: string | null } => {
	const emp = String(input.employeeNo)
	const { candidate: cand, warnings, locationId } = input
	const at = lastSyncAtFromCandidate(cand)

	const locationRunFailure = warnings.some(
		(w) => String(w.type || "") === "sync" && !String(w.employeeNo || "").trim()
	)
	const empHasWarning = warnings.some((w) => String(w.employeeNo || "") === emp)

	if (input.activeSyncLocationId === locationId && input.activeSyncJobStatus === "completed") {
		const jobAt = input.activeSyncJobFinishedAt ? formatSyncAt(input.activeSyncJobFinishedAt) : null
		if (locationRunFailure || empHasWarning) return { status: "failed", at: jobAt }
		return { status: "success", at: jobAt }
	}

	const cached = input.lastCompletedCache
	if (cached?.locationRunFailure) {
		return {
			status: "failed",
			at: cached.finishedAt != null ? formatSyncAt(cached.finishedAt) : null,
		}
	}
	if (cached?.processedByEmployeeNo?.[emp]) {
		const cacheAt = cached.finishedAt != null ? formatSyncAt(cached.finishedAt) : null
		if (cached.warningsByEmployeeNo[emp]) return { status: "failed", at: cacheAt }
		return { status: "success", at: cacheAt }
	}

	if (locationRunFailure || empHasWarning) return { status: "failed", at }

	const statuses = cand?.last_sync
		? [
				cand.last_sync.user_info?.status,
				cand.last_sync.face?.status,
				cand.last_sync.card?.status,
				cand.last_sync.fingerprint?.status,
			]
				.map((x) => String(x || "").trim())
				.filter(Boolean)
		: []
	if (statuses.includes("failed")) return { status: "failed", at }

	if (cand?.needs_sync) return { status: "pending", at }
	if (!cand?.last_sync) return { status: "pending", at: null }

	return { status: "success", at }
}

export const getOverallSyncDisplayLabel = (
	resolved: { status: OverallSyncUiStatus },
	candidate: SyncLocationCandidate | null
): string => {
	if (resolved.status === "pending") return "待同步"
	if (resolved.status === "failed") return "失敗"
	if (String(candidate?.last_sync?.user_info?.status || "").trim() === "no_data") return "無資料"
	return "成功"
}

export const buildOverallSyncTitle = (candidate: SyncLocationCandidate | null): string | null => {
	const s = candidate?.last_sync
	if (!s) return null
	const parts = [
		`人員: ${lastSyncStatusLabel(s.user_info?.status)}${s.user_info?.at ? ` @ ${formatSyncAt(s.user_info.at)}` : ""}`,
		`圖片: ${lastSyncStatusLabel(s.face?.status)}${s.face?.at ? ` @ ${formatSyncAt(s.face.at)}` : ""}`,
		`卡片: ${lastSyncStatusLabel(s.card?.status)}${s.card?.at ? ` @ ${formatSyncAt(s.card.at)}` : ""}`,
		`指紋: ${lastSyncStatusLabel(s.fingerprint?.status)}${s.fingerprint?.at ? ` @ ${formatSyncAt(s.fingerprint.at)}` : ""}`,
	]
	if (candidate?.needs_sync) {
		const steps = Array.isArray(candidate.needs_sync_steps)
			? candidate.needs_sync_steps.map((x) => String(x)).filter(Boolean)
			: []
		if (steps.length) parts.unshift(`待同步步驟: ${steps.join(", ")}`)
	}
	return parts.join("\n")
}

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

const mergeDeviceStatuses = (
	parts: { status: SyncLocationJobItem["status"]; message: string | null }[]
) => {
	const failed = parts.filter((p) => p.status === "failed")
	if (failed.length) {
		const msg = failed
			.map((f) => f.message)
			.filter(Boolean)
			.join("；")
		return { status: "failed" as const, message: msg || null }
	}
	const unchanged = parts.filter((p) => p.status === "unchanged")
	if (unchanged.length) {
		// 只要有任一設備顯示 unchanged，就用 unchanged（避免誤判成 pending）
		return { status: "unchanged" as const, message: null as string | null }
	}
	const ok = parts.filter((p) => p.status === "success")
	if (ok.length) {
		return { status: "success" as const, message: null as string | null }
	}
	// 沒有事件時，留給上層用 last_sync / needs_sync 判斷；這裡視為 unchanged（避免被解讀成 pending）
	return { status: "unchanged" as const, message: null as string | null }
}

const normalizeStepStatus = (params: {
	hasData: boolean
	merged: { status: SyncStepUiStatus; message: string | null }
	emptyMessageWhenHasData?: string
}) => {
	const { hasData, merged, emptyMessageWhenHasData } = params
	if (!hasData) return { status: "no_data" as SyncStepUiStatus, message: null as string | null }
	if (merged.status === "unchanged") {
		return {
			status: "unchanged" as SyncStepUiStatus,
			message: merged.message || emptyMessageWhenHasData || "未變更",
		}
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
	return list.filter(
		(it) => it.action === "sync" && String(it.stage || "").startsWith("fingerprint:")
	)
}
const personWrapperItems = (list: SyncLocationJobItem[]) => {
	return list.filter(
		(it) =>
			(it.action === "add" || it.action === "update") && (it.stage === "person" || it.stage == null)
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
	warnings?: SyncWarning[]
}): SyncPersonRow[] => {
	const { candidates, items, warnings } = params

	const locationRunFailureMessage = (() => {
		// 設備/連線層級錯誤：warning type=sync 且沒有 employeeNo（例如讀取設備人員清單失敗）
		const w = (warnings || []).find(
			(x) => String(x.type || "") === "sync" && !String(x.employeeNo || "").trim()
		)
		if (!w) return null
		return String(w.message || "").trim() || "設備同步失敗"
	})()

	const warningByEmployee = (() => {
		const m = new Map<
			string,
			{
				person: string[]
				face: string[]
				card: string[]
				fingerprint: string[]
			}
		>()
		for (const w of warnings || []) {
			const emp = (w.employeeNo || "").trim()
			if (!emp) continue
			if (!m.has(emp)) m.set(emp, { person: [], face: [], card: [], fingerprint: [] })
			const bucket = m.get(emp)!
			const t = String(w.type || "").toLowerCase()
			const msg = String(w.message || "").trim() || "失敗"
			if (t.includes("face")) bucket.face.push(msg)
			else if (t.includes("card")) bucket.card.push(msg)
			else if (t.includes("fingerprint")) bucket.fingerprint.push(msg)
			else bucket.person.push(msg)
		}
		return m
	})()

	const stepStatusFromLastSync = (
		c: SyncLocationCandidate,
		step: "user_info" | "face" | "card" | "fingerprint"
	): { status: SyncStepUiStatus; message: string | null } => {
		const ls = (c as unknown as { last_sync?: unknown }).last_sync as
			| {
					user_info?: { status?: string }
					face?: { status?: string }
					card?: { status?: string }
					fingerprint?: { status?: string }
			  }
			| undefined
		const raw = String((ls as any)?.[step]?.status || "").trim()
		if (raw === "success") return { status: "success", message: null }
		if (raw === "failed") return { status: "failed", message: "上次同步失敗（可重新同步）" }
		if (raw === "unchanged") return { status: "unchanged", message: "未變更" }
		if (raw === "no_data") return { status: "no_data", message: "無資料" }
		// unknown：不強行顯示失敗，避免誤解
		return { status: "unchanged", message: raw ? `同步狀態：${raw}` : "尚無同步紀錄" }
	}

	/** 無本次 job 事件：失敗優先於待同步（與「已同步」欄一致） */
	const stepStatusWhenIdle = (
		c: SyncLocationCandidate,
		step: "user_info" | "face" | "card" | "fingerprint",
		needsSet: Set<string>,
		needsStepKey: string
	): { status: SyncStepUiStatus; message: string | null } => {
		const fromLast = stepStatusFromLastSync(c, step)
		if (fromLast.status === "failed") return fromLast
		if (needsSet.has(needsStepKey)) return { status: "pending", message: "待同步" }
		return fromLast
	}

	return candidates.map((c) => {
		const emp = String(c.employee_no)
		const warning = warningByEmployee.get(emp) || null
		const list = collectForEmployee(items, c.employee_no)
		const needsSyncStepsRaw = (c as unknown as { needs_sync_steps?: unknown }).needs_sync_steps
		const needsSyncSteps = Array.isArray(needsSyncStepsRaw)
			? needsSyncStepsRaw.map((s) => String(s))
			: []
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
			return stepStatusWhenIdle(c, "user_info", needsSet, "user_info")
		})()

		const fFaceBase = (() => {
			if (!c.has_face)
				return { status: "no_data" as SyncStepUiStatus, message: null as string | null }
			const u = stageFaceItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed") {
				return { status: "unchanged" as SyncStepUiStatus, message: "基本資料未成功，人臉不處理" }
			}
			return stepStatusWhenIdle(c, "face", needsSet, "face")
		})()

		const fCardBase = (() => {
			if (!c.has_card)
				return { status: "no_data" as SyncStepUiStatus, message: null as string | null }
			const u = stageCardItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed")
				return { status: "unchanged" as SyncStepUiStatus, message: "基本資料未成功，卡片不處理" }
			return stepStatusWhenIdle(c, "card", needsSet, "card")
		})()

		const fFpBase = (() => {
			if (c.fingerprint_count <= 0)
				return { status: "no_data" as SyncStepUiStatus, message: null as string | null }
			const u = stageFingerprintItems(list)
			if (u.length) {
				const m = mergeDeviceStatuses(toParts(u))
				return normalizeStepStatus({ hasData: true, merged: m })
			}
			if (pUi.status === "failed")
				return { status: "unchanged" as SyncStepUiStatus, message: "基本資料未成功，指紋不處理" }
			return stepStatusWhenIdle(c, "fingerprint", needsSet, "fingerprint")
		})()

		const overrideFailed = (
			base: { status: SyncStepUiStatus; message: string | null },
			msgs: string[]
		) => {
			if (!msgs.length) return base
			return { status: "failed" as SyncStepUiStatus, message: msgs.join("；") }
		}

		const pFinal = overrideFailed(pUi, warning?.person || [])
		let fFace = overrideFailed(fFaceBase, warning?.face || [])
		let fCard = overrideFailed(fCardBase, warning?.card || [])
		let fFp = overrideFailed(fFpBase, warning?.fingerprint || [])

		// 一致性規則：若「人員(UserInfo)」非成功，則不應顯示其他步驟為成功（避免誤解）
		// - 例：歷史上 face 可能 success，但若 userInfo 為 never/partial，代表設備整體狀態仍未完整
		// - 例：本次同步 userInfo 略過/待同步，也不應讓 face/card/fingerprint 顯示成功
		if (pFinal.status !== "success") {
			const clamp = (
				cell: { status: SyncStepUiStatus; message: string | null },
				stepKey: string
			) => {
				// 若該步驟本身就是 pending/failed/unchanged/no_data，維持原狀
				if (cell.status !== "success") return cell
				// 若後端判定此步驟需要同步，維持 pending
				if (needsSet.has(stepKey))
					return { status: "pending" as SyncStepUiStatus, message: "待同步" }
				// 否則視為未變更（依賴 userInfo 未完成）
				return { status: "unchanged" as SyncStepUiStatus, message: "基本資料未同步完成" }
			}
			fFace = clamp(fFace, "face")
			fCard = clamp(fCard, "card")
			fFp = clamp(fFp, "fingerprint")
		}

		// 設備/連線層級錯誤：如實呈現「本次該地點全部無法同步」
		if (locationRunFailureMessage) {
			const msg = locationRunFailureMessage
			return {
				employeeNo: emp,
				fullName: c.full_name,
				hasPassword: Boolean((c as unknown as { has_password?: unknown }).has_password),
				hasCard: Boolean(c.has_card),
				fingerprintCount: Number(c.fingerprint_count) || 0,
				person: { status: "failed", message: msg },
				face: c.has_face
					? { status: "failed", message: msg }
					: { status: "no_data", message: null },
				card: c.has_card
					? { status: "failed", message: msg }
					: { status: "no_data", message: null },
				fingerprint:
					Number(c.fingerprint_count) > 0
						? { status: "failed", message: msg }
						: { status: "no_data", message: null },
			}
		}

		return {
			employeeNo: emp,
			fullName: c.full_name,
			hasPassword: Boolean((c as unknown as { has_password?: unknown }).has_password),
			hasCard: Boolean(c.has_card),
			fingerprintCount: Number(c.fingerprint_count) || 0,
			person: pFinal,
			face: fFace,
			card: fCard,
			fingerprint: fFp,
		}
	})
}
