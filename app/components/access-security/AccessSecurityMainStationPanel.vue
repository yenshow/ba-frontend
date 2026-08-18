<template>
	<div class="shrink-0">
		<div
			class="flex items-center gap-3 rounded-xl px-3 py-2.5 2xl:gap-4 2xl:px-4 2xl:py-3"
			:class="
				station
					? 'bg-cyan-500/15 ring-1 ring-cyan-300/25'
					: 'border border-dashed border-white/20 bg-white/5'
			"
		>
			<div :class="[iconBoxClass, { 'opacity-50': !station }]">
				<AccessIntercomManageSvg />
			</div>
			<div v-if="station" class="min-w-0 flex-1">
				<div class="mb-2 flex items-start justify-between gap-2">
					<p class="min-w-0 truncate text-sm font-medium text-white 2xl:text-base">
						{{ station.name }}
					</p>
					<span
						class="shrink-0 rounded-full border px-2 py-0.5 text-xs 2xl:text-sm"
						:class="armingBadgeClass(station)"
					>
						{{ formatArmingLabel(station) }}
					</span>
				</div>
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-white/80 2xl:text-sm">
					<dt class="text-white/50">位址</dt>
					<dd class="truncate">{{ station.host || "—" }}</dd>
					<dt class="text-white/50">連接埠</dt>
					<dd>{{ station.port }}</dd>
				</dl>
			</div>
			<p v-else class="text-sm text-white/50 2xl:text-base">尚未綁定此區域主機</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { AccessSecurityMainStation } from "~/types/accessSecurity"
import AccessIntercomManageSvg from "~/components/access-security/AccessIntercomManageSvg.vue"

const props = defineProps<{
	mainStations: AccessSecurityMainStation[]
}>()

const station = computed(() => props.mainStations[0] ?? null)
const iconBoxClass = "h-[140px] w-[260px] shrink-0 2xl:h-[176px] 2xl:w-[320px]"

const formatArmingLabel = (st: AccessSecurityMainStation): string => {
	if (!st.armed) return "未佈防"
	if (st.armingStatus === "ready") return "已佈防"
	if (st.armingStatus === "connecting") return "連線中"
	if (st.armingStatus === "stopped") return "已停止"
	return st.armingStatus
}

const armingBadgeClass = (st: AccessSecurityMainStation): string => {
	if (!st.armed) return "border-amber-400/50 bg-amber-400/20 text-amber-100"
	if (st.armingStatus === "ready") {
		return "border-emerald-400/50 bg-emerald-400/20 text-emerald-100"
	}
	return "border-sky-400/50 bg-sky-400/20 text-sky-100"
}
</script>
