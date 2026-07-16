<template>
	<svg viewBox="0 0 240 180" class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient :id="`door-frame-grad-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#e2e8f0" />
				<stop offset="45%" stop-color="#94a3b8" />
				<stop offset="100%" stop-color="#64748b" />
			</linearGradient>
			<linearGradient :id="`door-leaf-grad-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="#d8dee9" />
				<stop offset="35%" stop-color="#c5ced9" />
				<stop offset="70%" stop-color="#9aa7b8" />
				<stop offset="100%" stop-color="#7b8899" />
			</linearGradient>
			<linearGradient :id="`door-panel-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(71,85,105,0.28)" />
				<stop offset="100%" stop-color="rgba(148,163,184,0.12)" />
			</linearGradient>
			<linearGradient :id="`door-floor-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(15,23,42,0.3)" />
				<stop offset="100%" stop-color="rgba(2,6,23,0.75)" />
			</linearGradient>
			<clipPath :id="`door-opening-clip-${uid}`">
				<rect x="78" y="22" width="84" height="128" rx="1" />
			</clipPath>
		</defs>

		<!-- floor / ambient -->
		<rect x="0" y="0" width="240" height="180" fill="rgba(0,0,0,0.08)" />
		<rect x="0" y="148" width="240" height="32" :fill="`url(#door-floor-grad-${uid})`" rx="2" />
		<line x1="0" y1="148" x2="240" y2="148" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

		<!-- cyan outer accent -->
		<rect
			x="66"
			y="10"
			width="108"
			height="148"
			rx="4"
			fill="none"
			stroke="rgba(125,211,252,0.28)"
			stroke-width="2"
		/>

		<!-- thin metallic frame -->
		<rect
			x="72"
			y="16"
			width="96"
			height="140"
			rx="2"
			:fill="`url(#door-frame-grad-${uid})`"
			stroke="rgba(226,232,240,0.55)"
			stroke-width="1.5"
		/>

		<!-- frame inner recess -->
		<rect x="78" y="22" width="84" height="128" rx="1" fill="#0f172a" />

		<!-- single leaf (hinge left) -->
		<g class="door-leaf" :class="{ 'door-leaf--open': open }" style="transform-origin: 78px 86px">
			<rect
				x="78"
				y="22"
				width="84"
				height="128"
				rx="1"
				:fill="`url(#door-leaf-grad-${uid})`"
				stroke="rgba(241,245,249,0.55)"
				stroke-width="1"
			/>
			<!-- top recessed panel -->
			<rect
				x="94"
				y="34"
				width="52"
				height="40"
				rx="1.5"
				:fill="`url(#door-panel-grad-${uid})`"
				stroke="rgba(71,85,105,0.35)"
				stroke-width="1"
			/>
			<!-- bottom recessed panel -->
			<rect
				x="94"
				y="88"
				width="52"
				height="48"
				rx="1.5"
				:fill="`url(#door-panel-grad-${uid})`"
				stroke="rgba(71,85,105,0.35)"
				stroke-width="1"
			/>
			<!-- vertical handle (right side) -->
			<rect x="151" y="74" width="5" height="22" rx="1.5" fill="#e2e8f0" />
			<rect x="151.5" y="75" width="2" height="20" rx="1" fill="#94a3b8" opacity="0.7" />
		</g>

		<!-- wall-mounted door status indicator (right side) -->
		<g aria-hidden="true">
			<rect
				x="178"
				y="44"
				width="22"
				height="22"
				rx="3.5"
				fill="#3d4f63"
				stroke="rgba(148,163,184,0.5)"
				stroke-width="1"
			/>
			<circle v-if="open" cx="189" cy="55" r="12" fill="#34d399" opacity="0.22" />
			<circle
				cx="189"
				cy="55"
				r="7"
				:fill="open ? '#34d399' : '#1e293b'"
				stroke="rgba(15,23,42,0.55)"
				stroke-width="0.75"
			/>
			<circle
				cx="186.5"
				cy="52.5"
				r="2"
				:fill="open ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'"
			/>
		</g>
	</svg>
</template>

<script setup lang="ts">
import { useId } from "vue"

defineProps<{
	open: boolean
}>()

const uid = useId()
</script>

<style scoped>
.door-leaf {
	transition: transform 1.35s cubic-bezier(0.45, 0.05, 0.55, 0.95);
	transform: scaleX(1);
}

.door-leaf--open {
	transform: scaleX(0.25);
}
</style>
