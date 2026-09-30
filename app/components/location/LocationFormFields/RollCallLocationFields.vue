<template>
	<div class="flex min-w-0 flex-1 flex-col gap-4 text-white">
		<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
			<span>地點名稱<span class="required-mark">*</span></span>
			<input
				v-model="localName"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：宿舍大門、1F 大廳"
				aria-label="地點名稱"
				@input="handleNameChange"
			/>
		</label>

		<div>
			<p class="mb-2 text-sm font-semibold text-white/80 2xl:text-base">
				簽到門禁機<span class="required-mark">*</span>
			</p>
			<p class="mb-2 text-xs text-white/60 2xl:text-sm">
				應到人員請至門禁管理維護地點名單與設備同步。
			</p>
			<div v-if="accessControlDevices.length === 0" :class="emptyHintClass">
				請先在設備管理新增門禁設備
			</div>
			<div v-else class="grid grid-cols-2 gap-2">
				<label
					v-for="device in accessControlDevices"
					:key="`rc-dev-${device.id}`"
					:class="[
						selectCardBaseClass,
						selectedIds.includes(device.id) && selectCardSelectedClass,
					]"
				>
					<input
						type="checkbox"
						class="h-4 w-4 cursor-pointer accent-cyan-400"
						:checked="selectedIds.includes(device.id)"
						:aria-label="`選擇門禁機 ${device.name}`"
						@change="handleToggleDevice(device.id)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">{{ device.name }}</span>
				</label>
			</div>
		</div>

		<div class="border-t border-white/15 pt-4">
			<RollCallRulesEditor
				:model-value="localRules"
				:can-edit="canEditRules"
				@update:model-value="handleRulesChange"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Device } from "~/types/device"
import type { RollCallLocation, RollCallRuleDraft } from "~/types/rollCall"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"
import RollCallRulesEditor from "~/components/roll-call/RollCallRulesEditor.vue"

const props = defineProps<{
	location: RollCallLocation
	accessControlDevices: Device[]
}>()

const emit = defineEmits<{
	update: [location: RollCallLocation]
}>()

const { useHasPermission } = useAuth()
const canEditRules = useHasPermission(PERM.rollCall.ruleEdit)

const emptyHintClass =
	"rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
const selectCardBaseClass =
	"relative flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
const selectCardSelectedClass = "border-cyan-400/50 bg-cyan-500/20"

const localName = ref(props.location.name || "")
const selectedIds = computed(() => props.location.deviceIds || [])
const localRules = computed(() => props.location.rules || [])

watch(
	() => props.location.name,
	(name) => {
		localName.value = name || ""
	},
)

const handleNameChange = () => {
	emit("update", { ...props.location, name: localName.value })
}

const handleToggleDevice = (deviceId: number) => {
	const current = new Set(selectedIds.value)
	if (current.has(deviceId)) current.delete(deviceId)
	else current.add(deviceId)
	emit("update", { ...props.location, deviceIds: [...current] })
}

const handleRulesChange = (rules: RollCallRuleDraft[]) => {
	emit("update", { ...props.location, rules })
}
</script>
