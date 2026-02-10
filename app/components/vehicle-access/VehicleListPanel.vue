<template>
	<div class="space-y-4">
		<h3 class="bg-white/20 py-1 text-center text-lg font-semibold text-white 2xl:text-xl">
			車輛名單
		</h3>
		<div
			v-if="isLoading"
			class="flex justify-center rounded-lg border-2 border-white/20 bg-white/5 py-8"
		>
			<div
				class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
			></div>
		</div>
		<div
			v-else-if="!items || items.length === 0"
			class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
		>
			<p class="text-sm text-white/60 xl:text-base">尚無車輛名單資料</p>
		</div>
		<div v-else class="grid grid-cols-2 gap-2 overflow-y-auto max-h-[400px] 2xl:max-h-[520px]">
			<button
				v-for="item in items"
				:key="item.id"
				type="button"
				class="flex flex-col items-center justify-center gap-0.5 border-2 border-white/0 py-2 transition-all"
				:class="{
					'cursor-pointer bg-white/20': item.onSiteCount > 0,
					'cursor-pointer bg-black/20 hover:bg-black/30': item.onSiteCount === 0
				}"
				tabindex="0"
				role="button"
				:aria-label="`查看 ${item.owner_name || item.plate_license || ''} 過車記錄`"
				@click="handleSelect(item)"
				@keydown.enter="handleSelect(item)"
				@keydown.space.prevent="handleSelect(item)"
			>
				<div class="text-sm font-semibold tracking-wide text-white 2xl:text-base truncate max-w-full px-1">
					{{ item.owner_name?.trim() || item.plate_license?.trim() || "-" }}
				</div>
				<div v-if="item.plate_license?.trim() && item.owner_name?.trim()" class="text-xs text-white/70 truncate max-w-full px-1">
					{{ item.plate_license.trim() }}
				</div>
				<div class="flex items-center gap-1 text-xs text-white 2xl:text-sm">
					<span :class="item.onSiteCount > 0 ? 'text-green-400' : 'text-white/70'">
						{{ item.onSiteCount > 0 ? "在場" : "未在場" }}
					</span>
					<span class="text-white/60">({{ item.entryCount }}/{{ item.exitCount }})</span>
				</div>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleListItemWithStatus } from "~/types/vehicleAccess";

interface Props {
	items: VehicleListItemWithStatus[] | null;
	isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
	isLoading: false
});

const emit = defineEmits<{
	(e: "select", plate: string): void;
}>();

const handleSelect = (item: VehicleListItemWithStatus) => {
	const plate = item.plate_license?.trim() ?? "";
	if (plate) emit("select", plate);
};
</script>
