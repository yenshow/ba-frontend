import { TOAST } from "~/config/toastCatalog"
import type { MaybeRefOrGetter } from "vue"
import { computed, onScopeDispose, ref, toValue, watch } from "vue"
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"

type GateVisualState = "closed" | "open"

export const BARRIER_ARM_RAISED_DEG = -78
export const BARRIER_ARM_PIVOT = { x: 52, y: 123 } as const
export const BARRIER_AUTO_CLOSE_MS = 10_000
const CONTROL_COOLDOWN_MS = 1500

/** 詳情面板與總覽共用同一按鈕尺寸樣式 */
export const BARRIER_GATE_BTN_BASE_CLASS =
	"flex h-8 min-w-[3rem] items-center justify-center rounded-lg border border-white/60 px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 2xl:h-9 2xl:min-w-[3.25rem] 2xl:px-3 2xl:text-sm"

export const BARRIER_GATE_ACTIONS = [
	{
		mode: "open" as const,
		label: "開啟",
		btnClass: "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/35",
	},
	{
		mode: "close" as const,
		label: "關閉",
		btnClass: "bg-white/15 text-white hover:bg-white/25",
	},
] as const

const collectCameraDeviceIds = (
	location: VehicleAccessLocation | null | undefined
): number[] => {
	const seen = new Set<number>()
	const result: number[] = []
	for (const ids of [location?.entryCameraDeviceIds, location?.exitCameraDeviceIds]) {
		for (const raw of ids ?? []) {
			const id = Number(raw)
			if (!Number.isFinite(id) || seen.has(id)) continue
			seen.add(id)
			result.push(id)
		}
	}
	return result
}

/**
 * ISAPI 道閘控制（總覽精簡列／詳情動畫面板共用）
 * 含：攝影機清單、控制 API、cooldown、選配 UI 動畫狀態
 */
export const useVehicleBarrierDeviceControls = (options: {
	location: MaybeRefOrGetter<VehicleAccessLocation | null | undefined>
	canWrite?: MaybeRefOrGetter<boolean>
	/** 詳情面板：開啟後僅動畫自動落桿，不送 close API */
	autoCloseVisual?: boolean
	cooldownMs?: number
}) => {
	const { request } = useApiBase()
	const deviceApi = useDeviceApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const nameMap = ref<Record<number, string>>({})
	const lockedByDeviceId = ref<Record<number, boolean>>({})
	const visualStateByDeviceId = ref<Record<number, GateVisualState>>({})
	const autoCloseTimers = new Map<number, ReturnType<typeof setTimeout>>()

	const barrierDeviceId = ref<number | null>(null)
	const isControlling = ref(false)
	const isCooldown = ref(false)
	let cooldownTimer: ReturnType<typeof setTimeout> | null = null
	const cooldownMs = options.cooldownMs ?? CONTROL_COOLDOWN_MS

	const location = computed(() => toValue(options.location) ?? null)
	const canWrite = computed(() => Boolean(toValue(options.canWrite)))
	const useVisual = Boolean(options.autoCloseVisual)

	const deviceIds = computed(() => collectCameraDeviceIds(location.value))
	const devices = computed(() =>
		deviceIds.value.map((id) => ({
			id,
			label: nameMap.value[id]?.trim() || `設備 #${id}`,
		}))
	)

	const siteId = computed(() => {
		const raw = location.value?.id ?? location.value?.locationId
		const n = Number(raw)
		return Number.isFinite(n) ? n : undefined
	})

	const channelId = computed(() => {
		const ch = location.value?.cameraChannelId
		return ch != null && Number.isFinite(Number(ch)) ? Math.trunc(Number(ch)) : 1
	})

	const isBusy = computed(() => isControlling.value || isCooldown.value)
	const isDisabled = computed(() => !canWrite.value || isBusy.value)

	const loadNames = async (ids: number[]) => {
		if (ids.length === 0) {
			nameMap.value = {}
			return
		}
		try {
			const res = await deviceApi.getDevices({ type_code: "camera", limit: 200 })
			const idSet = new Set(ids)
			const map: Record<number, string> = {}
			for (const dev of res.devices ?? []) {
				if (dev.id != null && idSet.has(dev.id)) {
					map[dev.id] = dev.name?.trim() || `設備 #${dev.id}`
				}
			}
			for (const id of ids) {
				if (!map[id]) map[id] = `設備 #${id}`
			}
			nameMap.value = map
		} catch {
			nameMap.value = Object.fromEntries(ids.map((id) => [id, `設備 #${id}`]))
		}
	}

	watch(deviceIds, (ids) => void loadNames(ids), { immediate: true })

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

	const clearAutoClose = (deviceId?: number) => {
		if (deviceId != null) {
			const timer = autoCloseTimers.get(deviceId)
			if (timer != null) {
				clearTimeout(timer)
				autoCloseTimers.delete(deviceId)
			}
			return
		}
		for (const timer of autoCloseTimers.values()) clearTimeout(timer)
		autoCloseTimers.clear()
	}

	const isLocked = (deviceId: number) => lockedByDeviceId.value[deviceId] ?? false

	const getVisualState = (deviceId: number): GateVisualState =>
		visualStateByDeviceId.value[deviceId] ?? "closed"

	const scheduleAutoClose = (deviceId: number) => {
		if (!useVisual) return
		clearAutoClose(deviceId)
		if (isLocked(deviceId)) return
		const timer = setTimeout(() => {
			autoCloseTimers.delete(deviceId)
			if (isLocked(deviceId)) return
			visualStateByDeviceId.value = {
				...visualStateByDeviceId.value,
				[deviceId]: "closed",
			}
		}, BARRIER_AUTO_CLOSE_MS)
		autoCloseTimers.set(deviceId, timer)
	}

	const applyVisualForMode = (deviceId: number, ctrlMode: BarrierGateCtrlMode) => {
		if (!useVisual) return
		if (ctrlMode === "open") {
			visualStateByDeviceId.value = {
				...visualStateByDeviceId.value,
				[deviceId]: "open",
			}
			scheduleAutoClose(deviceId)
			return
		}
		if (ctrlMode === "lock") {
			clearAutoClose(deviceId)
			visualStateByDeviceId.value = {
				...visualStateByDeviceId.value,
				[deviceId]: "open",
			}
			return
		}
		if (ctrlMode === "close" || ctrlMode === "unlock") {
			clearAutoClose(deviceId)
			visualStateByDeviceId.value = {
				...visualStateByDeviceId.value,
				[deviceId]: "closed",
			}
		}
	}

	const resetState = () => {
		if (useVisual) clearAutoClose()
		lockedByDeviceId.value = {}
		if (useVisual) visualStateByDeviceId.value = {}
		clearCooldown()
	}

	watch(
		() => location.value?.id ?? location.value?.locationId,
		resetState
	)

	onScopeDispose(() => {
		clearCooldown()
		if (useVisual) clearAutoClose()
	})

	const controlBarrierGate = async (
		deviceId: number,
		ctrlMode: BarrierGateCtrlMode
	) => {
		const q = new URLSearchParams()
		if (siteId.value != null) q.set("siteId", String(siteId.value))
		if (channelId.value != null) q.set("channelId", String(channelId.value))
		const qs = q.toString()
		await request<{ success: boolean; channelId: number; ctrlMode: string }>(
			`/vehicle-access/devices/${deviceId}/barrier-gate${qs ? `?${qs}` : ""}`,
			{
				method: "PUT",
				body: {
					siteId: siteId.value,
					channelId: channelId.value,
					ctrlMode,
				},
			}
		)
	}

	const sendControl = async (ctrlMode: BarrierGateCtrlMode) => {
		const id = barrierDeviceId.value
		if (id == null || !canWrite.value || isBusy.value) return
		startCooldown()
		isControlling.value = true
		try {
			await controlBarrierGate(id, ctrlMode)
			toast.success(TOAST.VEHICLE_BARRIER_SENT)
		} catch (e) {
			handleError(e, "道閘控制失敗", { context: "control" })
		} finally {
			isControlling.value = false
		}
	}

	const isControllingDevice = (deviceId: number) =>
		isControlling.value && barrierDeviceId.value === deviceId

	const isArmRaised = (deviceId: number) =>
		useVisual && (isLocked(deviceId) || getVisualState(deviceId) === "open")

	const armStyle = (deviceId: number) => ({
		transformOrigin: `${BARRIER_ARM_PIVOT.x}px ${BARRIER_ARM_PIVOT.y}px`,
		transform: `rotate(${isArmRaised(deviceId) ? BARRIER_ARM_RAISED_DEG : 0}deg)`,
	})

	const runControl = (deviceId: number, ctrlMode: BarrierGateCtrlMode) => {
		if (isDisabled.value) return
		applyVisualForMode(deviceId, ctrlMode)
		barrierDeviceId.value = deviceId
		void sendControl(ctrlMode)
	}

	const handleLockToggle = (deviceId: number, event: Event) => {
		const nextLocked = (event.target as HTMLInputElement).checked
		if (isDisabled.value || isLocked(deviceId) === nextLocked) return
		lockedByDeviceId.value = {
			...lockedByDeviceId.value,
			[deviceId]: nextLocked,
		}
		runControl(deviceId, nextLocked ? "lock" : "unlock")
	}

	return {
		devices,
		isDisabled,
		isLocked,
		isControllingDevice,
		isArmRaised,
		armStyle,
		runControl,
		handleLockToggle,
	}
}
