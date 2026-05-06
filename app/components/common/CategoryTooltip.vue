<template>
	<div
		v-if="show"
		ref="tooltipRef"
		class="category-tooltip"
		:class="tooltipAlertClass"
		:style="tooltipStyle"
	>
		<div class="tooltip-content">
			<span class="tooltip-title">{{ categoryName }}</span>
			<span :class="['tooltip-status', `status-${resolvedStatusType}`]">
				{{ resolvedStatusLabel }}
			</span>
		</div>
		<div class="tooltip-arrow"></div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue"

interface Props {
	show: boolean
	categoryName: string
	isNormal: boolean
	/** 可覆寫狀態文案；未傳入時維持既有 isNormal 二態行為 */
	statusType?: "normal" | "warning" | "alarm" | "offline"
	/** 與環境監控警報語意一致：無／慢閃／快閃 */
	alertFlash?: "none" | "slow" | "fast"
}

const props = withDefaults(defineProps<Props>(), {
	alertFlash: "none",
})

const tooltipRef = ref<HTMLElement | null>(null)
const tooltipOffsetX = ref(0)

const tooltipAlertClass = computed(() => {
	if (props.alertFlash === "fast") return "blink-fast"
	if (props.alertFlash === "slow") return "blink-slow"
	return ""
})

const resolvedStatusType = computed<"normal" | "warning" | "alarm">(() => {
	const statusType = props.statusType ?? (props.isNormal ? "normal" : "warning")
	if (statusType === "offline") return "warning"
	if (statusType === "alarm") return "alarm"
	if (statusType === "normal") return "normal"
	return "warning"
})

const resolvedStatusLabel = computed(() => {
	if (resolvedStatusType.value === "normal") return "正常"
	if (resolvedStatusType.value === "alarm") return "警報"
	return "異常"
})

const tooltipStyle = computed(() => {
	if (tooltipOffsetX.value === 0) return {}
	return {
		transform: `translate(calc(-50% + ${tooltipOffsetX.value}px), 0)`,
	}
})

const adjustTooltipPosition = () => {
	if (!tooltipRef.value || !props.show) return

	nextTick(() => {
		if (!tooltipRef.value) return

		const rect = tooltipRef.value.getBoundingClientRect()
		const margin = 12
		tooltipOffsetX.value = 0

		if (rect.left < margin) {
			tooltipOffsetX.value = margin - rect.left
		} else if (rect.right > window.innerWidth - margin) {
			tooltipOffsetX.value = window.innerWidth - margin - rect.right
		}
	})
}

watch(
	() => props.show,
	() => {
		if (props.show) {
			nextTick(adjustTooltipPosition)
		}
	}
)
onMounted(() => {
	if (typeof window === "undefined") return
	window.addEventListener("resize", adjustTooltipPosition)
	window.addEventListener("scroll", adjustTooltipPosition, true)
})

onUnmounted(() => {
	if (typeof window === "undefined") return
	window.removeEventListener("resize", adjustTooltipPosition)
	window.removeEventListener("scroll", adjustTooltipPosition, true)
})
</script>

<style scoped>
.category-tooltip {
	position: absolute;
	left: 50%;
	bottom: calc(100% + 12px);
	background: rgba(15, 23, 42, 0.95);
	backdrop-filter: blur(12px);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 12px;
	transform: translateX(-50%);
	padding: 8px 12px;
	white-space: nowrap;
	z-index: 5;
	opacity: 0.9;
	pointer-events: auto;
}

.tooltip-arrow {
	position: absolute;
	left: 50%;
	bottom: -8px;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 8px solid transparent;
	border-right: 8px solid transparent;
	border-top: 8px solid rgba(15, 23, 42, 0.95);
}

.tooltip-arrow::after {
	content: "";
	position: absolute;
	bottom: 1px;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 7px solid transparent;
	border-right: 7px solid transparent;
	border-top: 7px solid rgba(255, 255, 255, 0.2);
}

.status-normal {
	background: rgba(28, 200, 138, 0.2);
	color: #1cc88a;
	border: 1px solid rgba(28, 200, 138, 0.4);
}

.status-warning {
	background: rgba(245, 158, 11, 0.2);
	color: #f59e0b;
	border: 1px solid rgba(245, 158, 11, 0.4);
}

.status-alarm {
	background: rgba(244, 63, 94, 0.2);
	color: #f43f5e;
	border: 1px solid rgba(244, 63, 94, 0.45);
}

.tooltip-content {
	display: flex;
	align-items: center;
	gap: 8px;
}

.tooltip-title {
	font-size: 14px;
	font-weight: 600;
	color: #ffffff;
}

.tooltip-status {
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
}
</style>
