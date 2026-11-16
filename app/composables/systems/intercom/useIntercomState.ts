/**
 * 對講系統狀態管理：集中監控頁資料載入、事件刷新與振鈴
 */
import { computed, ref, watch } from "vue"
import { useIntercomApi } from "~/composables/systems/intercom/useIntercomApi"
import { useIntercomLocationApi } from "~/composables/location/api/useIntercomLocationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { normalizeIntercomSiteZones } from "~/utils/intercom"
import type {
	IntercomLog,
	IntercomMainStation,
	IntercomSiteZone,
	IntercomZone,
} from "~/types/intercom"

export const useIntercomState = () => {
	const accessApi = useIntercomApi()
	const locationApi = useIntercomLocationApi()
	const { handleError } = useErrorHandler()
	const toast = useToast()

	const sitesZones = ref<IntercomSiteZone[]>([])
	const mainStations = ref<IntercomMainStation[]>([])
	const selectedZoneId = ref<number | null>(null)
	const events = ref<IntercomLog[]>([])
	const zones = ref<IntercomZone[]>([])
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
		sitesZones.value = normalizeIntercomSiteZones(sites.zones || [])
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
