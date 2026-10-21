import type { MonitorView, NvrSearchMatch, PlaybackZoomHours } from "~/types/surveillance"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import {
	DAY_DURATION_MS,
	clockOffsetMs,
	formatPlayheadClock,
	formatTaipeiYmd,
	parseIsoMs,
	shiftTaipeiYmd,
	taipeiDayEndMs,
	taipeiDayStartMs,
} from "~/utils/nvrPlaybackTime"

type PlaybackSession = {
	sessionId: string
	nvrId: number
	startMs: number
	endMs: number
}

type MatchRange = {
	startMs: number
	endMs: number
}

const ZOOM_OPTIONS: readonly PlaybackZoomHours[] = [24, 12, 6]

const toMatchRanges = (matches: readonly NvrSearchMatch[]): MatchRange[] => {
	const ranges: MatchRange[] = []
	for (const match of matches) {
		const startMs = parseIsoMs(match.startTime)
		const endMs = parseIsoMs(match.endTime)
		if (startMs == null || endMs == null || endMs <= startMs) continue
		ranges.push({ startMs, endMs })
	}
	return ranges.sort((a, b) => a.startMs - b.startMs)
}

const coveringRange = (ranges: readonly MatchRange[], atMs: number) =>
	ranges.find((r) => r.startMs <= atMs && atMs < r.endMs) ?? null

const snapToRangeMs = (ranges: readonly MatchRange[], atMs: number): number => {
	if (ranges.length === 0) return atMs
	if (coveringRange(ranges, atMs)) return atMs
	let best: MatchRange | null = null
	let bestDist = Infinity
	for (const range of ranges) {
		const dist = atMs < range.startMs ? range.startMs - atMs : atMs - range.endMs
		if (dist >= bestDist) continue
		bestDist = dist
		best = range
	}
	if (!best) return atMs
	if (atMs < best.startMs) return best.startMs
	return Math.max(best.startMs, best.endMs - 1)
}

export const useNvrPlaybackSession = (options: {
	views: Ref<readonly MonitorView[]> | ComputedRef<readonly MonitorView[]>
	updateView: (viewKey: string, updates: Partial<MonitorView>) => void
}) => {
	const nvrApi = useNvrApi()
	const selectedDate = ref(formatTaipeiYmd())
	const playheadMs = ref(0)
	const isPlaying = ref(false)
	const zoomHours = ref<PlaybackZoomHours>(24)
	const matchesByViewKey = ref<Record<string, NvrSearchMatch[]>>({})
	const sessionsByViewKey = ref<Record<string, PlaybackSession>>({})
	const searchError = ref<string | null>(null)
	let matchesDate = ""

	let playGen = 0
	let clockTimer: ReturnType<typeof setInterval> | null = null
	let lastTick = 0
	let isScrubbing = false

	const dayStartMs = computed(() => taipeiDayStartMs(selectedDate.value))
	const dayEndMs = computed(() => taipeiDayEndMs(selectedDate.value))
	const playheadAtMs = computed(() => dayStartMs.value + playheadMs.value)
	const playheadLabel = computed(() => formatPlayheadClock(playheadMs.value))
	const todayYmd = computed(() => formatTaipeiYmd())
	const canGoNextDay = computed(() => selectedDate.value < todayYmd.value)

	const rangesByViewKey = computed(() => {
		const map: Record<string, MatchRange[]> = {}
		for (const view of options.views.value) {
			const matches = matchesByViewKey.value[view.viewKey]
			if (matches) map[view.viewKey] = toMatchRanges(matches)
		}
		return map
	})

	const unionSegments = computed(() => {
		const ranges = Object.values(rangesByViewKey.value).flat()
		ranges.sort((a, b) => a.startMs - b.startMs)
		const merged: MatchRange[] = []
		for (const range of ranges) {
			const last = merged[merged.length - 1]
			if (!last || range.startMs > last.endMs) {
				merged.push({ ...range })
				continue
			}
			last.endMs = Math.max(last.endMs, range.endMs)
		}
		return merged
	})

	const coveringViewKeys = computed(() => {
		const at = playheadAtMs.value
		return options.views.value
			.filter((view) => coveringRange(rangesByViewKey.value[view.viewKey] || [], at))
			.map((view) => view.viewKey)
	})

	const sessionCovers = (session: PlaybackSession, atMs: number) =>
		coveringRange([session], atMs) != null

	const clampDayOffset = (offsetMs: number) =>
		Math.max(0, Math.min(DAY_DURATION_MS, offsetMs))

	const snapPlayheadOffset = (atMs: number) =>
		clampDayOffset(snapToRangeMs(unionSegments.value, atMs) - dayStartMs.value)

	const clearClock = () => {
		if (!clockTimer) return
		clearInterval(clockTimer)
		clockTimer = null
	}

	const idleViewPatch: Partial<MonitorView> = {
		webrtcUrl: "",
		webrtcPort: undefined,
		streamId: undefined,
		playbackSessionId: undefined,
		streamStatus: undefined,
	}

	const stopViewSession = async (viewKey: string) => {
		const session = sessionsByViewKey.value[viewKey]
		if (session) {
			const next = { ...sessionsByViewKey.value }
			delete next[viewKey]
			sessionsByViewKey.value = next
			await nvrApi.stopPlayback(session.nvrId, session.sessionId).catch(() => {})
		}
		options.updateView(viewKey, idleViewPatch)
	}

	const stopAllSessions = async () => {
		const keys = Object.keys(sessionsByViewKey.value)
		await Promise.all(keys.map((key) => stopViewSession(key)))
	}

	const startViewAtPlayhead = async (view: MonitorView, gen: number, force = false) => {
		if (gen !== playGen) return
		if (view.proxyChannelId == null) return
		const ranges = rangesByViewKey.value[view.viewKey] || []
		const at = playheadAtMs.value
		const covering = coveringRange(ranges, at)
		if (!covering) {
			if (sessionsByViewKey.value[view.viewKey]) await stopViewSession(view.viewKey)
			return
		}
		const existing = sessionsByViewKey.value[view.viewKey]
		if (!force && existing && sessionCovers(existing, at)) return
		const startMs = at <= covering.startMs + 250 ? covering.startMs : at
		const endMs = covering.endMs
		options.updateView(view.viewKey, { streamStatus: "loading" })
		try {
			if (existing) {
				const next = { ...sessionsByViewKey.value }
				delete next[view.viewKey]
				sessionsByViewKey.value = next
				await nvrApi.stopPlayback(existing.nvrId, existing.sessionId).catch(() => {})
			}
			const res = await nvrApi.startPlayback(view.deviceId, {
				trackId: view.proxyChannelId,
				startTime: new Date(startMs).toISOString(),
				endTime: new Date(endMs).toISOString(),
			})
			if (gen !== playGen) {
				await nvrApi.stopPlayback(view.deviceId, res.sessionId).catch(() => {})
				return
			}
			sessionsByViewKey.value = {
				...sessionsByViewKey.value,
				[view.viewKey]: {
					sessionId: res.sessionId,
					nvrId: view.deviceId,
					startMs,
					endMs,
				},
			}
			options.updateView(view.viewKey, {
				webrtcUrl: res.webrtcUrl,
				webrtcPort: res.webrtcPort,
				streamId: res.pathName,
				playbackSessionId: res.sessionId,
				streamStatus: "running",
			})
		} catch {
			if (gen !== playGen) return
			options.updateView(view.viewKey, {
				webrtcUrl: "",
				streamStatus: "error",
				playbackSessionId: undefined,
			})
		}
	}

	const syncPlayingSessions = async () => {
		if (!isPlaying.value || isScrubbing) return
		const gen = playGen
		const at = playheadAtMs.value
		const union = unionSegments.value
		if (union.length > 0 && !coveringRange(union, at)) {
			const next = union.find((range) => range.startMs > at)
			if (!next) {
				await pause()
				return
			}
			playheadMs.value = Math.max(0, next.startMs - dayStartMs.value)
		}
		await Promise.all(
			options.views.value.map(async (view) => {
				if (gen !== playGen) return
				const session = sessionsByViewKey.value[view.viewKey]
				if (session && playheadAtMs.value < session.endMs) return
				await startViewAtPlayhead(view, gen)
			})
		)
	}

	const startClock = () => {
		clearClock()
		lastTick = Date.now()
		clockTimer = setInterval(() => {
			if (!isPlaying.value || isScrubbing) return
			const now = Date.now()
			const delta = now - lastTick
			lastTick = now
			playheadMs.value = Math.min(DAY_DURATION_MS, playheadMs.value + delta)
			if (playheadMs.value >= DAY_DURATION_MS) {
				playheadMs.value = DAY_DURATION_MS
				void pause()
				return
			}
			void syncPlayingSessions()
		}, 250)
	}

	const haltPlaybackClock = () => {
		playGen += 1
		isPlaying.value = false
		isScrubbing = false
		clearClock()
	}

	const beginScrub = () => {
		if (!isPlaying.value) return
		isScrubbing = true
		clearClock()
	}

	const endScrubWithoutSeek = () => {
		if (!isScrubbing) return
		isScrubbing = false
		if (isPlaying.value) startClock()
	}

	const pause = async () => {
		haltPlaybackClock()
	}

	const startViewsAtPlayhead = async (gen: number, force = false) => {
		await Promise.all(options.views.value.map((view) => startViewAtPlayhead(view, gen, force)))
	}

	const hasActiveSession = () =>
		options.views.value.some((view) => sessionsByViewKey.value[view.viewKey])

	const runAtPlayhead = async (playing: boolean, force = false) => {
		if (!options.views.value.some((view) => view.proxyChannelId != null)) return false
		playheadMs.value = snapPlayheadOffset(playheadAtMs.value)
		const gen = ++playGen
		isPlaying.value = playing
		isScrubbing = false
		if (playing) startClock()
		else clearClock()
		await startViewsAtPlayhead(gen, force)
		return gen === playGen && hasActiveSession()
	}

	const previewAtPlayhead = (force = false) => runAtPlayhead(false, force)

	const play = async (force = false) => {
		await runAtPlayhead(true, force)
	}

	const previewOrPlay = async (force = false) => {
		if (isPlaying.value) {
			await play(force)
			return
		}
		const shown = await previewAtPlayhead(force)
		if (!shown && unionSegments.value.length > 0) await play(force)
	}

	const seekToOffset = async (offsetMs: number) => {
		const nextOffset = snapPlayheadOffset(dayStartMs.value + clampDayOffset(offsetMs))
		const wasPlaying = isPlaying.value
		isScrubbing = false
		haltPlaybackClock()
		playheadMs.value = nextOffset
		if (wasPlaying) await play()
		else await previewAtPlayhead()
	}

	const seekToClock = async (clock: { hour: number; minute: number; second: number }) => {
		await seekToOffset(clockOffsetMs(clock.hour, clock.minute, clock.second))
	}

	const searchViews = async (onlyKeys?: readonly string[]) => {
		if (matchesDate !== selectedDate.value) {
			matchesByViewKey.value = {}
			matchesDate = selectedDate.value
		}
		const all = options.views.value.filter((view) => view.proxyChannelId != null)
		const kept: Record<string, NvrSearchMatch[]> = {}
		for (const view of all) {
			const existing = matchesByViewKey.value[view.viewKey]
			if (existing && (!onlyKeys || !onlyKeys.includes(view.viewKey))) kept[view.viewKey] = existing
		}
		const targets = all.filter((view) => {
			if (onlyKeys) return onlyKeys.includes(view.viewKey)
			return !kept[view.viewKey]
		})
		searchError.value = null
		const snapAfterSearch = () => {
			if (onlyKeys?.length) {
				const first = onlyKeys
					.flatMap((key) => rangesByViewKey.value[key] || [])
					.sort((a, b) => a.startMs - b.startMs)[0]
				if (first) {
					playheadMs.value = clampDayOffset(first.startMs - dayStartMs.value)
					return
				}
			}
			if (unionSegments.value.length > 0) playheadMs.value = snapPlayheadOffset(playheadAtMs.value)
		}

		if (targets.length === 0) {
			matchesByViewKey.value = kept
			snapAfterSearch()
			return
		}
		const startTime = new Date(dayStartMs.value).toISOString()
		const endTime = new Date(dayEndMs.value).toISOString()
		try {
			const entries = await Promise.all(
				targets.map(async (view) => {
					const res = await nvrApi.searchRecordings(view.deviceId, {
						trackId: view.proxyChannelId as number,
						startTime,
						endTime,
					})
					return [view.viewKey, res.matches || []] as const
				})
			)
			const next = { ...kept }
			for (const [key, matches] of entries) next[key] = matches
			matchesByViewKey.value = next
			snapAfterSearch()
		} catch (error) {
			searchError.value = error instanceof Error ? error.message : "錄影搜尋失敗"
			matchesByViewKey.value = kept
		}
	}

	const setDate = async (ymd: string) => {
		const next = ymd > todayYmd.value ? todayYmd.value : ymd
		if (!next || next === selectedDate.value) return
		haltPlaybackClock()
		await stopAllSessions()
		selectedDate.value = next
		playheadMs.value = 0
		await searchViews()
		await previewAtPlayhead()
	}

	const shiftDate = async (deltaDays: number) => {
		const next = shiftTaipeiYmd(selectedDate.value, deltaDays)
		if (deltaDays > 0 && next > todayYmd.value) return
		await setDate(next)
	}

	const setZoomHours = (hours: PlaybackZoomHours) => {
		if (!ZOOM_OPTIONS.includes(hours)) return
		zoomHours.value = hours
	}

	watch(
		() => options.views.value.map((v) => v.viewKey).join(","),
		async (next, prev) => {
			if (next === prev) return
			const keys = new Set(options.views.value.map((v) => v.viewKey))
			await Promise.all(
				Object.keys(sessionsByViewKey.value)
					.filter((key) => !keys.has(key))
					.map((key) => stopViewSession(key))
			)
			const nextMatches: Record<string, NvrSearchMatch[]> = {}
			for (const [key, matches] of Object.entries(matchesByViewKey.value)) {
				if (keys.has(key)) nextMatches[key] = matches
			}
			if (Object.keys(nextMatches).length !== Object.keys(matchesByViewKey.value).length) {
				matchesByViewKey.value = nextMatches
			}
		}
	)

	onBeforeUnmount(() => {
		haltPlaybackClock()
		void stopAllSessions()
	})

	return {
		selectedDate,
		playheadMs,
		playheadLabel,
		isPlaying,
		zoomHours,
		unionSegments,
		coveringViewKeys,
		dayStartMs,
		searchError,
		canGoNextDay,
		play,
		pause,
		previewOrPlay,
		seekToOffset,
		seekToClock,
		beginScrub,
		endScrubWithoutSeek,
		searchViews,
		setDate,
		shiftDate,
		setZoomHours,
		stopAllSessions,
	}
}
