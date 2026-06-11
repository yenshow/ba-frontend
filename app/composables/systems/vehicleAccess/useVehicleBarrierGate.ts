import type { MaybeRefOrGetter } from "vue"
import { computed, onScopeDispose, ref, toValue } from "vue"
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess"
import { useVehicleAccessIsapiDeviceApi } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiDeviceApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"

const CONTROL_COOLDOWN_MS = 1500

/** ISAPI 單台攝影機道閘：送控制指令（設備不提供可靠狀態查詢） */
export const useVehicleBarrierGate = (options: {
	location: MaybeRefOrGetter<VehicleAccessLocation | null>
	deviceId: MaybeRefOrGetter<number | null>
	cooldownMs?: number
}) => {
	const isapiApi = useVehicleAccessIsapiDeviceApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const isControlling = ref(false)
	const isCooldown = ref(false)
	let cooldownTimer: ReturnType<typeof setTimeout> | null = null
	const cooldownMs = options.cooldownMs ?? CONTROL_COOLDOWN_MS

	const location = computed(() => toValue(options.location))

	const deviceId = computed(() => {
		const id = toValue(options.deviceId)
		return id != null && Number.isFinite(Number(id)) ? Number(id) : null
	})

	const siteId = computed(() => {
		const raw = location.value?.id ?? location.value?.locationId
		const n = Number(raw)
		return Number.isFinite(n) ? n : undefined
	})

	const channelId = computed(() => {
		const ch = location.value?.cameraChannelId
		return ch != null && Number.isFinite(Number(ch)) ? Math.trunc(Number(ch)) : 1
	})

	const apiParams = computed(() => ({
		siteId: siteId.value,
		channelId: channelId.value,
	}))

	const isBusy = computed(() => isControlling.value || isCooldown.value)

	const clearCooldown = () => {
		if (cooldownTimer != null) {
			clearTimeout(cooldownTimer)
			cooldownTimer = null
		}
		isCooldown.value = false
	}

	const startCooldown = () => {
		clearCooldown()
		isCooldown.value = true
		cooldownTimer = setTimeout(() => {
			isCooldown.value = false
			cooldownTimer = null
		}, cooldownMs)
	}

	onScopeDispose(clearCooldown)

	const control = async (ctrlMode: BarrierGateCtrlMode, canWrite: boolean) => {
		const id = deviceId.value
		if (id == null || !canWrite || isBusy.value) return
		startCooldown()
		isControlling.value = true
		try {
			await isapiApi.controlBarrierGate(id, { ...apiParams.value, ctrlMode })
			toast.success("已送出道閘指令")
		} catch (e) {
			handleError(e, "道閘控制失敗", { context: "control" })
		} finally {
			isControlling.value = false
		}
	}

	return { isControlling, isBusy, control, clearCooldown }
}
