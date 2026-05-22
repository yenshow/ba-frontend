import type { Ref } from "vue"
import type {
	SyncableLocation,
} from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import {
	SYNC_WARNING_LABELS,
	buildOverallSyncTitle,
	getOverallSyncDisplayLabel,
	resolveOverallSyncStatus,
} from "~/utils/personnelUtils"
import { usePersonnelSyncEngine } from "~/composables/systems/personnel/usePersonnelSyncEngine"
import {
	clampOffset,
	fetchAllPersonnelCandidates,
	getNextOffset,
	getPrevOffset,
} from "~/composables/systems/personnel/personnelList"
import type { Person } from "~/types/personnel"

type LocationId = number

export const usePersonnelSyncTab = (params: {
	personnelApi: PersonnelApi
	locationApi: ReturnType<typeof useLocationApi>
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canEdit: Ref<boolean>
}) => {
	const { personnelApi, locationApi, toast, handleApiError, canEdit } = params

	const syncableLocations = ref<SyncableLocation[]>([])
	const isLoadingSyncable = ref(false)
	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type

	// ---------- 地點對應門禁設備（顯示用） ----------
	const syncDevicesByLocationId = reactive<Record<number, { entry: string[]; exit: string[] }>>({})

	const loadLocationSyncDevicesLabels = async () => {
		try {
			const res = await locationApi.getPeopleCountingSyncableLocationsWithDevices()
			const list = Array.isArray(res?.locations) ? res.locations : []
			for (const loc of list) {
				const id = Number(loc.id)
				if (!Number.isFinite(id)) continue
				const entry = Array.isArray(loc.entry_devices)
					? loc.entry_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
					: []
				const exit = Array.isArray(loc.exit_devices)
					? loc.exit_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
					: []
				syncDevicesByLocationId[Math.trunc(id)] = { entry, exit }
			}
		} catch {
			// fallback：忽略錯誤，顯示為「—」
		}
	}

	const getLocationDevicesLabel = (locationId: number) => {
		const v = syncDevicesByLocationId[locationId] || { entry: [], exit: [] }
		return {
			entry: Array.isArray(v.entry) ? v.entry : [],
			exit: Array.isArray(v.exit) ? v.exit : [],
		}
	}

	// ---------- 同步（各地點展開：人員列 + UserInfo／圖片／卡片／指紋） ----------
	const syncExpandedLocationIds = ref<Set<number>>(new Set())
	const SYNC_CANDIDATES_PAGE_SIZE = 10
	const syncCandidatesOffsetByLocation = reactive<Record<number, number>>({})

	const isSyncLocationExpanded = (locationId: number) =>
		syncExpandedLocationIds.value.has(locationId)
	const syncEngine = usePersonnelSyncEngine({
		personnelApi,
		toast,
		handleApiError,
		canEdit,
		syncableLocations,
	})
	const {
		syncCandidatesByLocation,
		isSyncCandidatesLoading,
		ensureSyncCandidates,
		isSyncingAll,
		syncWarnings,
		showWarningsDialog,
		openWarningsDialog,
		activeSyncAllJob,
		activeSyncLocationId,
		activeSyncJob,
		isPollingSyncJob,
		activeSyncJobTailItems,
		lastCompletedSyncByLocationId,
		syncOneLocation,
		syncAllLocations,
		getLocationLabel,
		getWarningsForLocation,
		isLocationSyncJobRunning,
		getSyncStepRowsForLocation,
		syncStepPillClass,
		syncStepShortLabel,
	} = syncEngine

	const isSingleLocationSyncing = computed(() => isPollingSyncJob.value)

	// ---------- 地點成員管理（門禁名單；SSOT: person_location_access） ----------
	const locationMembersLoading = reactive<Record<LocationId, boolean>>({})
	const locationMembersApplying = reactive<Record<LocationId, boolean>>({})
	const locationMembersError = reactive<Record<LocationId, string | null>>({})
	const locationMembersSuccess = reactive<Record<LocationId, string | null>>({})
	const locationMembersKeptIds = reactive<Record<LocationId, number[]>>({})

	const locationCandidatesLoading = reactive<Record<LocationId, boolean>>({})
	const locationCandidatesError = reactive<Record<LocationId, string | null>>({})
	const locationCandidatesItems = reactive<Record<LocationId, Person[]>>({})
	const locationCandidatesQuery = reactive<Record<LocationId, string>>({})

	const isLocationMembersLoading = (locationId: number) => Boolean(locationMembersLoading[locationId])
	const isLocationMembersApplying = (locationId: number) => Boolean(locationMembersApplying[locationId])
	const getLocationMembersError = (locationId: number) => (locationMembersError[locationId] || "").trim() || null
	const getLocationMembersSuccess = (locationId: number) =>
		(locationMembersSuccess[locationId] || "").trim() || null

	const getLocationMemberKeptIds = (locationId: number) => locationMembersKeptIds[locationId] ?? []
	const getLocationMembersSelectedCount = (locationId: number) => getLocationMemberKeptIds(locationId).length
	const isLocationMemberKept = (locationId: number, personId: number) =>
		getLocationMemberKeptIds(locationId).includes(personId)

	const clearLocationMemberKeptIds = (locationId: number) => {
		locationMembersKeptIds[locationId] = []
	}

	const toggleManyLocationMembers = (locationId: number, personIds: number[], checked: boolean) => {
		const current = getLocationMemberKeptIds(locationId)
		const set = new Set(current)
		for (const id of personIds || []) {
			const n = Number(id)
			if (!Number.isFinite(n)) continue
			if (checked) set.add(Math.trunc(n))
			else set.delete(Math.trunc(n))
		}
		locationMembersKeptIds[locationId] = Array.from(set)
	}

	const toggleKeepLocationMember = (locationId: number, personId: number, e: Event) => {
		const checked = (e.target as HTMLInputElement | null)?.checked ?? false
		const current = getLocationMemberKeptIds(locationId)
		const set = new Set(current)
		if (checked) set.add(personId)
		else set.delete(personId)
		locationMembersKeptIds[locationId] = Array.from(set)
	}

	const isLocationCandidatesLoading = (locationId: number) => Boolean(locationCandidatesLoading[locationId])
	const getLocationCandidatesError = (locationId: number) =>
		(locationCandidatesError[locationId] || "").trim() || null
	const getLocationCandidatesItems = (locationId: number) => locationCandidatesItems[locationId] ?? []
	const getLocationCandidatesQuery = (locationId: number) => (locationCandidatesQuery[locationId] || "").trim()
	const setLocationCandidatesQuery = (locationId: number, next: string) => {
		locationCandidatesQuery[locationId] = String(next || "")
	}

	const loadLocationCandidates = async (locationId: number) => {
		locationCandidatesError[locationId] = null
		locationCandidatesLoading[locationId] = true
		try {
			const all = await fetchAllPersonnelCandidates({
				personnelApi,
				query: getLocationCandidatesQuery(locationId),
			})
			locationCandidatesItems[locationId] = Array.isArray(all) ? all : []
		} catch (err) {
			locationCandidatesItems[locationId] = []
			locationCandidatesError[locationId] = err instanceof Error ? err.message : "載入人員失敗"
		} finally {
			locationCandidatesLoading[locationId] = false
		}
	}

	const loadAllLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersLoading[locationId] = true
		try {
			const res = await personnelApi.getLocationMemberIds(locationId)
			const ids = Array.isArray(res?.ids) ? res.ids : []
			locationMembersKeptIds[locationId] = ids
			locationCandidatesQuery[locationId] = locationCandidatesQuery[locationId] ?? ""
			await loadLocationCandidates(locationId)
		} catch (err) {
			locationMembersKeptIds[locationId] = []
			locationMembersError[locationId] = err instanceof Error ? err.message : "載入門禁名單失敗"
		} finally {
			locationMembersLoading[locationId] = false
		}
	}

	const reloadLocationMembers = async (locationId: number) => {
		await loadAllLocationMembers(locationId)
		await ensureSyncCandidates(locationId)
	}

	const applyLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersApplying[locationId] = true
		try {
			const kept = getLocationMemberKeptIds(locationId)
			const next = Array.from(new Set((kept || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))).map(
				(x) => Math.trunc(x)
			)
			await personnelApi.replaceLocationMembers(locationId, next)
			locationMembersSuccess[locationId] = "已套用變更"
			await reloadLocationMembers(locationId)
		} catch (err) {
			locationMembersError[locationId] = err instanceof Error ? err.message : "套用失敗"
			handleApiError(err, "套用失敗")
		} finally {
			locationMembersApplying[locationId] = false
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

	const isSyncLocationCandidatesLoading = (locationId: number) =>
		isSyncCandidatesLoading(locationId)

	const getLocationSummary = (
		locationId: number
	): { people: string; face: string; card: string; fingerprint: string } => {
		const loading = isSyncLocationCandidatesLoading(locationId)
		const list = syncCandidatesByLocation[locationId]
		if (!Array.isArray(list)) {
			if (loading) return { people: "…", face: "…", card: "…", fingerprint: "…" }
			return { people: "—", face: "—", card: "—", fingerprint: "—" }
		}
		const people = list.length
		const face = list.filter((p) => p.has_face).length
		const card = list.filter((p) => p.has_card).length
		const fingerprint = list.filter((p) => Number(p.fingerprint_count) > 0).length
		return {
			people: String(people),
			face: String(face),
			card: String(card),
			fingerprint: String(fingerprint),
		}
	}

	const getSyncOffset = (locationId: number) =>
		Math.max(0, Math.trunc(Number(syncCandidatesOffsetByLocation[locationId] ?? 0)))
	const setSyncOffset = (locationId: number, nextOffset: number) => {
		const total = (syncCandidatesByLocation[locationId] ?? []).length
		syncCandidatesOffsetByLocation[locationId] = clampOffset({
			offset: nextOffset,
			total,
			limit: SYNC_CANDIDATES_PAGE_SIZE,
		})
	}
	const goPrevSyncPage = (locationId: number) => {
		setSyncOffset(locationId, getPrevOffset({ offset: getSyncOffset(locationId), limit: SYNC_CANDIDATES_PAGE_SIZE }))
	}
	const goNextSyncPage = (locationId: number) => {
		const total = (syncCandidatesByLocation[locationId] ?? []).length
		setSyncOffset(
			locationId,
			getNextOffset({ offset: getSyncOffset(locationId), total, limit: SYNC_CANDIDATES_PAGE_SIZE })
		)
	}
	const getPagedSyncStepRowsForLocation = (locationId: number) => {
		const all = getSyncStepRowsForLocation(locationId)
		const total = all.length
		const limit = SYNC_CANDIDATES_PAGE_SIZE
		const offset = clampOffset({ offset: getSyncOffset(locationId), total, limit })
		const rows = all.slice(offset, offset + limit)
		return { rows, total, offset, limit }
	}

	// syncStepShortLabel / syncStepPillClass 由 sync engine 提供

	const findSyncCandidate = (locationId: number, employeeNo: string) => {
		const list = Object.prototype.hasOwnProperty.call(syncCandidatesByLocation, locationId)
			? (syncCandidatesByLocation[locationId] ?? [])
			: []
		return list.find((c) => String(c.employee_no) === String(employeeNo)) ?? null
	}

	const getCandidateLastSyncLabel = (locationId: number, employeeNo: string) => {
		const cand = findSyncCandidate(locationId, employeeNo)
		const resolved = resolveOverallSyncStatus({
			employeeNo,
			candidate: cand,
			warnings: getWarningsForLocation(locationId),
			locationId,
			activeSyncLocationId: activeSyncLocationId.value,
			activeSyncJobStatus: activeSyncJob.value?.status ?? null,
			activeSyncJobFinishedAt: activeSyncJob.value?.finishedAt,
			lastCompletedCache: lastCompletedSyncByLocationId[locationId],
		})
		return getOverallSyncDisplayLabel(resolved, cand)
	}

	const getCandidateLastSyncTitle = (locationId: number, employeeNo: string) =>
		buildOverallSyncTitle(findSyncCandidate(locationId, employeeNo))

	const isLocationCurrentlySyncing = (locationId: number) => isLocationSyncJobRunning(locationId)

	// ---------- 結果與警告（dialog） ----------

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

	const syncOneLocationAndExpand = async (locationId: number) => {
		const exp = new Set(syncExpandedLocationIds.value)
		exp.add(locationId)
		syncExpandedLocationIds.value = exp
		await syncOneLocation(locationId)
	}

	const loadSyncableLocations = async () => {
		isLoadingSyncable.value = true
		try {
			syncableLocations.value = await personnelApi.getSyncableLocations()
			// 不預設全展開，避免初次載入就大量抓取 sync-candidates（效能）
			syncExpandedLocationIds.value = new Set()
			// 顯示設備名稱用：後端一次回傳（避免 /api/locations/:id N 次）
			await loadLocationSyncDevicesLabels()
		} catch (err) {
			handleApiError(err, "載入可同步地點失敗")
			syncableLocations.value = []
			syncExpandedLocationIds.value = new Set()
		} finally {
			isLoadingSyncable.value = false
		}
	}

	// 不再在載入地點後全量 prefetch（由使用者展開地點時再載入）

	return {
		// sync tab state
		syncableLocations,
		isLoadingSyncable,
		isSyncingAll,
		showWarningsDialog,
		activeSyncAllJob,
		activeSyncLocationId,
		activeSyncJob,
		isSingleLocationSyncing,
		allLocationsProgressText,

		// sync actions
		loadSyncableLocations,
		syncOneLocation: syncOneLocationAndExpand,
		syncAllLocations,
		toggleSyncLocationExpand,
		ensureSyncCandidates,

		// sync ui helpers
		syncCandidatesByLocation,
		SYNC_CANDIDATES_PAGE_SIZE,
		isSyncLocationExpanded,
		isSyncLocationCandidatesLoading,
		getLocationDevicesLabel,
		getSyncStepRowsForLocation,
		getPagedSyncStepRowsForLocation,
		syncStepPillClass,
		syncStepShortLabel,
		getCandidateLastSyncLabel,
		getCandidateLastSyncTitle,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,
		goPrevSyncPage,
		goNextSyncPage,

		// warnings
		syncWarnings,
		syncWarningTypeLabel,
		openWarningsDialog,

		// location members panel
		isLocationMembersLoading,
		isLocationMembersApplying,
		getLocationMembersError,
		getLocationMembersSuccess,
		getLocationMembersSelectedCount,
		isLocationMemberKept,
		toggleManyLocationMembers,
		toggleKeepLocationMember,
		getLocationMemberKeptIds,
		clearLocationMemberKeptIds,
		isLocationCandidatesLoading,
		getLocationCandidatesError,
		getLocationCandidatesItems,
		getLocationCandidatesQuery,
		setLocationCandidatesQuery,
		loadLocationCandidates,
		applyLocationMembers,
		reloadLocationMembers,
	}
}
