<template>
	<div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
		<label
			class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
		>
			<span>戶別名稱<span class="required-mark">*</span></span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：A 棟 1F-01"
				aria-label="門禁保全戶別名稱"
				@input="handleChange"
			/>
		</label>

		<label
			class="flex min-w-[10rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
		>
			<span>室內機<span class="required-mark">*</span></span>
			<FilterDropdown
				v-model="deviceIdString"
				:options="deviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇室內機'"
				aria-label="選擇室內機"
				@update:modelValue="handleDeviceChange"
			/>
		</label>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { Device } from "~/types/device"
import type { AccessSecurityLocation } from "~/types/accessSecurity"

interface Props {
	location: AccessSecurityLocation
	devices: Device[]
	isLoadingDevices?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	isLoadingDevices: false,
})

const emit = defineEmits<{
	(e: "update", value: AccessSecurityLocation): void
}>()

const localLocation = reactive<AccessSecurityLocation>({
	name: "",
	indoorDeviceId: undefined,
	deviceId: undefined,
})

watch(
	() => props.location,
	(loc) => {
		localLocation.name = loc.name || ""
		localLocation.indoorDeviceId = loc.indoorDeviceId ?? loc.deviceId
		localLocation.deviceId = localLocation.indoorDeviceId
		localLocation.id = loc.id
		localLocation.systemId = loc.systemId
	},
	{ immediate: true, deep: true }
)

const indoorDevices = computed(() =>
	(props.devices || []).filter((d) => {
		if (d.type_code !== "video_intercom") return false
		const cfg = d.config as { unitType?: string } | undefined
		return String(cfg?.unitType || "") === "indoor"
	})
)

const deviceOptions = computed(() => [
	{ value: "", label: "請選擇室內機" },
	...indoorDevices.value.map((d) => ({
		value: String(d.id),
		label: d.name || `設備 ${d.id}`,
	})),
])

const deviceIdString = computed({
	get: () =>
		localLocation.indoorDeviceId != null && localLocation.indoorDeviceId > 0
			? String(localLocation.indoorDeviceId)
			: "",
	set: (v: string) => {
		const n = Number(v)
		localLocation.indoorDeviceId = Number.isFinite(n) && n > 0 ? n : undefined
		localLocation.deviceId = localLocation.indoorDeviceId
	},
})

const handleChange = () => {
	emit("update", { ...localLocation })
}

const handleDeviceChange = () => {
	handleChange()
}
</script>
