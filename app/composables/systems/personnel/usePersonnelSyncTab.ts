import type { Ref } from "vue"
import type {
	Person,
	SyncableLocation,
	SyncLocationCandidate,
	SyncWarning,
	SyncAllLocationsJob,
	SyncLocationJob,
	SyncLocationJobItem,
} from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { SYNC_WARNING_LABELS, buildSyncPersonStepRows, type SyncStepUiStatus } from "~/utils/personnelUtils"
import { fetchAllPaged } from "~/utils/pagingUtils"

type LocationId = number

export const usePersonnelSyncTab = (params: {
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canEdit: Ref<boolean>
}) => {
	const { personnelApi, toast, handleApiError, canEdit } = params

	const syncableLocations = ref<SyncableLocation[]>([])
	const isLoadingSyncable = ref(false)
	const isSyncingAll = ref(false)
	const syncWarnings = ref<SyncWarning[]>([])
	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type

	// ---------- 地點成員管理（門禁名單；SSOT: person_location_access） ----------
	const LOCATION_MEMBERS_PAGE_SIZE = 20
	const locationMembersPanelOpen = reactive<Record<LocationId, boolean>>({})
	const locationMembersLoading = reactive<Record<LocationId, boolean>>({})
	const locationMembersApplying = reactive<Record<LocationId, boolean>>({})
	const locationMembersError = reactive<Record<LocationId, string | null>>({})
	const locationMembersSuccess = reactive<Record<LocationId, string | null>>({})
	const locationMembersAll = reactive<Record<LocationId, Person[]>>({})
	const locationMembersKeptIds = reactive<Record<LocationId, number[]>>({})
	const locationMembersPageIndex = reactive<Record<LocationId, number>>({})
	const locationMembersSelectedAddIds = reactive<Record<LocationId, number[]>>({})

	// 加入名單：改為列表式（非搜尋），依 employeeNo 排序的分頁清單
	const LOCATION_ADD_PAGE_SIZE = 20
	const locationAddLoading = reactive<Record<LocationId, boolean>>({})
	const locationAddError = reactive<Record<LocationId, string | null>>({})
	const locationAddTotal = reactive<Record<LocationId, number>>({})
	const locationAddOffset = reactive<Record<LocationId, number>>({})
	const locationAddItems = reactive<Record<LocationId, Person[]>>({})

	const isLocationMembersPanelOpen = (locationId: number) => Boolean(locationMembersPanelOpen[locationId])
	const isLocationMembersLoading = (locationId: number) => Boolean(locationMembersLoading[locationId])
	const isLocationMembersApplying = (locationId: number) => Boolean(locationMembersApplying[locationId])
	const getLocationMembersError = (locationId: number) => (locationMembersError[locationId] || "").trim() || null
	const getLocationMembersSuccess = (locationId: number) =>
		(locationMembersSuccess[locationId] || "").trim() || null
	const getLocationMembersCount = (locationId: number) => locationMembersAll[locationId]?.length ?? 0
	const getLocationMembersAll = (locationId: number) => locationMembersAll[locationId] ?? []
	const getLocationMembersPageIndex = (locationId: number) => Number(locationMembersPageIndex[locationId] ?? 0)
	const getLocationMembersTotalPages = (locationId: number) => {
		const total = getLocationMembersCount(locationId)
		return Math.max(1, Math.ceil(total / LOCATION_MEMBERS_PAGE_SIZE))
	}
	const canPrevLocationMembersPage = (locationId: number) => getLocationMembersPageIndex(locationId) > 0
	const canNextLocationMembersPage = (locationId: number) =>
		getLocationMembersPageIndex(locationId) + 1 < getLocationMembersTotalPages(locationId)
	const prevLocationMembersPage = (locationId: number) => {
		locationMembersPageIndex[locationId] = Math.max(0, getLocationMembersPageIndex(locationId) - 1)
	}
	const nextLocationMembersPage = (locationId: number) => {
		locationMembersPageIndex[locationId] = Math.min(
			getLocationMembersTotalPages(locationId) - 1,
			getLocationMembersPageIndex(locationId) + 1
		)
	}
	const getLocationMembersOffset = (locationId: number) =>
		getLocationMembersPageIndex(locationId) * LOCATION_MEMBERS_PAGE_SIZE
	const getLocationMembersPaged = (locationId: number) => {
		const all = locationMembersAll[locationId] ?? []
		const start = getLocationMembersPageIndex(locationId) * LOCATION_MEMBERS_PAGE_SIZE
		return all.slice(start, start + LOCATION_MEMBERS_PAGE_SIZE)
	}
	const isLocationMemberKept = (locationId: number, personId: number) =>
		(locationMembersKeptIds[locationId] ?? []).includes(personId)
	const toggleKeepLocationMember = (locationId: number, personId: number, e: Event) => {
		const checked = (e.target as HTMLInputElement | null)?.checked ?? false
		const current = Array.isArray(locationMembersKeptIds[locationId]) ? locationMembersKeptIds[locationId] : []
		const set = new Set(current)
		if (checked) set.add(personId)
		else set.delete(personId)
		locationMembersKeptIds[locationId] = Array.from(set)
	}
	const isLocationMemberAddSelected = (locationId: number, personId: number) =>
		(locationMembersSelectedAddIds[locationId] ?? []).includes(personId)
	const toggleSelectAddLocationMember = (locationId: number, personId: number, e: Event) => {
		const checked = (e.target as HTMLInputElement | null)?.checked ?? false
		const current = Array.isArray(locationMembersSelectedAddIds[locationId])
			? locationMembersSelectedAddIds[locationId]
			: []
		const set = new Set(current)
		if (checked) set.add(personId)
		else set.delete(personId)
		locationMembersSelectedAddIds[locationId] = Array.from(set)
	}

	const isLocationAddLoading = (locationId: number) => Boolean(locationAddLoading[locationId])
	const getLocationAddError = (locationId: number) => (locationAddError[locationId] || "").trim() || null
	const getLocationAddTotal = (locationId: number) => Number(locationAddTotal[locationId] ?? 0)
	const getLocationAddOffset = (locationId: number) => Number(locationAddOffset[locationId] ?? 0)
	const getLocationAddItems = (locationId: number) => locationAddItems[locationId] ?? []
	const setLocationAddOffset = (locationId: number, nextOffset: number) => {
		locationAddOffset[locationId] = Math.max(0, Math.trunc(nextOffset))
	}
	const loadLocationAddCandidates = async (locationId: number) => {
		locationAddError[locationId] = null
		locationAddLoading[locationId] = true
		try {
			const res = await personnelApi.getPersons({
				limit: LOCATION_ADD_PAGE_SIZE,
				offset: getLocationAddOffset(locationId),
				sortBy: "employeeNo",
				sortOrder: "asc",
			})
			locationAddItems[locationId] = Array.isArray(res.items) ? res.items : []
			locationAddTotal[locationId] = Number.isFinite(Number(res.total)) ? Number(res.total) : 0
		} catch (err) {
			locationAddItems[locationId] = []
			locationAddTotal[locationId] = 0
			locationAddError[locationId] = err instanceof Error ? err.message : "載入可加入人員失敗"
		} finally {
			locationAddLoading[locationId] = false
		}
	}

	const loadAllLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersLoading[locationId] = true
		try {
			const all = await fetchAllPaged<Person>(({ limit, offset }) =>
				personnelApi.getLocationMembers(locationId, { limit, offset })
			)
			locationMembersAll[locationId] = all
			locationMembersKeptIds[locationId] = all.map((p) => p.id)
			locationMembersSelectedAddIds[locationId] = []
			locationMembersPageIndex[locationId] = 0
		} catch (err) {
			locationMembersAll[locationId] = []
			locationMembersKeptIds[locationId] = []
			locationMembersSelectedAddIds[locationId] = []
			locationMembersPageIndex[locationId] = 0
			locationMembersError[locationId] = err instanceof Error ? err.message : "載入門禁名單失敗"
		} finally {
			locationMembersLoading[locationId] = false
		}
	}

	const reloadLocationMembers = async (locationId: number) => {
		await loadAllLocationMembers(locationId)
		await loadLocationAddCandidates(locationId)
		await ensureSyncCandidates(locationId)
	}

	const toggleLocationMembersPanel = async (locationId: number) => {
		locationMembersPanelOpen[locationId] = !Boolean(locationMembersPanelOpen[locationId])
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		if (locationMembersPanelOpen[locationId]) {
			setLocationAddOffset(locationId, 0)
			await loadAllLocationMembers(locationId)
			await loadLocationAddCandidates(locationId)
		}
	}

	const applyLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersApplying[locationId] = true
		try {
			const kept = Array.isArray(locationMembersKeptIds[locationId]) ? locationMembersKeptIds[locationId] : []
			const adds = Array.isArray(locationMembersSelectedAddIds[locationId])
				? locationMembersSelectedAddIds[locationId]
				: []
			const next = Array.from(new Set([...kept, ...adds]))
			await personnelApi.replaceLocationMembers(locationId, next)
			locationMembersSuccess[locationId] = "已套用變更"
			await reloadLocationMembers(locationId)
		} catch (err) {
			locationMembersError[locationId] = err instanceof Error ? err.message : "套用失敗"
		} finally {
			locationMembersApplying[locationId] = false
		}
	}

	// ---------- 同步（各地點展開：人員列 + UserInfo／圖片／卡片／指紋） ----------
	const syncExpandedLocationIds = ref<Set<number>>(new Set())
	const syncCandidatesByLocation = reactive<Record<number, SyncLocationCandidate[]>>({})
	const syncCandidatesLoading = reactive<Record<number, boolean>>({})

	const activeSyncLocationId = ref<number | null>(null)
	const activeSyncJob = ref<SyncLocationJob | null>(null)
	const activeSyncAllJob = ref<SyncAllLocationsJob | null>(null)
	const isPollingSyncJob = ref(false)

	const isSingleLocationSyncing = computed(() => isPollingSyncJob.value)
	const isSyncLocationExpanded = (locationId: number) => syncExpandedLocationIds.value.has(locationId)
	const isSyncCandidatesLoading = (locationId: number) => Boolean(syncCandidatesLoading[locationId])

	const ensureSyncCandidates = async (locationId: number) => {
		syncCandidatesLoading[locationId] = true
		try {
			const res = await personnelApi.getSyncLocationCandidates(locationId)
			syncCandidatesByLocation[locationId] = res?.persons ?? []
		} catch (err) {
			handleApiError(err, "載入可同步人員失敗")
			syncCandidatesByLocation[locationId] = []
		} finally {
			syncCandidatesLoading[locationId] = false
		}
	}

	const toggleSyncLocationExpand = async (locationId: number) => {
		const next = new Set(syncExpandedLocationIds.value)
		if (next.has(locationId)) {
			next.delete(locationId)
		} else {
			next.add(locationId)
			await ensureSyncCandidates(locationId)
		}
		syncExpandedLocationIds.value = next
	}

	const isSyncLocationCandidatesLoading = (locationId: number) => Boolean(syncCandidatesLoading[locationId])

	const getLocationSummary = (
		locationId: number
	): { people: string; face: string; card: string; fingerprint: string } => {
		const loading = isSyncCandidatesLoading(locationId)
		const list = syncCandidatesByLocation[locationId]
		if (!Array.isArray(list)) {
			if (loading) return { people: "…", face: "…", card: "…", fingerprint: "…" }
			return { people: "—", face: "—", card: "—", fingerprint: "—" }
		}
		const people = list.length
		const face = list.filter((p) => p.hasFace).length
		const card = list.filter((p) => p.hasCard).length
		const fingerprint = list.filter((p) => Number(p.fingerprintCount) > 0).length
		return { people: String(people), face: String(face), card: String(card), fingerprint: String(fingerprint) }
	}

	const getItemsForLocation = (locationId: number): SyncLocationJobItem[] => {
		if (activeSyncLocationId.value === locationId && activeSyncJob.value) return activeSyncJob.value.items ?? []
		const j = activeSyncAllJob.value
		if (j?.items?.length) {
			return j.items.filter((it) => it.locationId == null || Number(it.locationId) === Number(locationId))
		}
		return []
	}

	const isLocationSyncJobRunning = (locationId: number): boolean => {
		if (activeSyncLocationId.value === locationId && isPollingSyncJob.value) {
			return activeSyncJob.value != null && activeSyncJob.value.status !== "completed"
		}
		if (
			isSyncingAll.value &&
			activeSyncAllJob.value &&
			activeSyncAllJob.value.status !== "completed" &&
			activeSyncAllJob.value.progress?.currentLocationId === locationId
		) {
			return true
		}
		return false
	}

	const getSyncStepRowsForLocation = (locationId: number) => {
		const candidates = syncCandidatesByLocation[locationId] ?? []
		const items = getItemsForLocation(locationId)
		return buildSyncPersonStepRows({ candidates, items })
	}

	const syncStepShortLabel = (cell: { status: SyncStepUiStatus }) => {
		const s = cell.status
		if (s === "pending") return "待同步"
		if (s === "success") return "成功"
		if (s === "failed") return "失敗"
		return "略過"
	}

	const syncStepPillClass = (status: SyncStepUiStatus) => {
		const m: Record<SyncStepUiStatus, string> = {
			pending: "bg-amber-500/15 text-amber-100 border border-amber-400/30",
			success: "bg-emerald-500/15 text-emerald-100 border border-emerald-400/30",
			failed: "bg-rose-500/15 text-rose-100 border border-rose-400/30",
			skipped: "bg-white/5 text-white/45 border border-white/10",
		}
		return m[status] ?? "bg-white/5 text-white/60 border border-white/10"
	}

	const formatAt = (v: unknown) => {
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

	const aggregateCandidateLastSync = (locationId: number, employeeNo: string) => {
		// 本次 job 優先：以 warningsCount=0 作為唯一成功判準
		{
			const isCurrentLocationJob =
				activeSyncLocationId.value === locationId &&
				activeSyncJob.value?.status === "completed" &&
				Array.isArray(activeSyncJob.value.items)
			if (isCurrentLocationJob) {
				const warningsCount = activeSyncJob.value?.result?.warnings?.length ?? 0
				const at = activeSyncJob.value?.finishedAt ? formatAt(activeSyncJob.value.finishedAt) : null
				return { status: warningsCount === 0 ? "success" : "failed", at }
			}
		}

		const list = syncCandidatesByLocation[locationId] ?? []
		const cand = list.find((c) => String(c.employeeNo) === String(employeeNo))
		const s = cand?.lastSync
		// 第一次載入/尚未同步：不應顯示失敗（避免誤解），改為略過
		if (!s) return { status: "skipped", at: null }
		const statuses = [s.userInfo?.status, s.face?.status, s.card?.status, s.fingerprint?.status].filter(Boolean)
		const atCandidates = [s.userInfo?.at, s.face?.at, s.card?.at, s.fingerprint?.at]
			.map(formatAt)
			.filter(Boolean)
		const at = atCandidates.length ? atCandidates[0] : null
		// 收束判斷：只需要 success / failed / skipped
		// - failed：任一步驟 failed
		// - success：沒有 failed 且至少 userInfo success
		// - skipped：其他（含 never / partial / 尚未同步完整）
		// 已同步欄位只顯示 success / failed / skipped（避免第一次就顯示失敗）
		if (statuses.includes("failed")) return { status: "failed", at }
		if (s.userInfo?.status === "success") return { status: "success", at }
		return { status: "skipped", at }
	}

	const getCandidateLastSyncLabel = (locationId: number, employeeNo: string) => {
		const list = syncCandidatesByLocation[locationId] ?? []
		const cand = list.find((c) => String(c.employeeNo) === String(employeeNo))
		// 設備可能被手動重置/清空；未同步前不應顯示失敗，優先顯示待同步
		if (cand?.needsSync) return "待同步"
		if (!cand?.lastSync) return "待同步"
		const v = aggregateCandidateLastSync(locationId, employeeNo)
		if (v.status === "success") return "成功"
		return "失敗"
	}

	const getCandidateLastSyncTitle = (locationId: number, employeeNo: string) => {
		const list = syncCandidatesByLocation[locationId] ?? []
		const cand = list.find((c) => String(c.employeeNo) === String(employeeNo))
		const s = cand?.lastSync
		if (!s) return null
		const parts = [
			`人員: ${s.userInfo?.status || "—"}${s.userInfo?.at ? ` @ ${formatAt(s.userInfo.at)}` : ""}`,
			`圖片: ${s.face?.status || "—"}${s.face?.at ? ` @ ${formatAt(s.face.at)}` : ""}`,
			`卡片: ${s.card?.status || "—"}${s.card?.at ? ` @ ${formatAt(s.card.at)}` : ""}`,
			`指紋: ${s.fingerprint?.status || "—"}${s.fingerprint?.at ? ` @ ${formatAt(s.fingerprint.at)}` : ""}`,
		]
		return parts.join("\n")
	}

	const prefetchSyncSummaries = async () => {
		const ids = syncableLocations.value.map((x) => x.id)
		const concurrency = 3
		let idx = 0
		const worker = async () => {
			for (;;) {
				const i = idx++
				if (i >= ids.length) return
				const id = ids[i]
				if (Object.prototype.hasOwnProperty.call(syncCandidatesByLocation, id)) continue
				if (syncCandidatesLoading[id]) continue
				await ensureSyncCandidates(id)
			}
		}
		await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }).map(worker))
	}

	const isLocationCurrentlySyncing = (locationId: number) => isLocationSyncJobRunning(locationId)

	// ---------- 結果與警告（可收合） ----------
	const warningsLocationFilter = ref<string>("")
	const warningsQuery = ref<string>("")

	const warningsLocationFilterOptions = computed(() => {
		const opts = [{ value: "", label: "全部地點" }]
		const names = new Map<number, string>()
		for (const loc of syncableLocations.value || []) names.set(loc.id, `${loc.zone_name} - ${loc.name}`)
		for (const [id, name] of names.entries()) opts.push({ value: String(id), label: name })
		return opts
	})

	const filteredWarnings = computed(() => {
		const locId = warningsLocationFilter.value ? Number(warningsLocationFilter.value) : null
		const q = warningsQuery.value.trim().toLowerCase()
		return (syncWarnings.value || [])
			.filter((w) => {
				if (locId == null) return true
				const loc = syncableLocations.value.find((x) => x.id === locId)
				const label = loc ? `${loc.zone_name} - ${loc.name}` : null
				if (!label) return true
				return String(w.locationName || "").includes(loc.name)
			})
			.filter((w) => {
				if (!q) return true
				const parts = [w.employeeNo || "", w.message || "", w.type || ""].join(" ").toLowerCase()
				return parts.includes(q)
			})
	})

	const handleCopyWarnings = async () => {
		const lines = filteredWarnings.value.map((w) => {
			const parts = [
				w.locationName ? `[${w.locationName}]` : null,
				w.employeeNo ? `員工 ${w.employeeNo}` : null,
				syncWarningTypeLabel(w.type),
				w.message ? `- ${w.message}` : null,
			].filter(Boolean)
			return parts.join(" ")
		})
		const text = lines.join("\n")
		if (!text) return
		try {
			await navigator.clipboard.writeText(text)
			toast.success("已複製")
		} catch {
			toast.error("複製失敗（瀏覽器不支援）")
		}
	}

	const isLocationSyncButtonDisabled = (locationId: number) => {
		if (!canEdit.value) return true
		if (isSyncingAll.value) return true
		if (isPollingSyncJob.value && activeSyncLocationId.value === locationId) return true
		if (
			isPollingSyncJob.value &&
			activeSyncLocationId.value !== null &&
			activeSyncLocationId.value !== locationId
		)
			return true
		return false
	}

	const allLocationsProgressText = computed(() => {
		const j = activeSyncAllJob.value
		if (!j?.progress) return ""
		const t = j.progress.total ?? 0
		const c = j.progress.completed ?? 0
		const name = j.progress.currentLocationName
		const id = j.progress.currentLocationId
		if (j.status === "completed") return `已完成（共 ${c} 個地點）`
		if (t <= 0) return "準備中…"
		const cur = id != null && name ? `目前：${name}（#${id}）` : ""
		return `進度 ${c} / ${t} 個地點 ${cur}`.trim()
	})

	const pollSyncLocationJob = async (jobId: string) => {
		isPollingSyncJob.value = true
		const startedAt = Date.now()
		for (;;) {
			const job = await personnelApi.getSyncLocationJob(jobId)
			activeSyncJob.value = job
			if (job.status === "completed") {
				syncWarnings.value = job.result?.warnings ?? []
				// 同步完成後，重新抓候選人摘要（lastSync）避免 UI 維持舊的失敗/略過狀態
				if (activeSyncLocationId.value != null) {
					await ensureSyncCandidates(activeSyncLocationId.value)
				}
				break
			}
			if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試")
			await new Promise((r) => setTimeout(r, 800))
		}
		isPollingSyncJob.value = false
	}

	const syncOneLocation = async (locationId: number) => {
		activeSyncLocationId.value = locationId
		activeSyncAllJob.value = null
		activeSyncJob.value = null
		syncWarnings.value = []
		const exp = new Set(syncExpandedLocationIds.value)
		exp.add(locationId)
		syncExpandedLocationIds.value = exp
		await ensureSyncCandidates(locationId)
		try {
			const { jobId } = await personnelApi.startSyncLocationJob(locationId)
			await pollSyncLocationJob(jobId)
		} catch (err) {
			handleApiError(err, "同步失敗")
		} finally {
			isPollingSyncJob.value = false
		}
	}

	const syncAllLocations = async () => {
		isSyncingAll.value = true
		activeSyncLocationId.value = null
		activeSyncJob.value = null
		activeSyncAllJob.value = null
		syncWarnings.value = []
		try {
			const { jobId } = await personnelApi.syncAllLocations()
			const startedAt = Date.now()
			for (;;) {
				const job = await personnelApi.getSyncAllLocationsJob(jobId)
				activeSyncAllJob.value = job
				if (job.status === "completed") {
					if (job.error?.message) throw new Error(job.error.message)
					const result = job.result
					const allWarnings = (result?.results ?? []).flatMap((r) =>
						(r.warnings ?? []).map((w) => ({ ...w, locationName: r.locationName }))
					)
					syncWarnings.value = allWarnings
					break
				}
				if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試")
				await new Promise((r) => setTimeout(r, 1000))
			}
		} catch (err) {
			handleApiError(err, "同步全部失敗")
		} finally {
			isSyncingAll.value = false
		}
	}

	const loadSyncableLocations = async () => {
		isLoadingSyncable.value = true
		try {
			syncableLocations.value = await personnelApi.getSyncableLocations()
		} catch (err) {
			handleApiError(err, "載入可同步地點失敗")
			syncableLocations.value = []
		} finally {
			isLoadingSyncable.value = false
		}
	}

	watch(
		() => syncableLocations.value.map((x) => x.id).join(","),
		(v) => {
			if (!v) return
			void prefetchSyncSummaries()
		}
	)

	return {
		// sync tab state
		syncableLocations,
		isLoadingSyncable,
		isSyncingAll,
		activeSyncAllJob,
		activeSyncLocationId,
		activeSyncJob,
		isSingleLocationSyncing,
		allLocationsProgressText,

		// sync actions
		loadSyncableLocations,
		syncOneLocation,
		syncAllLocations,
		toggleSyncLocationExpand,
		ensureSyncCandidates,

		// sync ui helpers
		syncCandidatesByLocation,
		isSyncLocationExpanded,
		isSyncLocationCandidatesLoading,
		getLocationSummary,
		getSyncStepRowsForLocation,
		syncStepPillClass,
		syncStepShortLabel,
		getCandidateLastSyncLabel,
		getCandidateLastSyncTitle,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,

		// warnings
		syncWarnings,
		syncWarningTypeLabel,
		warningsLocationFilter,
		warningsQuery,
		warningsLocationFilterOptions,
		filteredWarnings,
		handleCopyWarnings,

		// location members panel
		LOCATION_MEMBERS_PAGE_SIZE,
		LOCATION_ADD_PAGE_SIZE,
		isLocationMembersPanelOpen,
		isLocationMembersLoading,
		isLocationMembersApplying,
		getLocationMembersError,
		getLocationMembersSuccess,
		getLocationMembersCount,
		getLocationMembersAll,
		getLocationMembersOffset,
		getLocationMembersPaged,
		getLocationMembersPageIndex,
		getLocationMembersTotalPages,
		canPrevLocationMembersPage,
		canNextLocationMembersPage,
		prevLocationMembersPage,
		nextLocationMembersPage,
		isLocationMemberKept,
		toggleKeepLocationMember,
		isLocationMemberAddSelected,
		toggleSelectAddLocationMember,
		isLocationAddLoading,
		getLocationAddError,
		getLocationAddTotal,
		getLocationAddOffset,
		getLocationAddItems,
		setLocationAddOffset,
		loadLocationAddCandidates,
		toggleLocationMembersPanel,
		applyLocationMembers,
		reloadLocationMembers,
	}
}

