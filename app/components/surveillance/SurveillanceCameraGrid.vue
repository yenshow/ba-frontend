<template>
	<div class="w-full">
		<div :class="['grid gap-4', gridClass]">
			<div
				v-for="(view, index) in displayViews"
				:key="`view-${view.deviceId}-${view.position}-${index}`"
				:ref="(el: HTMLElement | null) => setViewRef(el, index)"
				:class="[
					'relative overflow-hidden rounded-lg border-2 bg-black',
					isSelected(view.deviceId)
						? 'border-blue-500 ring-2 ring-blue-500'
						: 'border-gray-300 dark:border-gray-700'
				]"
				:style="{ aspectRatio: '16/9' }"
			>
				<div
					v-if="(view.webrtcUrl || view.streamStatus === 'loading') && isViewVisible(index)"
					class="absolute inset-0"
				>
					<SurveillanceVideoPlayer
						:key="`player-${view.deviceId}-${view.position}-${index}`"
						:webrtc-url="view.webrtcUrl"
						:stream-status="view.streamStatus"
						class="h-full w-full"
					/>
				</div>

				<div
					v-else-if="!view.webrtcUrl && view.streamStatus !== 'loading'"
					class="absolute inset-0 flex items-center justify-center bg-gray-900"
				>
					<p class="text-sm text-gray-400 2xl:text-base">無串流</p>
				</div>

				<!-- 設備名稱覆蓋層 -->
				<div
					class="absolute left-0 top-0 z-20 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap rounded-br bg-black/60 px-2 py-1 text-xs font-medium text-white 2xl:text-base"
				>
					{{ getCameraName(view.deviceId) }}
				</div>

				<div class="absolute right-0 top-0 z-20 flex shrink-0 gap-1 p-1.5">
					<button
						@click.stop="$emit('remove', view.deviceId)"
						class="shrink-0 whitespace-nowrap rounded bg-gray-500/80 px-1.5 py-0.5 text-white transition-colors hover:bg-gray-600 text-xs 2xl:px-2 2xl:py-1 2xl:text-xs"
						title="移除畫面"
					>
						移除
					</button>
				</div>
			</div>

			<div
				v-for="idx in emptySlots"
				:key="`empty-${idx}`"
				class="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
			>
				<p class="text-sm text-gray-400 2xl:text-base dark:text-gray-500">空位</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick, watch } from "vue";
import type { SurveillanceCamera, MonitorView, GridLayout } from "~/types/surveillance";

interface Props {
	cameras: readonly SurveillanceCamera[];
	views: readonly MonitorView[];
	layout: GridLayout;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	remove: [deviceId: number];
}>();

const viewRefs = ref<(HTMLElement | null)[]>([]);
const visibleViews = ref<Set<number>>(new Set());
let intersectionObserver: IntersectionObserver | null = null;

const setViewRef = (el: HTMLElement | null, index: number) => {
	if (el) viewRefs.value[index] = el;
};

const isViewVisible = (index: number): boolean => visibleViews.value.has(index);

const initIntersectionObserver = () => {
	if (typeof IntersectionObserver === "undefined") {
		displayViews.value.forEach((_, i) => visibleViews.value.add(i));
		return;
	}
	intersectionObserver = new IntersectionObserver(
		entries => {
			const next = new Set(visibleViews.value);
			entries.forEach(entry => {
				const index = parseInt(entry.target.getAttribute("data-view-index") || "-1");
				if (index < 0) return;
				if (entry.isIntersecting) next.add(index);
				else next.delete(index);
			});
			visibleViews.value = next;
		},
		{ threshold: 0.1, rootMargin: "50px" }
	);
	nextTick(() => {
		viewRefs.value.forEach((el, index) => {
			if (el) {
				el.setAttribute("data-view-index", index.toString());
				intersectionObserver?.observe(el);
			}
		});
	});
};

const gridClass = computed(() => {
	switch (props.layout) {
		case "1": return "grid-cols-1";
		case "4": return "grid-cols-2";
		case "9": return "grid-cols-3";
		default: return "grid-cols-1";
	}
});

const maxViews = computed(() => parseInt(props.layout));

const displayViews = computed(() =>
	[...props.views].sort((a, b) => a.position - b.position).slice(0, maxViews.value)
);

const emptySlots = computed(() =>
	Math.max(0, maxViews.value - displayViews.value.length)
);

const cameraMap = computed(() => {
	const map = new Map<number, SurveillanceCamera>();
	props.cameras.forEach(c => map.set(c.id, c));
	return map;
});

const getCamera = (deviceId: number): SurveillanceCamera | undefined =>
	cameraMap.value.get(deviceId);

const getCameraName = (deviceId: number): string =>
	getCamera(deviceId)?.name || `設備 ${deviceId}`;

const isSelected = (_deviceId: number): boolean => false;

watch(
	() => displayViews.value.length,
	() => {
		nextTick(() => {
			if (intersectionObserver) {
				viewRefs.value.forEach(el => {
					if (el) intersectionObserver?.unobserve(el);
				});
			}
			visibleViews.value.clear();
			initIntersectionObserver();
		});
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	if (intersectionObserver) {
		intersectionObserver.disconnect();
		intersectionObserver = null;
	}
	visibleViews.value.clear();
});

onMounted(() => initIntersectionObserver());
</script>
