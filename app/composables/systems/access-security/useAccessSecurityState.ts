/**
 * 門禁保全狀態管理：集中監控頁資料載入、事件刷新與振鈴
 */
import { computed, ref, watch } from "vue"
import { useAccessSecurityApi } from "~/composables/systems/access-security/useAccessSecurityApi"
import { useAccessSecurityLocationApi } from "~/composables/location/api/useAccessSecurityLocationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { normalizeAccessSecuritySiteZones } from "~/utils/accessSecurity"
import type {
	AccessSecurityIntercomLog,
	AccessSecurityMainStation,
	AccessSecuritySiteZone,
	AccessSecurityZone,
} from "~/types/accessSecurity"

export const useAccessSecurityState = () => {
	const accessApi = useAccessSecurityApi()
	const locationApi = useAccessSecurityLocationApi()
	const { handleError } = useErrorHandler()
	const toast = useToast()

	const sitesZones = ref<AccessSecuritySiteZone[]>([])
	const mainStations = ref<AccessSecurityMainStation[]>([])
	const selectedZoneId = ref<number | null>(null)
	const events = ref<AccessSecurityIntercomLog[]>([])
	const zones = ref<AccessSecurityZone[]>([])
	const ringingLocationId = ref<number | null>(null)

	const selectedZone = computed(() => {
		if (selectedZoneId.value == null) return null
		return sitesZones.value.find((z) => z.id === selectedZoneId.value) ?? null
	})
	const zoneLocations = computed(() => selectedZone.value?.locations || [])
	const detailEmpty = computed(() => !selectedZone.value)
	const zoneMainStation = computed(() => {
		const boundId = selectedZone.value?.manageDeviceId
		if (boundId == null || boundId <= 0) return null
		return mainStations.value.find((st) => st.deviceId === boundId) ?? null
	})

	const loadSites = async () => {
		const [sites, stations] = await Promise.all([
			accessApi.getSites(),
			accessApi.getMainStations(),
		])
		sitesZones.value = normalizeAccessSecuritySiteZones(sites.zones || [])
		mainStations.value = stations.stations || []
		if (!sitesZones.value.some((z) => z.id === selectedZoneId.value)) {
			selectedZoneId.value = sitesZones.value[0]?.id ?? null
		}
	}

	const loadZonesForDialog = async () => {
		const result = await locationApi.getZones()
		zones.value = result.zones || []
	}

	const loadEvents = async () => {
		if (selectedZoneId.value == null) {
			events.value = []
			return
		}
		const res = await accessApi.getZoneLogsLatest(selectedZoneId.value)
		events.value = res.logs || []
	}

	const refreshAfterZoneChange = async () => {
		await Promise.all([loadZonesForDialog(), loadSites()])
	}

	const initPage = async () => {
		await loadSites()
		await loadEvents()
	}

	const handleRing = async (locationId: number) => {
		ringingLocationId.value = locationId
		try {
			const res = await accessApi.ringLocation(locationId)
			if (res.invite?.played) {
				toast.success("已播放語音廣播")
			} else if (res.invite?.ok) {
				toast.success("已送出振鈴（室內機未接聽）")
			} else {
				toast.warning(`廣播結果：${res.invite?.result || "未知"}`)
			}
			await loadEvents()
		} catch (error) {
			handleError(error, "語音廣播失敗")
		} finally {
			ringingLocationId.value = null
		}
	}

	const setupOperationalEventListener = () => {
		const { $socket } = useNuxtApp() as { $socket?: { on?: Function; off?: Function } }
		const handler = (payload: { event_kind?: string }) => {
			if (payload?.event_kind === "intercom") void loadEvents()
		}
		$socket?.on?.("operational-event:new", handler)
		return () => $socket?.off?.("operational-event:new", handler)
	}

	watch(selectedZoneId, () => {
		void loadEvents()
	})

	return {
		sitesZones,
		mainStations,
		selectedZoneId,
		events,
		zones,
		ringingLocationId,
		selectedZone,
		zoneLocations,
		detailEmpty,
		zoneMainStation,
		loadSites,
		loadZonesForDialog,
		loadEvents,
		refreshAfterZoneChange,
		initPage,
		handleRing,
		setupOperationalEventListener,
	}
}
