<template>
	<svg
		viewBox="0 0 140 280"
		class="h-full w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
		aria-label="電梯井道運行示意"
	>
		<defs>
			<linearGradient :id="`building-frame-grad-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#e2e8f0" />
				<stop offset="45%" stop-color="#94a3b8" />
				<stop offset="100%" stop-color="#64748b" />
			</linearGradient>
			<linearGradient :id="`shaft-recess-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(15,23,42,0.3)" />
				<stop offset="100%" stop-color="rgba(2,6,23,0.75)" />
			</linearGradient>
			<linearGradient :id="`cabin-leaf-grad-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="#d8dee9" />
				<stop offset="35%" stop-color="#c5ced9" />
				<stop offset="70%" stop-color="#9aa7b8" />
				<stop offset="100%" stop-color="#7b8899" />
			</linearGradient>
			<linearGradient :id="`cabin-panel-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(71,85,105,0.28)" />
				<stop offset="100%" stop-color="rgba(148,163,184,0.12)" />
			</linearGradient>
			<clipPath :id="`shaft-clip-${uid}`">
				<rect :x="SHAFT.x" :y="SHAFT.y" :width="SHAFT.w" :height="SHAFT.h" rx="2" />
			</clipPath>
		</defs>

		<!-- ambient -->
		<rect x="0" y="0" width="140" height="280" fill="rgba(0,0,0,0.08)" />

		<!-- cyan outer accent -->
		<rect
			x="18"
			y="14"
			width="96"
			height="232"
			rx="4"
			fill="none"
			stroke="rgba(125,211,252,0.28)"
			stroke-width="2"
		/>

		<!-- building metallic frame -->
		<rect
			x="24"
			y="20"
			width="84"
			height="224"
			rx="2"
			:fill="`url(#building-frame-grad-${uid})`"
			stroke="rgba(226,232,240,0.55)"
			stroke-width="1.5"
		/>
		<rect x="20" y="8" width="92" height="10" rx="2" fill="#475569" />

		<!-- shaft recess -->
		<rect
			:x="SHAFT.x"
			:y="SHAFT.y"
			:width="SHAFT.w"
			:height="SHAFT.h"
			rx="2"
			:fill="`url(#shaft-recess-grad-${uid})`"
			stroke="rgba(148,163,184,0.35)"
			stroke-width="1"
		/>
		<rect
			:x="SHAFT.x + 2"
			:y="SHAFT.y + 2"
			:width="SHAFT.w - 4"
			:height="SHAFT.h - 4"
			rx="1"
			fill="#0f172a"
		/>

		<!-- guide rails -->
		<line
			:x1="SHAFT.x + 5"
			:y1="SHAFT.y + 4"
			:x2="SHAFT.x + 5"
			:y2="SHAFT.y + SHAFT.h - 4"
			stroke="rgba(125,211,252,0.4)"
			stroke-width="2"
		/>
		<line
			:x1="SHAFT.x + SHAFT.w - 5"
			:y1="SHAFT.y + 4"
			:x2="SHAFT.x + SHAFT.w - 5"
			:y2="SHAFT.y + SHAFT.h - 4"
			stroke="rgba(125,211,252,0.4)"
			stroke-width="2"
		/>

		<!-- subtle floor reference lines -->
		<g aria-hidden="true" opacity="0.2">
			<line
				:x1="SHAFT.x + 8"
				:y1="SHAFT.y + 6"
				:x2="SHAFT.x + SHAFT.w - 8"
				:y2="SHAFT.y + 6"
				stroke="rgba(148,163,184,0.6)"
				stroke-width="1"
			/>
			<line
				:x1="SHAFT.x + 8"
				:y1="SHAFT.y + SHAFT.h - 6"
				:x2="SHAFT.x + SHAFT.w - 8"
				:y2="SHAFT.y + SHAFT.h - 6"
				stroke="rgba(148,163,184,0.6)"
				stroke-width="1"
			/>
		</g>

		<!-- cabin -->
		<g :clip-path="`url(#shaft-clip-${uid})`">
			<line
				:x1="SHAFT.x + SHAFT.w / 2"
				:y1="SHAFT.y"
				:x2="SHAFT.x + SHAFT.w / 2"
				:y2="cabinTopY"
				stroke="rgba(148,163,184,0.65)"
				stroke-width="2"
			/>
			<g
				class="elevator-cabin"
				:class="{
					'elevator-cabin--moving': isMoving,
					'elevator-cabin--dim': !isConnected,
				}"
				:style="{ transform: `translateY(${cabinTopY}px)` }"
			>
				<rect
					:x="CABIN_X"
					y="0"
					:width="CABIN_W"
					:height="CABIN_H"
					rx="3"
					:fill="`url(#cabin-leaf-grad-${uid})`"
					stroke="rgba(241,245,249,0.65)"
					stroke-width="1.25"
				/>
				<rect
					:x="CABIN_X + 6"
					y="6"
					:width="CABIN_W - 12"
					height="12"
					rx="1.5"
					:fill="`url(#cabin-panel-grad-${uid})`"
					stroke="rgba(71,85,105,0.35)"
					stroke-width="1"
				/>
				<rect
					:x="CABIN_X + 6"
					:y="CABIN_H - 18"
					:width="CABIN_W - 12"
					height="12"
					rx="1.5"
					:fill="`url(#cabin-panel-grad-${uid})`"
					stroke="rgba(71,85,105,0.35)"
					stroke-width="1"
				/>
				<line
					:x1="SHAFT.x + SHAFT.w / 2"
					y1="8"
					:x2="SHAFT.x + SHAFT.w / 2"
					:y2="CABIN_H - 8"
					stroke="rgba(15,23,42,0.4)"
					stroke-width="1.5"
				/>
			</g>
		</g>
	</svg>
</template>

<script setup lang="ts">
import { computed, useId } from "vue"
import type { ElevatorLogicalFloor } from "~/types/elevator"

const SHAFT = { x: 32, y: 28, w: 68, h: 210 } as const
const CABIN_H = 48
const CABIN_X = SHAFT.x + 10
const CABIN_W = SHAFT.w - 20
const TRAVEL = SHAFT.h - CABIN_H - 8

const props = withDefaults(
	defineProps<{
		floors?: ElevatorLogicalFloor[]
		currentRank?: number | null
		isMoving?: boolean
		isConnected?: boolean
	}>(),
	{
		floors: () => [],
		currentRank: null,
		isMoving: false,
		isConnected: true,
	}
)

const uid = useId()

const cabinTopY = computed(() => {
	const ranks = (props.floors ?? [])
		.map((f) => f.rank)
		.filter((r): r is number => typeof r === "number" && Number.isFinite(r))
	const rank = props.currentRank
	const base = SHAFT.y + 4
	if (!ranks.length || rank == null || !Number.isFinite(rank)) return base + TRAVEL / 2
	const min = Math.min(...ranks)
	const max = Math.max(...ranks)
	const progress = max === min ? 0.5 : Math.min(1, Math.max(0, (rank - min) / (max - min)))
	return base + (1 - progress) * TRAVEL
})
</script>

<style scoped>
.elevator-cabin {
	transition: transform 1.35s cubic-bezier(0.45, 0.05, 0.55, 0.95);
}

.elevator-cabin--moving {
	filter: drop-shadow(0 0 8px rgba(103, 232, 249, 0.55));
}

.elevator-cabin--dim {
	opacity: 0.55;
}
</style>
