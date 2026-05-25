import type { StatusSnapshotFetchOptions } from "~/composables/monitoring/modbus/statusSnapshotPolicy"

export type SnapshotRaceContext = {
	isStale: () => boolean
}

/** 快照 generation + inflight；非 force 時併入上一輪結果。 */
export function createStatusSnapshotRaceChannel() {
	let inflightSnapshot: Promise<void> | null = null
	let snapshotGeneration = 0

	const runSnapshotLoad = async (
		options: StatusSnapshotFetchOptions | undefined,
		execute: (ctx: SnapshotRaceContext) => Promise<void>
	): Promise<void> => {
		if (inflightSnapshot && !options?.force) {
			await inflightSnapshot
			return
		}

		const myGen = ++snapshotGeneration
		const promise = execute({
			isStale: () => myGen !== snapshotGeneration,
		})

		inflightSnapshot = promise
		await promise
		if (inflightSnapshot === promise) {
			inflightSnapshot = null
		}
	}

	return { runSnapshotLoad }
}
