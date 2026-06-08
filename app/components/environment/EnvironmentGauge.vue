<template>
	<div class="flex h-full flex-col justify-end space-y-4">
		<!-- 儀表區域 -->
		<div class="flex flex-col items-center space-y-4">
			<div
				class="env-gauge relative aspect-square w-full"
				:class="[gaugeSizeClass, size === 'large' ? 'env-gauge--large' : '']"
			>
				<!-- SVG 弧形指示器 -->
				<svg
					class="absolute inset-0 z-20 h-full w-full -rotate-90 transform"
					viewBox="0 0 240 240"
					style="overflow: visible"
				>
					<path
						:d="fullArcPath"
						fill="none"
						:stroke="arcColor"
						stroke-width="12"
						stroke-linecap="round"
						:stroke-dasharray="arcLength"
						:stroke-dashoffset="arcDashOffset"
						class="transition-all duration-500 ease-out"
						:style="{ opacity: isDataReady ? 1 : 0 }"
					/>
				</svg>

				<!-- 圓形儀表 -->
				<div
					class="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-end rounded-full border-4 border-white pb-4"
				>
					<Transition name="fade" mode="out-in">
						<div :key="displayValue" :class="[valueSizeClass, 'env-gauge-value']">
							{{ displayValue }}
						</div>
					</Transition>
					<Transition name="fade" mode="out-in">
						<div v-if="unit" :key="unit" :class="[unitSizeClass, 'env-gauge-unit']">
							{{ unit }}
						</div>
						<div v-else key="no-unit" :class="[unitSizeClass, 'env-gauge-unit']">--</div>
					</Transition>
					<div class="my-2 h-px w-3/4 bg-white/80"></div>
					<div :class="[titleSizeClass, 'env-gauge-title']">{{ title }}</div>
				</div>
			</div>
		</div>

		<!-- 趨勢圖區域 -->
		<SensorTrendChart
			:type="type"
			:location-id="locationId ?? null"
			:refresh-key="refreshKey"
		/>
	</div>
</template>

<script setup lang="ts">
import SensorTrendChart from "./SensorTrendChart.vue"
import type { SensorParameterType } from "~/types/environment"
import {
	formatSensorValue,
	getParameterDisplayName,
	getParameterUnit,
} from "~/utils/sensorUtils"
import { getGaugeArcColor, getGaugeArcPercentage } from "~/utils/environmentGaugeUtils"

type GaugeSize = "normal" | "large"

interface Props {
	type: SensorParameterType
	value: number | null
	size?: GaugeSize
	locationId?: string | number | null
	/** 與頁面 hydrate 同步，遞增時重載趨勢 */
	refreshKey?: number
	getStatusText: (type: string, value: number | null) => string
}

const props = withDefaults(defineProps<Props>(), {
	size: "normal",
	refreshKey: 0,
})

const sizeConfig = computed(() => {
	if (props.size === "large") {
		return {
			gauge: "max-w-[180px] 2xl:max-w-[220px]",
			value: "text-5xl text-white 2xl:text-6xl",
			unit: "text-xl text-white/80 2xl:text-2xl",
			title: "text-2xl text-white 2xl:text-4xl tracking-[6px] ps-[6px]",
		}
	}
	return {
		gauge: "max-w-[140px] 2xl:max-w-[180px]",
		value: "text-4xl text-white 2xl:text-5xl",
		unit: "text-lg text-white/80 2xl:text-xl",
		title: "text-lg text-white 2xl:text-xl tracking-[4px] ps-[4px]",
	}
})

const gaugeSizeClass = computed(() => sizeConfig.value.gauge)
const valueSizeClass = computed(() => sizeConfig.value.value)
const unitSizeClass = computed(() => sizeConfig.value.unit)
const titleSizeClass = computed(() => sizeConfig.value.title)

const title = computed(() => getParameterDisplayName(props.type))
const unit = computed(() => getParameterUnit(props.type))

const displayValue = computed(() => formatSensorValue(props.type, props.value))

const arcColor = computed(() =>
	getGaugeArcColor(props.type, props.value, props.getStatusText)
)

const center = 120
const radius = 116 * 1.2

const arcStartAngle = -135
const arcEndAngle = 135
const arcAngleRange = arcEndAngle - arcStartAngle

const arcPercentage = computed(() => getGaugeArcPercentage(props.type, props.value))

const fullArcPath = computed(() => {
	const startAngleRad = (arcStartAngle * Math.PI) / 180
	const endAngleRad = (arcEndAngle * Math.PI) / 180
	const startX = center + radius * Math.cos(startAngleRad)
	const startY = center + radius * Math.sin(startAngleRad)
	const endX = center + radius * Math.cos(endAngleRad)
	const endY = center + radius * Math.sin(endAngleRad)
	return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`
})

const arcLength = computed(() => 2 * Math.PI * radius * (arcAngleRange / 360))

const arcDashOffset = computed(() => {
	const percentage = arcPercentage.value
	return arcLength.value * (1 - percentage / 100)
})

const isDataReady = computed(() => props.value !== null && props.value >= 0)
</script>

