import {
	computed,
	onScopeDispose,
	ref,
	toValue,
	type MaybeRefOrGetter,
} from "vue"
import type { ElevatorDirection, ElevatorLiveState, ElevatorLogicalFloor } from "~/types/elevator"
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

const resolveDestinationRank = (state: ElevatorLiveState): number | null =>
	state.targetFloor?.rank ?? state.currentFloor?.rank ?? null

export const useElevatorRuntime = (options: UseElevatorRuntimeOptions = {}) => {
	const liveState = ref<ElevatorLiveState | null>(null)
	const displayedFloor = ref<ElevatorFloorSnapshot | null>(null)
	const rankStepQueue = ref<number[]>([])
	const lastCommittedRank = ref<number | null>(null)
	const destinationRank = ref<number | null>(null)
	const floorSlideDirection = ref<"up" | "down" | null>(null)

	let timer: ReturnType<typeof setTimeout> | null = null

	const getFloors = () => toValue(options.floors) ?? []

	const clearTimer = () => {
		if (timer) {
			clearTimeout(timer)
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
		const prevRank = displayedFloor.value?.rank
		if (prevRank != null && next !== prevRank) {
			floorSlideDirection.value = next > prevRank ? "up" : "down"
		}
		setDisplayedRank(next)
	}

	const scheduleNextStep = () => {
		if (!rankStepQueue.value.length) {
			timer = null
			return
		}
		timer = setTimeout(() => {
			playNextRankStep()
			scheduleNextStep()
		}, ELEVATOR_FLOOR_STEP_MS)
	}

	const enqueueRankCatchUp = (fromRank: number, toRank: number) => {
		clearTimer()
		rankStepQueue.value = buildRankStepPath(getFloors(), fromRank, toRank)

		if (rankStepQueue.value.length) {
			playNextRankStep()
			scheduleNextStep()
			return
		}

		floorSlideDirection.value = toRank > fromRank ? "up" : "down"
		setDisplayedRank(toRank)
	}

	const applyLiveState = (state: ElevatorLiveState | null | undefined) => {
		if (!state) return
		liveState.value = state
		destinationRank.value = resolveDestinationRank(state)

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
			floorSlideDirection.value = null
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

	const animationTargetRank = computed(
		() => destinationRank.value ?? lastCommittedRank.value,
	)

	const isMoving = computed(() => {
		if (rankStepQueue.value.length > 0 || timer != null) return true
		const displayed = displayedFloor.value?.rank
		const target = animationTargetRank.value
		if (displayed != null && target != null && displayed !== target) return true
		return liveState.value?.phase === "moving"
	})

	const displayDirection = computed((): ElevatorDirection => {
		if (!isMoving.value) return "idle"

		const state = liveState.value
		if (state?.phase === "moving" && state.direction && state.direction !== "idle") {
			return state.direction
		}

		const displayed = displayedFloor.value?.rank
		const target = animationTargetRank.value
		if (displayed != null && target != null && displayed !== target) {
			return target > displayed ? "up" : "down"
		}

		return floorSlideDirection.value ?? state?.direction ?? "idle"
	})

	onScopeDispose(clearTimer)

	return {
		applyLiveState,
		displayFloorText,
		displayedFloor,
		displayDirection,
		floorSlideDirection,
		isMoving,
	}
}
