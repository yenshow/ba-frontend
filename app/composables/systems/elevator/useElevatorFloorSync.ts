import type { useElevatorSyncEngine } from "~/composables/systems/elevator/useElevatorSyncEngine"

/** 電梯樓層管理 Dialog 共用 sync engine 型別 */
export type ElevatorFloorSync = ReturnType<typeof useElevatorSyncEngine>
