<template>
	<div class="flex min-w-0 flex-1 items-end gap-2">
		<!-- 點位名稱 -->
		<label
			class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0"
		>
			<span>點位名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：主燈開關"
				@blur="handleChange"
			/>
		</label>

		<!-- 控制器 -->
		<label
			class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0"
		>
			<span>控制器</span>
			<FilterDropdown
				v-model="deviceIdString"
				:options="deviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
				@update:modelValue="handleDeviceChange"
			/>
		</label>

		<!-- Modbus 配置（當選擇了設備時顯示） -->
		<template
			v-if="
				localLocation.deviceId && localLocation.deviceId > 0 && localLocation.modbus?.points?.[0]
			"
		>
			<!-- Modbus 類型 -->
			<label
				class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>類型 *</span>
				<select
					v-model="localLocation.modbus.points[0].type"
					class="form-input-small form-select w-full"
					required
					@change="handleChange"
				>
					<option value="DO">DO</option>
					<option value="DI">DI</option>
				</select>
			</label>

			<!-- Modbus 地址 -->
			<label
				class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>地址 *</span>
				<div class="relative w-full">
					<input
						v-model.number="localLocation.modbus.points[0].address"
						type="number"
						min="0"
						placeholder="地址"
						required
						class="form-input-small w-full transition-all"
						:class="
							hasDuplicateAddress
								? 'animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]'
								: ''
						"
						title="此地址已被使用"
						@blur="handleChange"
					/>
					<div
						v-if="hasDuplicateAddress"
						class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
						title="此地址已被使用"
					>
						<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</div>
			</label>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { LightingLocation } from "~/types/lighting"
import type { Device } from "~/types/device"
import { useLightingLocationValidation } from "~/composables/location/validation/useLightingLocationValidation"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

interface Props {
	location: LightingLocation
	allLocations?: LightingLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: LightingLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const emit = defineEmits<Emits>()

const { checkDuplicateAddress } = useLightingLocationValidation()

// 本地副本，用於雙向綁定
const localLocation = ref<LightingLocation>({ ...props.location })

// 設備 ID 字串（用於 FilterDropdown）
const deviceIdString = ref("")

// 初始化 modbus 配置的輔助函數（確保 deviceId 與 location.deviceId 一致，避免讀寫錯設備）
const ensureModbusConfig = (location: LightingLocation) => {
	if (location.deviceId && location.deviceId > 0) {
		if (!location.modbus) {
			location.modbus = {
				deviceId: location.deviceId,
				points: [],
			}
		} else {
			// 同步 modbus.deviceId 與 location.deviceId，否則照明狀態會用錯設備讀寫
			location.modbus.deviceId = location.deviceId
		}
		if (!location.modbus.points || location.modbus.points.length === 0) {
			location.modbus.points = [
				{
					address: 0,
					type: "DO",
				},
			]
		}
	}
}

// 監聽 props.location 變化
watch(
	() => props.location,
	(newLocation) => {
		localLocation.value = { ...newLocation }
		ensureModbusConfig(localLocation.value)
		// 更新設備 ID 字串（用於 FilterDropdown）
		deviceIdString.value =
			localLocation.value.deviceId > 0 ? String(localLocation.value.deviceId) : ""
	},
	{ immediate: true, deep: true }
)

// 檢查地址是否重複
const hasDuplicateAddress = computed(() => {
	if (props.currentIndex < 0 || !props.allLocations || props.allLocations.length === 0) {
		return false
	}
	return checkDuplicateAddress(localLocation.value, props.allLocations, props.currentIndex)
})

// 處理變更
const handleChange = () => {
	emit("update", { ...localLocation.value })
}

// 設備選項（用於 FilterDropdown）
const deviceOptions = computed(() => {
	if (props.isLoadingDevices) {
		return [{ value: "", label: "載入中..." }]
	}
	if (props.devices.length === 0) {
		return [{ value: "", label: "尚無可用控制器" }]
	}
	const options = props.devices.map((device) => ({
		value: String(device.id),
		label: device.name,
	}))
	// 添加空選項（用於清除選擇）
	return [{ value: "", label: "請選擇控制器" }, ...options]
})

// 處理設備變更
const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId
	ensureModbusConfig(localLocation.value)
	handleChange()
}
</script>
