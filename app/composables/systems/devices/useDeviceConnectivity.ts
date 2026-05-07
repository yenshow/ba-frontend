import { computed, ref, watch, type Ref } from "vue"
import type { DeviceConnectivityStatus } from "~/types/device"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"

type DeviceConnectivitySnapshotItem = { device_id: number; status: DeviceConnectivityStatus }

const toSortedUniqueIds = (ids: number[]) => {
	return [...new Set(ids.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b)
}

export const useDeviceConnectivity = (options?: { debounceMs?: number }) => {
	const debounceMs = Math.max(0, Number(options?.debounceMs ?? 150))

	const deviceApi = useDeviceApi()

	const connectivityByDeviceId = ref<Record<number, DeviceConnectivityStatus>>({})
	const isLoadingByDeviceId = ref<Record<number, boolean>>({})

	const labels = computed<Record<DeviceConnectivityStatus, string>>(() => ({
		online: "線上",
		offline: "離線",
	}))

	const getBadgeClass = (status: DeviceConnectivityStatus) => {
		const classes: Record<DeviceConnectivityStatus, string> = {
			online: "bg-sky-500/20 text-sky-200",
			offline: "bg-zinc-500/20 text-zinc-200",
		}
		return classes[status] || classes.offline
	}

	const getStatus = (deviceId: number): DeviceConnectivityStatus => {
		return connectivityByDeviceId.value[deviceId] || "offline"
	}

	const isLoading = (deviceId: number) => Boolean(isLoadingByDeviceId.value[deviceId])

	const applySnapshot = (items: DeviceConnectivitySnapshotItem[]) => {
		const next = { ...connectivityByDeviceId.value }
		const nextLoading = { ...isLoadingByDeviceId.value }
		;(items || []).forEach((it) => {
			if (!it?.device_id) return
			next[it.device_id] = it.status === "online" ? "online" : "offline"
			nextLoading[it.device_id] = false
		})
		connectivityByDeviceId.value = next
		isLoadingByDeviceId.value = nextLoading
	}

	const refresh = async (rawIds: number[]) => {
		const ids = toSortedUniqueIds(rawIds || [])
		if (ids.length === 0) return

		// loading（由 UI 顯示讀取中）
		const nextLoading = { ...isLoadingByDeviceId.value }
		ids.forEach((id) => {
			if (!connectivityByDeviceId.value[id]) nextLoading[id] = true
		})
		isLoadingByDeviceId.value = nextLoading

		try {
			const res = await deviceApi.getDeviceConnectivity({ device_ids: ids })
			applySnapshot(res.items || [])

			// 保底：沒有回到的 id 視為離線，避免卡住 loading
			const next = { ...connectivityByDeviceId.value }
			const finalLoading = { ...isLoadingByDeviceId.value }
			ids.forEach((id) => {
				if (!next[id]) next[id] = "offline"
				finalLoading[id] = false
			})
			connectivityByDeviceId.value = next
			isLoadingByDeviceId.value = finalLoading
		} catch {
			// API 失敗：當前批次全部視為離線並結束 loading
			const next = { ...connectivityByDeviceId.value }
			const finalLoading = { ...isLoadingByDeviceId.value }
			ids.forEach((id) => {
				if (!next[id]) next[id] = "offline"
				finalLoading[id] = false
			})
			connectivityByDeviceId.value = next
			isLoadingByDeviceId.value = finalLoading
		}
	}

	let debounceTimer: ReturnType<typeof setTimeout> | null = null
	const refreshDebounced = (ids: number[]) => {
		if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => void refresh(ids), debounceMs)
	}

	const bindDeviceIds = (deviceIds: Ref<number[]>) => {
		watch(
			() => toSortedUniqueIds(deviceIds.value || []).join(","),
			() => refreshDebounced(deviceIds.value || []),
			{ immediate: true }
		)
	}

	const reset = () => {
		connectivityByDeviceId.value = {}
		isLoadingByDeviceId.value = {}
	}

	const removeDevice = (deviceId: number) => {
		const next = { ...connectivityByDeviceId.value }
		delete next[deviceId]
		connectivityByDeviceId.value = next

		const nextLoading = { ...isLoadingByDeviceId.value }
		delete nextLoading[deviceId]
		isLoadingByDeviceId.value = nextLoading
	}

	const applyWsStatus = (deviceId: number, status: "online" | "offline") => {
		const next = { ...connectivityByDeviceId.value }
		next[deviceId] = status
		connectivityByDeviceId.value = next

		const nextLoading = { ...isLoadingByDeviceId.value }
		nextLoading[deviceId] = false
		isLoadingByDeviceId.value = nextLoading
	}

	return {
		labels,
		getBadgeClass,
		getStatus,
		isLoading,
		refresh,
		refreshDebounced,
		bindDeviceIds,
		reset,
		removeDevice,
		applyWsStatus,
	}
}

