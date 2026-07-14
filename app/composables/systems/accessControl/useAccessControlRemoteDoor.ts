import { TOAST } from "~/config/toastCatalog"
import { onScopeDispose, ref, computed } from "vue"
import {
	useAccessControlApi,
	type RemoteDoorCmd,
} from "~/composables/systems/accessControl/useAccessControlApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"

const CONTROL_COOLDOWN_MS = 1500

/** ISAPI 遠端門控：送控制指令（設備不提供可靠狀態查詢） */
export const useAccessControlRemoteDoor = () => {
	const api = useAccessControlApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const isControlling = ref(false)
	const isCooldown = ref(false)
	let cooldownTimer: ReturnType<typeof setTimeout> | null = null

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
		}, CONTROL_COOLDOWN_MS)
	}

	onScopeDispose(clearCooldown)

	const control = async (deviceId: number, cmd: RemoteDoorCmd, canWrite: boolean) => {
		if (!canWrite || isBusy.value || !Number.isFinite(deviceId) || deviceId <= 0) return
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

	return { isControlling, isBusy, control, clearCooldown }
}
