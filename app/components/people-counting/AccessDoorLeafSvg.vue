<template>
	<svg
		viewBox="0 0 240 180"
		class="access-door-svg h-full w-full"
		xmlns="http://www.w3.org/2000/svg"
	>
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
			<linearGradient :id="`door-interior-grad-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="#4b5c6f" />
				<stop offset="55%" stop-color="#334155" />
				<stop offset="100%" stop-color="#1e293b" />
			</linearGradient>
			<linearGradient :id="`door-interior-light-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(203,213,225,0.22)" />
				<stop offset="100%" stop-color="rgba(203,213,225,0)" />
			</linearGradient>
			<linearGradient :id="`door-interior-floor-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(51,65,85,0.45)" />
				<stop offset="100%" stop-color="rgba(15,23,42,0.7)" />
			</linearGradient>
		</defs>

		<!-- floor / ambient -->
		<rect x="0" y="0" width="240" height="180" fill="rgba(0,0,0,0.06)" />
		<rect x="0" y="148" width="240" height="32" :fill="`url(#door-floor-grad-${uid})`" rx="2" />
		<line x1="0" y1="148" x2="240" y2="148" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

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

		<!-- opening interior (soft hallway, not pure black) -->
		<g class="door-interior" :class="{ 'door-interior--open': open }" aria-hidden="true">
			<rect
				x="78"
				y="22"
				width="84"
				height="128"
				rx="1"
				:fill="`url(#door-interior-grad-${uid})`"
			/>
			<rect
				x="78"
				y="22"
				width="84"
				height="72"
				rx="1"
				:fill="`url(#door-interior-light-${uid})`"
			/>
			<rect
				x="78"
				y="116"
				width="84"
				height="34"
				rx="1"
				:fill="`url(#door-interior-floor-${uid})`"
			/>
		</g>

		<!-- single leaf (hinge left) -->
		<g class="door-scene">
			<g class="door-leaf" :class="{ 'door-leaf--open': open }">
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
			<circle v-if="open" cx="189" cy="55" r="10" fill="#34d399" opacity="0.14" />
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
				:fill="open ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)'"
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
.access-door-svg {
	perspective: 520px;
}

.door-scene {
	transform-style: preserve-3d;
}

.door-leaf {
	transform-origin: 78px 86px;
	transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
	transform: rotateY(0deg);
}

.door-leaf--open {
	transform: rotateY(-82deg);
}

.door-interior {
	transition: filter 0.8s ease;
}

.door-interior--open {
	filter: brightness(1.12);
}
</style>
