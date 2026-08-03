import { useWebSocketEventSubscription } from "~/composables/websocket/useWebSocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { PERM } from "~/config/permissionCodes"

export type EnergyReadingNewEvent = {
	deviceId: number
	deviceName?: string
	recordedAt: string
	data: Record<string, number>
	online: boolean
	timestamp: string
}

export const useEnergyReadingSubscription = (
	onEvent: (event: EnergyReadingNewEvent) => void
) => {
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate("energy", {
		permissionCode: PERM.energy.module,
	})

	useWebSocketEventSubscription(
		"energy:reading:new",
		(...args: unknown[]) => {
			const payload = args[0] as EnergyReadingNewEvent
			if (!payload?.deviceId) return
			onEvent(payload)
		},
		{ enabled: () => canSubscribe.value }
	)
}
