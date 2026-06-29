/**
 * 環境即時讀數（方案 B）：快照 state、WS 訂閱、監控頁、首頁卡片。
 * 純函式與常數見 ~/utils/environmentLive.ts
 */
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { useWebSocketEventSubscription } from "~/composables/websocket/useWebSocket"
import type { EnvironmentReadingNewEvent } from "~/types/websocket"
import {
	buildBootstrapSnapshot,
	createEmptyEnvironmentSnapshot,
	createEmptySensorReadings,
	fillSensorReadingsFromValues,
	isEnvironmentSnapshotLive,
	mergeEnvironmentSnapshot,
	parseEnvironmentReadingEvent,
	type EnvironmentLocationSnapshot,
	type EnvironmentSensorReadings,
} from "~/utils/environmentLive"
import type { EnvironmentLocation, EnvironmentZone } from "~/types/environment"
import { getLocationDeviceIds } from "~/utils/sensorUtils"

const SNAPSHOTS_STATE_KEY = "environment-live-snapshots"

const useLiveSnapshots = () => {
	const snapshotsByLocationId = useState<Record<string, EnvironmentLocationSnapshot>>(
		SNAPSHOTS_STATE_KEY,
		() => ({})
	)

	const getSnapshot = (dbLocationId: string) => snapshotsByLocationId.value[dbLocationId] ?? null

	const setSnapshot = (dbLocationId: string, snapshot: EnvironmentLocationSnapshot) => {
		snapshotsByLocationId.value = { ...snapshotsByLocationId.value, [dbLocationId]: snapshot }
	}

	const applyReadingEvent = (event: EnvironmentReadingNewEvent) => {
		const dbLocationId = String(event.locationId)
		const prev = getSnapshot(dbLocationId) ?? createEmptyEnvironmentSnapshot()
		setSnapshot(dbLocationId, mergeEnvironmentSnapshot(prev, parseEnvironmentReadingEvent(event)))
	}

	const isLocationLive = (dbLocationId: string, deviceIds: number[]) =>
		isEnvironmentSnapshotLive(getSnapshot(dbLocationId), deviceIds)

	const environmentApi = useEnvironmentApi()

	const bootstrapLocationFromApi = async (
		dbLocationId: string,
		deviceIds: number[],
		force = false
	) => {
		if (deviceIds.length === 0) return false
		if (!force && isLocationLive(dbLocationId, deviceIds)) {
			return true
		}
		try {
			const { readings } = await environmentApi.getReadings(dbLocationId, { limit: 1, order: "desc" })
			const latest = readings?.[0]
			if (!latest?.timestamp || !latest.data) return false
			const snapshot = buildBootstrapSnapshot({
				deviceIds,
				timestamp: latest.timestamp,
				data: latest.data as Record<string, unknown>,
			})
			if (!snapshot) return false
			setSnapshot(dbLocationId, snapshot)
			return true
		} catch {
			return false
		}
	}

	return {
		getSnapshot,
		applyReadingEvent,
		isLocationLive,
		bootstrapLocationFromApi,
	}
}

/** 訂閱 environment:reading:new；卸載時自動 off */
export const useEnvironmentReadingSubscription = (handler: (event: EnvironmentReadingNewEvent) => void) => {
	useWebSocketEventSubscription("environment:reading:new", handler as (...args: unknown[]) => void)
}

// --- 首頁 AQI / 環境卡片 ---

export type HomeSensorReadings = EnvironmentSensorReadings
export const createEmptyHomeSensorReadings = createEmptySensorReadings

export type EnvironmentHomeSensorCard = {
	uiLocationId: Ref<string>
	getDbLocationId: (uiLocationId: string) => string | null
	getDeviceIds: (uiLocationId: string) => number[]
	sensorData: EnvironmentSensorReadings
	isOffline: Ref<boolean>
	isFetching: Ref<boolean>
}

export const useEnvironmentHomeSensors = () => {
	const snapshots = useLiveSnapshots()

	const syncCard = (card: EnvironmentHomeSensorCard) => {
		const dbId = card.getDbLocationId(card.uiLocationId.value)
		if (!dbId) {
			fillSensorReadingsFromValues(card.sensorData, {})
			card.isOffline.value = true
			return
		}
		const live = snapshots.isLocationLive(dbId, card.getDeviceIds(card.uiLocationId.value))
		card.isOffline.value = !live
		if (!live) {
			fillSensorReadingsFromValues(card.sensorData, {})
			return
		}
		fillSensorReadingsFromValues(card.sensorData, snapshots.getSnapshot(dbId)?.data ?? {})
	}

	const bootstrapCard = async (card: EnvironmentHomeSensorCard) => {
		const dbId = card.getDbLocationId(card.uiLocationId.value)
		if (!dbId) return
		const deviceIds = card.getDeviceIds(card.uiLocationId.value)
		if (deviceIds.length === 0) return
		card.isFetching.value = true
		try {
			await snapshots.bootstrapLocationFromApi(dbId, deviceIds)
			syncCard(card)
		} finally {
			card.isFetching.value = false
		}
	}

	const handleReadingEvent = (event: EnvironmentReadingNewEvent, cards: EnvironmentHomeSensorCard[]) => {
		snapshots.applyReadingEvent(event)
		const dbId = String(event.locationId)
		for (const card of cards) {
			if (card.getDbLocationId(card.uiLocationId.value) === dbId) syncCard(card)
		}
	}

	return {
		syncCard,
		bootstrapCard,
		handleReadingEvent,
		syncCards: (cards: EnvironmentHomeSensorCard[]) => cards.forEach(syncCard),
	}
}

// --- 環境監控頁 ---

export type SensorReadings = EnvironmentSensorReadings

export type EnvironmentSensorsOptions = {
	environmentZones: Ref<EnvironmentZone[]>
	selectedLocationId: Ref<string>
	currentLocationData: ComputedRef<EnvironmentLocation | null>
	getLocationId: (location: EnvironmentLocation) => string
}

export const useEnvironmentSensors = (options: EnvironmentSensorsOptions) => {
	const snapshots = useLiveSnapshots()
	const sensorData = reactive<EnvironmentSensorReadings>(createEmptySensorReadings())
	const allLocationsSensorData = ref<Map<string, EnvironmentSensorReadings>>(new Map())

	const locationMapKeys = (location: EnvironmentLocation) =>
		[location.id != null ? String(location.id) : "", options.getLocationId(location)].filter(Boolean)

	const isCurrentLocation = (location: EnvironmentLocation) => {
		const current = options.currentLocationData.value
		return (
			!!current &&
			(current.id === location.id || options.getLocationId(current) === options.getLocationId(location))
		)
	}

	const isLocationOffline = (location: EnvironmentLocation) => {
		if (location.id == null) return true
		const deviceIds = getLocationDeviceIds(location)
		return deviceIds.length === 0 || !snapshots.isLocationLive(String(location.id), deviceIds)
	}

	const isSensorOffline = computed(() => {
		const location = options.currentLocationData.value
		return !location || isLocationOffline(location)
	})

	const findLocationByDbId = (dbLocationId: string) => {
		for (const zone of options.environmentZones.value) {
			const found = zone.locations.find((loc) => loc.id != null && String(loc.id) === dbLocationId)
			if (found) return found
		}
		return null
	}

	const writeLocationReadings = (location: EnvironmentLocation, readings: EnvironmentSensorReadings) => {
		for (const key of locationMapKeys(location)) {
			allLocationsSensorData.value.set(key, { ...readings })
		}
		if (isCurrentLocation(location)) Object.assign(sensorData, readings)
	}

	const syncLocationFromSnapshot = (location: EnvironmentLocation) => {
		if (location.id == null) return
		const dbId = String(location.id)
		const deviceIds = getLocationDeviceIds(location)

		if (!snapshots.isLocationLive(dbId, deviceIds)) {
			writeLocationReadings(location, createEmptySensorReadings())
			return
		}

		const next = createEmptySensorReadings()
		const snapshotData = snapshots.getSnapshot(dbId)?.data ?? {}
		for (const param of location.parameters.filter((p) => p.enabled)) {
			const value = snapshotData[param.type]
			next[param.type] = typeof value === "number" && Number.isFinite(value) ? value : null
		}
		writeLocationReadings(location, next)
	}

	const syncAllLocationsFromSnapshots = () => {
		for (const zone of options.environmentZones.value) {
			for (const location of zone.locations) {
				if (getLocationDeviceIds(location).length > 0) syncLocationFromSnapshot(location)
			}
		}
	}

	const handleReadingEvent = (event: EnvironmentReadingNewEvent) => {
		snapshots.applyReadingEvent(event)
		const location = findLocationByDbId(String(event.locationId))
		if (location) syncLocationFromSnapshot(location)
	}

	const getLocationSensorData = (locationId: string | number | undefined) => {
		if (locationId == null || locationId === "") return null
		const idStr = String(locationId)
		const cached = allLocationsSensorData.value.get(idStr)
		if (cached) return cached

		for (const zone of options.environmentZones.value) {
			for (const location of zone.locations) {
				const dbId = location.id != null ? String(location.id) : ""
				const uiId = options.getLocationId(location)
				if (dbId === idStr || uiId === idStr) {
					return allLocationsSensorData.value.get(dbId) ?? allLocationsSensorData.value.get(uiId) ?? null
				}
			}
		}
		return null
	}

	const bootstrapLocation = async (location: EnvironmentLocation, force = false) => {
		if (location.id == null || getLocationDeviceIds(location).length === 0) return
		await snapshots.bootstrapLocationFromApi(
			String(location.id),
			getLocationDeviceIds(location),
			force
		)
		syncLocationFromSnapshot(location)
	}

	const bootstrapAllLocations = async (force = false) => {
		await Promise.allSettled(
			options.environmentZones.value.flatMap((zone) =>
				zone.locations
					.filter((loc) => getLocationDeviceIds(loc).length > 0)
					.map((loc) => bootstrapLocation(loc, force))
			)
		)
	}

	const reconcileStaleLocations = async () => {
		const staleLocations = options.environmentZones.value.flatMap((zone) =>
			zone.locations.filter((loc) => {
				if (loc.id == null || getLocationDeviceIds(loc).length === 0) return false
				return !snapshots.isLocationLive(String(loc.id), getLocationDeviceIds(loc))
			})
		)
		if (staleLocations.length === 0) return
		await Promise.allSettled(
			staleLocations.map((loc) => bootstrapLocation(loc, true))
		)
	}

	watch(
		() => options.selectedLocationId.value,
		async () => {
			const location = options.currentLocationData.value
			if (!location) {
				Object.assign(sensorData, createEmptySensorReadings())
				return
			}
			const dbId = location.id != null ? String(location.id) : ""
			const deviceIds = getLocationDeviceIds(location)
			if (
				dbId &&
				deviceIds.length > 0 &&
				!snapshots.isLocationLive(dbId, deviceIds)
			) {
				await bootstrapLocation(location, true)
			} else {
				syncLocationFromSnapshot(location)
			}
		}
	)

	return {
		sensorData,
		allLocationsSensorData,
		getLocationSensorData,
		isSensorOffline,
		isLocationOffline,
		handleReadingEvent,
		syncAllLocationsFromSnapshots,
		bootstrapAllLocations,
		reconcileStaleLocations,
		bootstrapLocation,
	}
}
