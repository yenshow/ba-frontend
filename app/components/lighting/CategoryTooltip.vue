<template>
	<div
		v-if="show"
		ref="tooltipRef"
		class="category-tooltip"
		:class="[tooltipPositionClass, { 'tooltip-compact': !isExpanded, 'tooltip-expanded': isExpanded }]"
		:style="tooltipStyle"
	>
		<!-- 簡短模式：只顯示名稱和狀態 -->
		<div v-show="!isExpanded" class="tooltip-compact-content">
			<span class="tooltip-title-compact">{{ categoryName }}</span>
			<span :class="['tooltip-status-compact', isNormal ? 'status-normal' : 'status-abnormal']">
				{{ isNormal ? "正常" : "異常" }}
			</span>
		</div>
		<!-- 完整模式：顯示所有資訊 -->
		<div v-show="isExpanded" class="tooltip-full-content">
			<div class="tooltip-header">
				<span class="tooltip-title">{{ categoryName }}</span>
				<span :class="['tooltip-status', isNormal ? 'status-normal' : 'status-abnormal']">
					{{ isNormal ? "正常" : "異常" }}
				</span>
			</div>
			<div class="tooltip-content">
				<div class="tooltip-info">
					<span class="tooltip-label">樓層：</span>
					<span class="tooltip-value">{{ floorName }}</span>
				</div>
				<div v-if="roomNames.length > 0" class="tooltip-rooms">
					<span class="tooltip-label">包含區域：</span>
					<div class="tooltip-room-list">
						<span v-for="roomName in roomNames" :key="roomName" class="tooltip-room-item">
							{{ roomName }}
						</span>
					</div>
				</div>
				<div v-else class="tooltip-rooms">
					<span class="tooltip-label">包含區域：</span>
					<span class="tooltip-empty">暫無區域</span>
				</div>
			</div>
		</div>
		<!-- 對話框箭頭（兩種模式都顯示） -->
		<div class="tooltip-arrow" :class="arrowPositionClass"></div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

interface Props {
	show: boolean;
	categoryName: string;
	isNormal: boolean;
	floorName: string;
	roomNames: string[];
	isHovered?: boolean; // 外部傳入的 hover 狀態
}

const props = withDefaults(defineProps<Props>(), {
	isHovered: false
});

const tooltipRef = ref<HTMLElement | null>(null);
const tooltipPosition = ref<"top" | "bottom">("top");
const tooltipOffset = ref({ x: 0, y: 0 });

// 直接使用 props.isHovered 作為展開狀態
const isExpanded = computed(() => props.isHovered);

// 計算對話框位置和箭頭類別
const tooltipPositionClass = computed(() => `tooltip-${tooltipPosition.value}`);
const arrowPositionClass = computed(() => `arrow-${tooltipPosition.value}`);

// 計算對話框樣式
const tooltipStyle = computed(() => {
	const { x, y } = tooltipOffset.value;
	if (x === 0 && y === 0) return {};
	return {
		transform: `translate(calc(-50% + ${x}px), ${y}px)`
	};
});

// 檢查並調整對話框位置
const adjustTooltipPosition = () => {
	if (!tooltipRef.value || !props.show) return;

	nextTick(() => {
		if (!tooltipRef.value) return;

		const tooltip = tooltipRef.value;
		const rect = tooltip.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const margin = 12;

		// 重置偏移
		tooltipOffset.value = { x: 0, y: 0 };

		// 檢查水平邊界
		if (rect.left < margin) {
			tooltipOffset.value.x = margin - rect.left;
		} else if (rect.right > viewportWidth - margin) {
			tooltipOffset.value.x = viewportWidth - margin - rect.right;
		}

		// 簡短模式：固定在上方，不需要垂直調整
		if (!props.isHovered) {
			tooltipPosition.value = "top";
			return;
		}

		// 完整模式：檢查垂直邊界
		if (rect.top < margin) {
			tooltipPosition.value = "bottom";
			tooltipOffset.value.y = margin - rect.top + 60; // 60px 是點的高度加上間距
		} else {
			tooltipPosition.value = "top";
		}
	});
};

// 監聽顯示狀態和展開狀態變化
watch([() => props.show, () => props.isHovered], () => {
	if (props.show) {
		nextTick(() => {
			adjustTooltipPosition();
		});
	}
});

// 監聽視窗大小和滾動變化
onMounted(() => {
	if (typeof window === "undefined") return;
	window.addEventListener("resize", adjustTooltipPosition);
	window.addEventListener("scroll", adjustTooltipPosition, true);
});

onUnmounted(() => {
	if (typeof window === "undefined") return;
	window.removeEventListener("resize", adjustTooltipPosition);
	window.removeEventListener("scroll", adjustTooltipPosition, true);
});
</script>

<style scoped>
/* 對話框提示樣式 */
.category-tooltip {
	position: absolute;
	left: 50%;
	background: rgba(15, 23, 42, 0.95);
	backdrop-filter: blur(12px);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 12px;
	transform-origin: center bottom;
}

.category-tooltip.tooltip-compact {
	min-width: auto;
	max-width: none;
	padding: 8px 12px;
	white-space: nowrap;
	z-index: 5;
	opacity: 0.9;
	pointer-events: auto;
}

.category-tooltip.tooltip-expanded {
	min-width: 240px;
	max-width: 320px;
	padding: 16px;
	z-index: 1000;
	pointer-events: auto;
}

.category-tooltip.tooltip-top {
	bottom: calc(100% + 12px);
	transform: translateX(-50%);
}

.category-tooltip.tooltip-bottom {
	top: calc(100% + 12px);
	transform: translateX(-50%);
}

.tooltip-arrow {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 8px solid transparent;
	border-right: 8px solid transparent;
}

.tooltip-arrow.arrow-top {
	bottom: -8px;
	border-top: 8px solid rgba(15, 23, 42, 0.95);
}

.tooltip-arrow.arrow-top::after {
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

.tooltip-arrow.arrow-bottom {
	top: -8px;
	border-bottom: 8px solid rgba(15, 23, 42, 0.95);
}

.tooltip-arrow.arrow-bottom::after {
	content: "";
	position: absolute;
	top: 1px;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 7px solid transparent;
	border-right: 7px solid transparent;
	border-bottom: 7px solid rgba(255, 255, 255, 0.2);
}

.tooltip-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-title {
	font-size: 18px;
	font-weight: 600;
	color: #ffffff;
}

.tooltip-status {
	padding: 4px 12px;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
}

.status-normal {
	background: rgba(28, 200, 138, 0.2);
	color: #1cc88a;
	border: 1px solid rgba(28, 200, 138, 0.4);
}

.status-abnormal {
	background: rgba(245, 101, 101, 0.2);
	color: #f56565;
	border: 1px solid rgba(245, 101, 101, 0.4);
}

.tooltip-content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.tooltip-info {
	display: flex;
	align-items: center;
	gap: 8px;
}

.tooltip-label {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.6);
	font-weight: 400;
}

.tooltip-value {
	font-size: 14px;
	color: #ffffff;
	font-weight: 500;
}

.tooltip-rooms {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.tooltip-room-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.tooltip-room-item {
	padding: 4px 10px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 6px;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.9);
	border: 1px solid rgba(255, 255, 255, 0.15);
}

.tooltip-empty {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.5);
	font-style: italic;
}

/* 簡短模式樣式 */
.tooltip-compact-content {
	display: flex;
	align-items: center;
	gap: 8px;
}

.tooltip-title-compact {
	font-size: 14px;
	font-weight: 600;
	color: #ffffff;
}

.tooltip-status-compact {
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
}

/* 響應式設計 */
@media (min-width: 1280px) {
	.category-tooltip.tooltip-expanded {
		min-width: 280px;
		max-width: 360px;
		padding: 20px;
	}

	.tooltip-title {
		font-size: 20px;
	}

	.tooltip-label,
	.tooltip-value {
		font-size: 15px;
	}
}

@media (min-width: 1536px) {
	.category-tooltip.tooltip-expanded {
		min-width: 320px;
		max-width: 400px;
		padding: 24px;
	}

	.tooltip-title {
		font-size: 22px;
	}

	.tooltip-label,
	.tooltip-value {
		font-size: 16px;
	}
}
</style>
