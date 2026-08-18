<template>
	<div class="flex min-h-0 flex-1">
		<div class="min-w-0 flex-1">
			<div class="flex flex-col gap-3 text-white">
				<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-3">
					<div class="overview-stat-label">室內機</div>
					<div class="min-w-[120px] flex-1 bg-black/20 px-3 py-1 text-center text-xl 2xl:text-2xl">
						{{ location.indoorDeviceName || "未綁定" }}
					</div>
				</div>
				<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-3">
					<div class="overview-stat-label">VoIP</div>
					<div class="min-w-[120px] flex-1 bg-black/20 px-3 py-1 text-center text-xl 2xl:text-2xl">
						{{ location.voipNumber || "—" }}
					</div>
				</div>
				<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-3">
					<div class="overview-stat-label">位址</div>
					<div class="min-w-[120px] flex-1 bg-black/20 px-3 py-1 text-center text-base 2xl:text-lg">
						{{ location.host || "—" }}
					</div>
				</div>

				<div class="mt-2 border-t border-white/30 pt-3">
					<p class="mb-2 text-center text-sm tracking-wider text-white/60 2xl:text-base">
						案場主機
					</p>
					<div v-if="mainStations.length === 0" class="py-4 text-center text-white/50">
						尚未設定
					</div>
					<div v-else class="space-y-2">
						<div
							v-for="st in mainStations"
							:key="st.deviceId"
							class="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2"
						>
							<span class="truncate text-sm 2xl:text-base">{{ st.name }}</span>
							<span
								class="shrink-0 rounded-full border px-2 py-0.5 text-xs 2xl:text-sm"
								:class="
									st.armed
										? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-100'
										: 'border-amber-400/50 bg-amber-400/20 text-amber-100'
								"
							>
								{{ st.armed ? st.armingStatus : "未佈防" }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="ms-4 flex min-h-0 min-w-0 flex-1 flex-col border-l-2 border-white/30 ps-4">
			<p class="mb-3 text-center text-base font-semibold tracking-[8px] text-white 2xl:text-lg">
				對講事件
			</p>
			<div v-if="events.length === 0" class="py-10 text-center text-white/50">
				尚無對講事件
			</div>
			<div v-else class="show-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
				<article
					v-for="event in events"
					:key="event.id"
					class="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5"
					:aria-label="event.summary"
				>
					<div class="mb-1 flex flex-wrap items-center gap-1.5">
						<span class="rounded bg-blue-500/80 px-1.5 py-0.5 text-[11px] text-white">
							{{ getOperationalSourceLabel(event.source) }}
						</span>
					</div>
					<p class="mb-1 text-sm font-medium text-white 2xl:text-base">
						{{ event.summary }}
					</p>
					<p class="text-xs text-white/55 2xl:text-sm">
						{{ formatDateTime(event.occurred_at) }}
					</p>
				</article>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { getOperationalSourceLabel } from "~/composables/systems/useOperationalEvents"
import { formatDateTime } from "~/utils/dateUtils"
import type {
	AccessSecurityMainStation,
	AccessSecuritySiteLocation,
} from "~/types/accessSecurity"

defineProps<{
	location: AccessSecuritySiteLocation
	mainStations: AccessSecurityMainStation[]
	events: Array<{ id: number; occurred_at: string; source: string; summary: string }>
}>()
</script>
