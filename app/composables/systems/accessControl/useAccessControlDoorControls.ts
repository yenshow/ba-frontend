/**
 * 門禁遠端門控（總覽精簡列／詳情動畫面板共用）
 * 含：設備清單、控制 API、cooldown、選配 UI 推門動畫狀態
 * 開門成功後的事件調閱跳圖由後端 WS（people-counting:access-control:event）觸發
 */
import { TOAST } from "~/config/toastCatalog"
import type { MaybeRefOrGetter } from "vue"
import { computed, onScopeDispose, ref, toValue, watch } from "vue"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import {
	useAccessControlApi,
	type RemoteDoorCmd,
} from "~/composables/systems/accessControl/useAccessControlApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"

type DoorVisualState = "closed" | "open"
type DoorDevice = { id: number; label: string }

export const DOOR_AUTO_CLOSE_MS = 10_000
const CONTROL_COOLDOWN_MS = 1500

/** 詳情面板與總覽共用同一按鈕尺寸樣式（深色底提高對比） */
export const ACCESS_DOOR_BTN_BASE_CLASS =
	"flex h-8 min-w-[3rem] items-center justify-center rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 2xl:h-9 2xl:min-w-[3.25rem] 2xl:px-3 2xl:text-sm"

export const ACCESS_DOOR_ACTIONS = [
	{
		cmd: "open" as const,
		label: "開啟",
		btnClass: "border-emerald-300/80 bg-emerald-500/50 text-white hover:bg-emerald-500/65",
	},
	{
		cmd: "close" as const,
		label: "關閉",
		btnClass: "border-white/75 bg-white/25 text-white hover:bg-white/40",
	},
] as const

const buildRolesById = (location: PeopleCountingLocation | null | undefined) => {
	const rolesById = new Map<number, { entry: boolean; exit: boolean }>()
	const push = (raw: unknown, role: "entry" | "exit") => {
		const id = Number(raw)
		if (!Number.isFinite(id) || id <= 0) return
		const cur = rolesById.get(id) ?? { entry: false, exit: false }
		cur[role] = true
		rolesById.set(id, cur)
	}
	for (const raw of location?.entryDeviceIds ?? []) push(raw, "entry")
	for (const raw of location?.exitDeviceIds ?? []) push(raw, "exit")
	return rolesById
}

const roleLabel = (roles: { entry: boolean; exit: boolean }) =>
	roles.entry && roles.exit ? "進出" : roles.entry ? "入口" : "出口"

export const useAccessControlDoorControls = (options: {
	location: MaybeRefOrGetter<PeopleCountingLocation | null | undefined>
	canWrite?: MaybeRefOrGetter<boolean>
	/** 詳情面板：開啟後僅動畫自動關門，不送 close API */
	autoCloseVisual?: boolean
	cooldownMs?: number
}) => {
	const api = useAccessControlApi()
	const deviceApi = useDeviceApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const nameMap = ref<Record<number, string>>({})
	const alwaysOpenByDeviceId = ref<Record<number, boolean>>({})
	const visualStateByDeviceId = ref<Record<number, DoorVisualState>>({})
	const controllingDeviceId = ref<number | null>(null)
	const autoCloseTimers = new Map<number, ReturnType<typeof setTimeout>>()

	const isControlling = ref(false)
	const isCooldown = ref(false)
	let cooldownTimer: ReturnType<typeof setTimeout> | null = null
	const cooldownMs = options.cooldownMs ?? CONTROL_COOLDOWN_MS

	const location = computed(() => toValue(options.location) ?? null)
	const canWrite = computed(() => Boolean(toValue(options.canWrite)))
	const useVisual = Boolean(options.autoCloseVisual)

	const rolesById = computed(() => buildRolesById(location.value))
	const deviceIdsKey = computed(() => [...rolesById.value.keys()].join(","))

	const devices = computed<DoorDevice[]>(() =>
		[...rolesById.value.entries()].map(([id, roles]) => ({
			id,
			label: `${roleLabel(roles)}｜${nameMap.value[id]?.trim() || `設備 #${id}`}`,
		}))
	)

	const isBusy = computed(() => isControlling.value || isCooldown.value)
	const isDisabled = computed(() => !canWrite.value || isBusy.value)

	watch(
		deviceIdsKey,
		async (key) => {
			const ids = key ? key.split(",").map(Number) : []
			if (ids.length === 0) {
				nameMap.value = {}
				return
			}
			const fallback = Object.fromEntries(ids.map((id) => [id, `設備 #${id}`]))
			try {
				const res = await deviceApi.getDevices({
					type_code: "access_control",
					limit: 200,
				})
				const idSet = new Set(ids)
				const map = { ...fallback }
				for (const dev of res.devices ?? []) {
					if (dev.id != null && idSet.has(dev.id)) {
						map[dev.id] = dev.name?.trim() || fallback[dev.id]
					}
				}
				nameMap.value = map
			} catch {
				nameMap.value = fallback
			}
		},
		{ immediate: true }
	)

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

	const isAlwaysOpen = (deviceId: number) => Boolean(alwaysOpenByDeviceId.value[deviceId])

	const getVisualState = (deviceId: number): DoorVisualState =>
		visualStateByDeviceId.value[deviceId] ?? "closed"

	const scheduleAutoClose = (deviceId: number) => {
		if (!useVisual) return
		clearAutoClose(deviceId)
		if (isAlwaysOpen(deviceId)) return
		const timer = setTimeout(() => {
			autoCloseTimers.delete(deviceId)
			if (isAlwaysOpen(deviceId)) return
			visualStateByDeviceId.value = {
				...visualStateByDeviceId.value,
				[deviceId]: "closed",
			}
		}, DOOR_AUTO_CLOSE_MS)
		autoCloseTimers.set(deviceId, timer)
	}

	const setVisual = (deviceId: number, state: DoorVisualState) => {
		visualStateByDeviceId.value = {
			...visualStateByDeviceId.value,
			[deviceId]: state,
		}
	}

	const applyVisualForCmd = (deviceId: number, cmd: RemoteDoorCmd) => {
		if (!useVisual) return
		if (cmd === "open") {
			setVisual(deviceId, "open")
			scheduleAutoClose(deviceId)
			return
		}
		if (cmd === "alwaysOpen") {
			clearAutoClose(deviceId)
			setVisual(deviceId, "open")
			return
		}
		if (cmd === "close" || cmd === "alwaysClose") {
			clearAutoClose(deviceId)
			setVisual(deviceId, "closed")
		}
	}

	const resetState = () => {
		clearAutoClose()
		alwaysOpenByDeviceId.value = {}
		visualStateByDeviceId.value = {}
		controllingDeviceId.value = null
		clearCooldown()
	}

	watch(
		() => location.value?.locationId ?? location.value?.id,
		resetState
	)

	onScopeDispose(() => {
		clearCooldown()
		clearAutoClose()
	})

	const sendControl = async (deviceId: number, cmd: RemoteDoorCmd) => {
		if (
			!canWrite.value ||
			isBusy.value ||
			!Number.isFinite(deviceId) ||
			deviceId <= 0
		)
			return
		startCooldown()
		isControlling.value = true
		try {
			await api.controlRemoteDoor(deviceId, { cmd })
			toast.success(TOAST.ACCESS_DOOR_SENT)
		} catch (e) {
			handleError(e, "門控失敗", { context: "control" })
		} finally {
			isControlling.value = false
		}
	}

	const isControllingDevice = (deviceId: number) =>
		isControlling.value && controllingDeviceId.value === deviceId

	const isDoorOpen = (deviceId: number) =>
		useVisual && (isAlwaysOpen(deviceId) || getVisualState(deviceId) === "open")

	const runControl = (deviceId: number, cmd: RemoteDoorCmd) => {
		if (isDisabled.value) return
		applyVisualForCmd(deviceId, cmd)
		controllingDeviceId.value = deviceId
		void sendControl(deviceId, cmd)
	}

	const handleAlwaysOpenToggle = (deviceId: number, event: Event) => {
		const next = (event.target as HTMLInputElement).checked
		if (isDisabled.value || isAlwaysOpen(deviceId) === next) return
		alwaysOpenByDeviceId.value = {
			...alwaysOpenByDeviceId.value,
			[deviceId]: next,
		}
		runControl(deviceId, next ? "alwaysOpen" : "alwaysClose")
	}

	return {
		devices,
		isDisabled,
		isAlwaysOpen,
		isControllingDevice,
		isDoorOpen,
		runControl,
		handleAlwaysOpenToggle,
	}
}
