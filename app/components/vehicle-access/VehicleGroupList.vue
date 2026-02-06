<template>
	<div class="space-y-4">
		<h3 class="bg-white/20 py-1 text-center text-lg font-semibold text-white 2xl:text-xl">
			車輛群組
		</h3>
		<div
			v-if="!groups || groups.length === 0"
			class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
		>
			<p class="text-sm text-white/60 xl:text-base">尚無群組資料</p>
		</div>
		<div v-else class="grid grid-cols-4 gap-4">
			<button
				v-for="group in groups"
				:key="group.key"
				type="button"
				class="flex flex-col items-center justify-center border-2 border-white/0 py-2 transition-all"
				:class="{
					'cursor-pointer bg-white/20': group.onSiteCount > 0,
					'cursor-pointer bg-black/20': group.onSiteCount === 0
				}"
				tabindex="0"
				role="button"
				:aria-label="`查看 ${group.name} 車輛名單`"
				@click="handleGroupClick(group)"
				@keydown.enter="handleGroupClick(group)"
				@keydown.space.prevent="handleGroupClick(group)"
			>
				<div class="text-base font-semibold tracking-wide text-white 2xl:text-lg">
					{{ group.name }}
				</div>
				<div class="space-x-0.5 text-base text-white 2xl:text-lg">
					<span class="text-green-400">{{ group.onSiteCount }}</span>
					<span>/</span>
					<span>{{ group.totalPassCount }}</span>
				</div>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
export interface VehicleGroupItem {
	key: string;
	id: number;
	name: string;
	entryCount: number;
	exitCount: number;
	onSiteCount: number;
	totalPassCount: number;
}

interface Props {
	groups: VehicleGroupItem[];
}

defineProps<Props>();

const emit = defineEmits<{
	(e: "select", key: string): void;
}>();

const handleGroupClick = (group: VehicleGroupItem) => {
	emit("select", group.key);
};
</script>
