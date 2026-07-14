<template>
	<svg viewBox="0 0 240 180" class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient :id="`barrier-post-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="#cbd5e1" />
				<stop offset="100%" stop-color="#475569" />
			</linearGradient>
			<linearGradient :id="`barrier-road-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(15,23,42,0.45)" />
				<stop offset="100%" stop-color="rgba(2,6,23,0.75)" />
			</linearGradient>
		</defs>

		<rect x="0" y="0" width="240" height="180" fill="rgba(0,0,0,0.08)" />
		<rect x="0" y="142" width="240" height="38" :fill="`url(#barrier-road-grad-${uid})`" rx="2" />
		<line
			x1="120"
			y1="142"
			x2="120"
			y2="180"
			stroke="rgba(250,204,21,0.35)"
			stroke-width="3"
			stroke-dasharray="10 8"
		/>
		<line x1="0" y1="142" x2="240" y2="142" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

		<rect x="40" y="100" width="18" height="46" :fill="`url(#barrier-post-grad-${uid})`" rx="2" />
		<rect x="36" y="136" width="26" height="8" fill="rgba(100,116,139,0.65)" rx="2" />
		<rect x="34" y="88" width="30" height="16" fill="#64748b" rx="3" />
		<rect x="38" y="92" width="8" height="8" rx="1" :fill="raised ? '#34d399' : '#334155'" />

		<g class="barrier-arm" :class="{ 'barrier-arm--busy': busy }" :style="armStyle">
			<rect x="48" y="116" width="10" height="10" fill="#475569" rx="1" />
			<rect x="56" y="118" width="132" height="9" fill="#e2e8f0" rx="1.5" />
			<rect
				v-for="stripe in armStripes"
				:key="stripe.x"
				:x="stripe.x"
				y="118"
				width="22"
				height="9"
				:fill="stripe.fill"
				rx="1"
			/>
		</g>

		<circle
			v-if="raised"
			cx="52"
			cy="123"
			r="16"
			class="barrier-glow"
			:class="locked ? 'barrier-glow--locked' : 'barrier-glow--open'"
		/>
	</svg>
</template>

<script setup lang="ts">
import { useId } from "vue"

defineProps<{
	raised: boolean
	locked: boolean
	busy?: boolean
	armStyle: Record<string, string>
}>()

const uid = useId()

const armStripes = [
	{ x: 56, fill: "#ef4444" },
	{ x: 78, fill: "#f8fafc" },
	{ x: 100, fill: "#ef4444" },
	{ x: 122, fill: "#f8fafc" },
	{ x: 144, fill: "#ef4444" },
	{ x: 166, fill: "#f8fafc" },
]
</script>

<style scoped>
.barrier-arm {
	transition: transform 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95);
}

.barrier-arm--busy {
	animation: barrier-arm-busy 1.4s ease-in-out;
}

.barrier-glow {
	fill: none;
	stroke-width: 2;
	opacity: 0.55;
}

.barrier-glow--open {
	stroke: rgba(52, 211, 153, 0.7);
	animation: barrier-glow-pulse 2s ease-in-out infinite;
}

.barrier-glow--locked {
	stroke: rgba(94, 184, 232, 0.85);
	animation: barrier-glow-pulse 1.4s ease-in-out infinite;
}

@keyframes barrier-arm-busy {
	0%,
	100% {
		filter: brightness(1);
	}
	50% {
		filter: brightness(1.25);
	}
}

@keyframes barrier-glow-pulse {
	0%,
	100% {
		opacity: 0.35;
	}
	50% {
		opacity: 0.75;
	}
}
</style>
