import {
	computed,
	onScopeDispose,
	ref,
	toValue,
	type MaybeRefOrGetter,
} from "vue"
import type { ElevatorLiveState, ElevatorLogicalFloor } from "~/types/elevator"
import { formatElevatorLiveFloorText } from "~/utils/elevatorDisplayUtils"
import {
	buildRankStepPath,
	ELEVATOR_FLOOR_STEP_MS,
	floorSnapshotFromRank,
	type ElevatorFloorSnapshot,
} from "~/utils/elevatorFloorModel"

type UseElevatorRuntimeOptions = {
	floors?: MaybeRefOrGetter<ElevatorLogicalFloor[] | undefined>
}

const liveFloorToSnapshot = (
	floors: ElevatorLogicalFloor[],
	floor: NonNullable<ElevatorLiveState["currentFloor"]>,
): ElevatorFloorSnapshot =>
	(floor.rank != null ? floorSnapshotFromRank(floors, floor.rank) : null) ?? {
		index: floor.index,
		label: floor.label,
		rank: floor.rank,
	}

export const useElevatorRuntime = (options: UseElevatorRuntimeOptions = {}) => {
	const liveState = ref<ElevatorLiveState | null>(null)
	const displayedFloor = ref<ElevatorFloorSnapshot | null>(null)
	const rankStepQueue = ref<number[]>([])
	const lastCommittedRank = ref<number | null>(null)

	let timer: ReturnType<typeof setInterval> | null = null

	const getFloors = () => toValue(options.floors) ?? []

	const clearTimer = () => {
		if (timer) {
			clearInterval(timer)
			timer = null
		}
	}

	const setDisplayedRank = (rank: number) => {
		const snap = floorSnapshotFromRank(getFloors(), rank)
		if (snap) displayedFloor.value = snap
	}

	const playNextRankStep = () => {
		const next = rankStepQueue.value.shift()
		if (next == null) return
		setDisplayedRank(next)
	}

	const startStepTimer = () => {
		if (timer) return
		const tick = () => {
			if (!rankStepQueue.value.length) {
				clearTimer()
				return
			}
			playNextRankStep()
		}
		tick()
		if (rankStepQueue.value.length) {
			timer = setInterval(tick, ELEVATOR_FLOOR_STEP_MS)
		}
	}

	const enqueueRankCatchUp = (fromRank: number, toRank: number) => {
		clearTimer()
		rankStepQueue.value = buildRankStepPath(getFloors(), fromRank, toRank)
		if (rankStepQueue.value.length) {
			startStepTimer()
			return
		}
		setDisplayedRank(toRank)
	}

	const applyLiveState = (state: ElevatorLiveState | null | undefined) => {
		if (!state) return
		liveState.value = state

		const current = state.currentFloor
		const floors = getFloors()

		if (!current || current.rank == null) {
			if (current) {
				displayedFloor.value = liveFloorToSnapshot(floors, current)
				lastCommittedRank.value = current.rank ?? null
			}
			return
		}

		const newRank = current.rank

		if (lastCommittedRank.value == null) {
			lastCommittedRank.value = newRank
			displayedFloor.value = liveFloorToSnapshot(floors, current)
			return
		}

		if (newRank === lastCommittedRank.value) {
			if (!rankStepQueue.value.length && !timer) {
				displayedFloor.value = liveFloorToSnapshot(floors, current)
			}
			return
		}

		const fromRank = displayedFloor.value?.rank ?? lastCommittedRank.value
		lastCommittedRank.value = newRank
		enqueueRankCatchUp(fromRank, newRank)
	}

	const displayFloorText = computed(() => {
		const label =
			displayedFloor.value?.label ?? liveState.value?.currentFloor?.label ?? undefined
		return formatElevatorLiveFloorText({ floorLabel: label ?? "1F" })
	})

	const displayDirection = computed(() => {
		const state = liveState.value
		if (!state || state.phase !== "moving") return "idle"
		return state.direction ?? "idle"
	})

	const isMoving = computed(
		() => rankStepQueue.value.length > 0 || liveState.value?.phase === "moving",
	)

	onScopeDispose(clearTimer)

	return {
		applyLiveState,
		displayFloorText,
		displayDirection,
		isMoving,
	}
}
