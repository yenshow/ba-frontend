import type { AirCirculationStatusItem, AirCirculationZone } from "~/types/air-circulation"
import type { DrainageStatusItem, DrainageZone } from "~/types/drainage"
import type { EmergencyRescueStatusItem, EmergencyRescueZone } from "~/types/emergency-rescue"
import type { FireStatusItem, FireZone } from "~/types/fire"
import type { PowerStatusItem, PowerZone } from "~/types/power"
import type { SmokeAlarmStatusItem, SmokeAlarmZone } from "~/types/smoke-alarm"
import { defineSnapshotModbusIntegration } from "~/composables/monitoring/modbus/createSnapshotModbusIntegration"
import { useAirCirculationApi } from "~/composables/systems/air-circulation/useAirCirculationApi"
import { useDrainageApi } from "~/composables/systems/drainage/useDrainageApi"
import { useEmergencyRescueApi } from "~/composables/systems/emergency-rescue/useEmergencyRescueApi"
import { useFireApi } from "~/composables/systems/fire/useFireApi"
import { usePowerApi } from "~/composables/systems/power/usePowerApi"
import { useSmokeAlarmApi } from "~/composables/systems/smoke-alarm/useSmokeAlarmApi"

export const useDrainageModbusIntegration = defineSnapshotModbusIntegration<
	DrainageStatusItem,
	DrainageZone
>("載入排水狀態失敗", useDrainageApi, {
	optimisticPatch: "manualAlarm",
	manualAlarmSystemType: "drainage",
})

export const usePowerModbusIntegration = defineSnapshotModbusIntegration<PowerStatusItem, PowerZone>(
	"載入電力狀態失敗",
	usePowerApi,
	{ optimisticPatch: "manualAlarm", manualAlarmSystemType: "power" }
)

export const useFireModbusIntegration = defineSnapshotModbusIntegration<FireStatusItem, FireZone>(
	"載入消防狀態失敗",
	useFireApi,
	{ optimisticPatch: "manualAlarm", manualAlarmSystemType: "fire" }
)

export const useAirCirculationModbusIntegration = defineSnapshotModbusIntegration<
	AirCirculationStatusItem,
	AirCirculationZone
>("載入空氣循環狀態失敗", useAirCirculationApi, { optimisticPatch: "uiStatus" })

export const useEmergencyRescueModbusIntegration = defineSnapshotModbusIntegration<
	EmergencyRescueStatusItem,
	EmergencyRescueZone
>("載入緊急救援狀態失敗", useEmergencyRescueApi, { optimisticPatch: "uiStatus" })

export const useSmokeAlarmModbusIntegration = defineSnapshotModbusIntegration<
	SmokeAlarmStatusItem,
	SmokeAlarmZone
>("載入煙霧警報狀態失敗", useSmokeAlarmApi, { optimisticPatch: "uiStatus" })
