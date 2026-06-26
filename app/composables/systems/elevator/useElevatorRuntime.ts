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
	ELEVATOR_FLOOR_STEP_MS,
	type ElevatorFloorSnapshot,
} from "~/utils/elevatorFloorModel"

type UseElevatorRuntimeOptions = {
	floors?: MaybeRefOrGetter<ElevatorLogicalFloor[] | undefined>
}

const toSnapshot = (floors: ElevatorLogicalFloor[], index: number): ElevatorFloorSnapshot => ({
	index,
	label: floors[index - 1]?.label ?? `${index}F`,
	rank: floors[index - 1]?.rank,
})

export const useElevatorRuntime = (options: UseElevatorRuntimeOptions = {}) => {
	const liveState = ref<ElevatorLiveState | null>(null)
	const animatedFloor = ref<ElevatorFloorSnapshot | null>(null)
	const lastKnownIndex = ref<number | null>(null)
	const animatingTarget = ref<number | null>(null)
	const animationSettled = ref(false)

	let timer: ReturnType<typeof setInterval> | null = null

	const clearTimer = () => {
		if (timer) {
			clearInterval(timer)
			timer = null
		}
	}

	const getFloors = () => toValue(options.floors) ?? []

	const setIndex = (floors: ElevatorLogicalFloor[], index: number) => {
		animatedFloor.value = toSnapshot(floors, index)
		lastKnownIndex.value = index
	}

	const resetAnimation = (persistIndex?: number) => {
		clearTimer()
		animatedFloor.value = null
		animationSettled.value = false
		animatingTarget.value = null
		if (persistIndex != null) lastKnownIndex.value = persistIndex
	}

	const finishAtTarget = (floors: ElevatorLogicalFloor[], index: number) => {
		setIndex(floors, index)
		animationSettled.value = true
		clearTimer()
	}

	const stepOnce = (floors: ElevatorLogicalFloor[], state: ElevatorLiveState) => {
		const target = state.targetFloor!.index
		const current = animatedFloor.value?.index ?? lastKnownIndex.value ?? 1
		if (current === target) {
			finishAtTarget(floors, target)
			return
		}

		const step = state.direction === "down" ? -1 : 1
		const next = step > 0 ? Math.min(current + step, target) : Math.max(current + step, target)
		setIndex(floors, next)
		if (next === target) finishAtTarget(floors, target)
	}

	const startTimer = () => {
		if (timer) return
		timer = setInterval(() => {
			const state = liveState.value
			if (!state?.targetFloor || state.phase !== "moving") {
				clearTimer()
				return
			}
			const floors = getFloors()
			if (!floors.length) {
				clearTimer()
				return
			}
			stepOnce(floors, state)
		}, ELEVATOR_FLOOR_STEP_MS)
	}

	const reconcileAnimation = (state: ElevatorLiveState) => {
		if (state.phase !== "moving" || !state.targetFloor) {
			resetAnimation(state.currentFloor?.index ?? undefined)
			return
		}

		const target = state.targetFloor.index
		if (animationSettled.value && animatingTarget.value === target) return

		const floors = getFloors()
		if (!floors.length) {
			resetAnimation()
			return
		}

		if (animatingTarget.value !== target) {
			animatingTarget.value = target
			animationSettled.value = false
			const start = lastKnownIndex.value ?? state.currentFloor?.index ?? 1
			setIndex(floors, start)
		}

		if (animatedFloor.value?.index === target) {
			finishAtTarget(floors, target)
			return
		}

		startTimer()
	}

	const applyLiveState = (state: ElevatorLiveState | null | undefined) => {
		if (!state) return
		liveState.value = state
		reconcileAnimation(state)
	}

	const displayFloorText = computed(() => {
		const state = liveState.value
		if (!state) return formatElevatorLiveFloorText({ floorLabel: "1F" })

		if (state.phase === "moving" && animatedFloor.value) {
			return formatElevatorLiveFloorText({ floorLabel: animatedFloor.value.label })
		}

		return formatElevatorLiveFloorText({
			floorLabel: state.currentFloor?.label ?? state.targetFloor?.label ?? "1F",
		})
	})

	const displayDirection = computed(() => {
		const state = liveState.value
		if (!state || state.phase !== "moving" || animationSettled.value) return "idle"
		return state.direction ?? "idle"
	})

	const isMoving = computed(() => displayDirection.value !== "idle")

	onScopeDispose(clearTimer)

	return {
		applyLiveState,
		displayFloorText,
		displayDirection,
		isMoving,
	}
}
