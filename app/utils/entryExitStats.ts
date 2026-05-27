/**
 * 進出統計 transition 策略（須與 ba-backend/src/services/entryExit 同步）
 * SSOT：docs/30-contracts/entry-exit-stats.md
 */

export type EntryExitDirection = "entry" | "exit";

export interface TransitionStats {
	entryCount: number;
	exitCount: number;
	currentCount: number;
}

export interface ComputeTransitionStatsOptions<T> {
	getKey: (event: T) => string | null | undefined;
	getDirection: (event: T) => EntryExitDirection | null | undefined;
	getTime?: (event: T) => Date | string | number;
	sortByTime?: boolean;
}

export const computeTransitionStats = <T>(
	events: T[],
	options: ComputeTransitionStatsOptions<T>
): TransitionStats => {
	const {
		getKey,
		getDirection,
		getTime = (e: T) => e as unknown as Date | string | number,
		sortByTime = true
	} = options;

	if (!events?.length) {
		return { entryCount: 0, exitCount: 0, currentCount: 0 };
	}

	let list = [...events];
	if (sortByTime) {
		list = list.sort(
			(a, b) => new Date(getTime(a)).getTime() - new Date(getTime(b)).getTime()
		);
	}

	const lastByKey = new Map<string, EntryExitDirection>();
	let entryCount = 0;
	let exitCount = 0;

	for (const event of list) {
		const keyRaw = getKey(event);
		const key =
			keyRaw != null && String(keyRaw).trim() !== "" ? String(keyRaw).trim() : "";
		if (!key) continue;

		const dir = getDirection(event);
		if (dir !== "entry" && dir !== "exit") continue;

		const prev = lastByKey.get(key);
		if (prev === undefined && dir === "exit") continue;
		if (prev !== dir) {
			if (dir === "entry") entryCount += 1;
			else exitCount += 1;
		}
		lastByKey.set(key, dir);
	}

	let currentCount = 0;
	for (const dir of lastByKey.values()) {
		if (dir === "entry") currentCount += 1;
	}

	return { entryCount, exitCount, currentCount };
};

export const computeCumulativePresence = (
	entryCount: number,
	exitCount: number
): number => Math.max(0, Math.trunc(entryCount) - Math.trunc(exitCount));

