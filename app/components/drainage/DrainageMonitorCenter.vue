<template>
	<div
		class="show-scrollbar relative h-full overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 bg-white/30 space-y-6 px-3 py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">監控中心</h3>

		<div v-for="zone in zones" :key="zone.id || zone.name" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-center gap-3">
				<div class="relative shrink-0">
					<button
						type="button"
						@click="handleZoneClick(zone.id || zone.name || '')"
						:class="[
							'cursor-pointer rounded-full border-2 p-2 transition-all',
							selectedZone === (zone.id || zone.name)
								? 'bg-white text-black/50'
								: 'bg-transparent text-white',
							zoneAlertCount(zone) > 0
								? 'ring-2 ring-red-500/90 ring-offset-2 ring-offset-transparent'
								: '',
						]"
						:aria-label="`${zone.name}，選取此樓層`"
					>
						<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
							{{ zone.name }}
						</h4>
					</button>
					<span
						v-if="zoneAlertCount(zone) > 0"
						class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white 2xl:h-6 2xl:min-w-6 2xl:text-xs"
						aria-hidden="true"
					>
						{{ zoneAlertCount(zone) }}
					</span>
				</div>

				<div class="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
					<template v-for="row in locationsForZone(zone)" :key="row.rowKey">
						<div
							class="flex flex-col rounded-xl border-2 border-white px-3 py-2"
							:class="{
								'ring-2 ring-amber-300/90 ring-offset-2 ring-offset-transparent':
									selectedZone === (zone.id || zone.name) &&
									row.rowKey === highlightLocationKey,
							}"
						>
							<div v-if="equipmentIconSrc(row.loc)" class="mb-1 flex justify-center">
								<NuxtImg
									:src="equipmentIconSrc(row.loc)!"
									:alt="`${row.loc.name} 設備示意`"
									class="h-11 w-11 object-contain 2xl:h-14 2xl:w-14"
									width="56"
									height="56"
								/>
							</div>
							<h4 class="mb-2 whitespace-nowrap text-center text-lg text-white 2xl:text-xl">
								{{ row.loc.name }}
							</h4>

							<template v-if="(row.loc.equipmentKind || 'pump') === 'pump'">
								<div class="flex items-center justify-center gap-2">
									<span
										class="h-3 w-3 shrink-0 rounded-full"
										:class="statusDotClass(pumpUiStatus(zone, row.loc))"
										aria-hidden="true"
									/>
									<span class="text-base text-white 2xl:text-lg">
										{{ statusLabel(pumpUiStatus(zone, row.loc)) }}
									</span>
								</div>
							</template>

							<template v-else>
								<ul class="space-y-2 text-sm text-white/95 2xl:text-base">
									<li class="flex items-center justify-between gap-2">
										<span>水箱蓋狀態</span>
										<span class="flex items-center gap-1">
											<span
												class="h-2.5 w-2.5 rounded-full"
												:class="statusDotClass(tankDerived(row.loc, 'cover'))"
											/>
											{{ tankLabel(row.loc, "cover") }}
										</span>
									</li>
									<li class="flex items-center justify-between gap-2">
										<span>水位狀態</span>
										<span class="flex items-center gap-1">
											<span
												class="h-2.5 w-2.5 rounded-full"
												:class="statusDotClass(tankDerived(row.loc, 'level'))"
											/>
											{{ tankLabel(row.loc, "level") }}
										</span>
									</li>
									<li class="flex flex-wrap items-center gap-2 border-t border-white/20 pt-2">
										<span class="text-white/80">水位警告</span>
										<span
											class="rounded-full border border-white/40 px-2 py-0.5"
											:class="highLowClass(row.loc, 'high')"
										>
											高水位
										</span>
										<span
											class="rounded-full border border-white/40 px-2 py-0.5"
											:class="highLowClass(row.loc, 'low')"
										>
											低水位
										</span>
									</li>
								</ul>
							</template>
						</div>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DrainageZone, DrainageLocation, DrainageStatusItem } from "~/types/drainage";

const DRAINAGE_ICONS = {
	pump: "/drainage/drainage-icon-pump.png",
	coverAlert: "/drainage/drainage-icon-cover-alert.png",
	highLevel: "/drainage/drainage-icon-high-level.png",
	lowLevel: "/drainage/drainage-icon-low-level.png",
	normalLevel: "/drainage/drainage-icon-normal-level.png",
} as const;

type ViewFilter = "all" | "pumping" | "sewage" | "drainage";

const props = defineProps<{
	zones: DrainageZone[];
	statusItems: DrainageStatusItem[];
	selectedZone: string;
	viewFilter: ViewFilter;
	/** 與左側地圖選中點位同步高亮（與樓層管理之 location id 規則一致） */
	highlightLocationKey?: string;
}>();

const emit = defineEmits<{
	zoneSelected: [zoneId: string];
}>();

const handleZoneClick = (zoneId: string) => {
	emit("zoneSelected", zoneId);
};

const itemBySystemId = computed(() => {
	const m = new Map<string, DrainageStatusItem>();
	for (const it of props.statusItems) {
		m.set(String(it.systemId), it);
	}
	return m;
});

const matchesViewFilter = (loc: DrainageLocation): boolean => {
	if (props.viewFilter === "all") return true;
	const vc = loc.viewCategory || "drainage";
	return vc === props.viewFilter;
};

const drainageLocationRowKey = (zone: DrainageZone, loc: DrainageLocation, index: number): string =>
	loc.id || `location-${zone.id || zone.name}-${index}`;

const locationsForZone = (
	zone: DrainageZone
): { loc: DrainageLocation; rowKey: string }[] => {
	const list = zone.locations || [];
	const out: { loc: DrainageLocation; rowKey: string }[] = [];
	list.forEach((loc, index) => {
		if (!matchesViewFilter(loc)) return;
		out.push({ loc, rowKey: drainageLocationRowKey(zone, loc, index) });
	});
	return out;
};

const getItemForLocation = (zone: DrainageZone, loc: DrainageLocation): DrainageStatusItem | null => {
	if (!loc.systemId) return null;
	return itemBySystemId.value.get(String(loc.systemId)) ?? null;
};

const pumpUiStatus = (zone: DrainageZone, loc: DrainageLocation): DrainageStatusItem["uiStatus"] => {
	return getItemForLocation(zone, loc)?.uiStatus ?? "unknown";
};

const zoneAlertCount = (zone: DrainageZone): number => {
	let n = 0;
	for (const { loc } of locationsForZone(zone)) {
		const it = getItemForLocation(zone, loc);
		if (!it) continue;
		if (it.uiStatus === "warning" || it.uiStatus === "alarm") n += 1;
	}
	return n;
};

const statusLabel = (s: DrainageStatusItem["uiStatus"]) => {
	if (s === "normal") return "正常";
	if (s === "warning") return "異常";
	if (s === "alarm") return "警報";
	if (s === "offline") return "離線";
	return "未知";
};

const statusDotClass = (s: DrainageStatusItem["uiStatus"]) => {
	if (s === "normal") return "bg-emerald-400";
	if (s === "warning") return "bg-amber-400";
	if (s === "offline" || s === "unknown") return "bg-slate-400";
	return "bg-rose-500";
};

const equipmentIconSrc = (loc: DrainageLocation): string | null => {
	if (!loc.systemId) return null;
	const kind = loc.equipmentKind || "pump";
	if (kind === "pump") return DRAINAGE_ICONS.pump;
	const it = itemBySystemId.value.get(String(loc.systemId));
	const raw = it?.raw || {};
	if (raw.coverAlarm === true) return DRAINAGE_ICONS.coverAlert;
	if (raw.highLevel === true) return DRAINAGE_ICONS.highLevel;
	if (raw.lowLevel === true) return DRAINAGE_ICONS.lowLevel;
	return DRAINAGE_ICONS.normalLevel;
};

const tankDerived = (loc: DrainageLocation, part: "cover" | "level"): DrainageStatusItem["uiStatus"] => {
	const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : undefined;
	const raw = it?.raw || {};
	if (part === "cover") {
		if (raw.coverAlarm === true) return "alarm";
		return "normal";
	}
	if (raw.levelOk === false) return "alarm";
	if (raw.highLevel === true || raw.lowLevel === true) return "warning";
	return "normal";
};

const tankLabel = (loc: DrainageLocation, part: "cover" | "level") => {
	const s = tankDerived(loc, part);
	if (s === "alarm") return "警報";
	if (s === "warning") return "異常";
	return "正常";
};

const highLowClass = (loc: DrainageLocation, which: "high" | "low") => {
	const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : undefined;
	const raw = it?.raw || {};
	const on = which === "high" ? raw.highLevel === true : raw.lowLevel === true;
	return on ? "border-rose-400 text-rose-200 ring-1 ring-rose-400/80" : "text-white/70";
};
</script>
