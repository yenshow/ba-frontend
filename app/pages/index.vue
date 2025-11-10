<template>
	<!-- Main Content -->
	<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 2xl:gap-8">
		<!-- Left Column -->
		<div class="col-span-2 space-y-4 2xl:space-y-8">
			<!-- Data Cards Section -->
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80">
				<div class="grid grid-cols-1 xl:grid-cols-12 h-full">
					<!-- AQI Card -->
					<AQICard class="col-span-1 xl:col-span-7" :aqi="aqiData" />

					<!-- Environmental Card -->
					<EnvironmentCard class="col-span-1 xl:col-span-5" :data="environmentData" />
				</div>
			</div>

			<!-- System Modules Section -->
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 px-8 xl:px-12 2xl:px-24">
				<SystemModule />
			</div>
		</div>

		<!-- Right Column -->
		<div class="col-span-1 grid grid-rows-12">
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 row-span-12">
				<!-- Building Image Card -->
				<BuildingCard />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import AQICard from "~/components/common/AQICard.vue";
import EnvironmentCard from "~/components/common/EnvironmentCard.vue";
import BuildingCard from "~/components/common/BuildingCard.vue";
import SystemModule from "~/components/common/SystemModule.vue";

definePageMeta({
	layout: "default"
});

// 模擬數據
const aqiData = ref({
	value: 25,
	location: "1F 管理中心",
	metrics: [
		{ label: "PM2.5", value: 0, unit: "µg/m³" },
		{ label: "CO", value: 0, unit: "ppm" },
		{ label: "PM10", value: 0, unit: "µg/m³" },
		{ label: "SO2", value: 0, unit: "g/L" },
		{ label: "PM1", value: 0, unit: "µg/m³" },
		{ label: "NO2", value: 0, unit: "g/cm³" }
	]
});

const environmentData = ref({
	temperature: 36.0,
	location: "1F 閱覽室",
	metrics: [
		{ label: "溫度", value: 36.0, unit: "°C", icon: "temperature" },
		{ label: "溼度", value: 61, unit: "%", icon: "humidity" },
		{ label: "風速", value: 1.4, unit: "km/h", icon: "wind" }
	]
});
</script>
