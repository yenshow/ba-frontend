<template>
	<div class="space-y-3 text-white">
		<div class="flex items-center justify-between gap-2">
			<p class="text-sm font-semibold text-white/80 2xl:text-base">時段規則</p>
			<div class="flex items-center gap-2">
				<PersonnelFormItemTabs
					v-model:active-index="activeIndex"
					:count="modelValue.length"
					:max="MAX_RULES"
					aria-label="時段規則"
					:class="{ 'pointer-events-none opacity-50': !canEdit }"
					@add="handleAdd"
				/>
				<IconTrashButton
					v-if="modelValue.length > 1"
					size="md"
					button-class="flex-shrink-0"
					title="移除目前規則"
					:aria-label="`移除第 ${activeIndex + 1} 筆時段規則`"
					:disabled="!canEdit"
					@click="handleRemove"
				/>
			</div>
		</div>

		<p v-if="errorMessage" class="form-error-text" role="alert">{{ errorMessage }}</p>

		<div v-if="activeRule" class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
			<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
				<span>規則名稱<span class="required-mark">*</span></span>
				<input
					:value="activeRule.name"
					type="text"
					required
					maxlength="100"
					class="form-input-small"
					placeholder="例如：晚點名"
					:aria-label="`第 ${activeIndex + 1} 筆規則名稱`"
					:disabled="!canEdit"
					@input="handleField('name', ($event.target as HTMLInputElement).value)"
				/>
			</label>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
					<span>開始時間<span class="required-mark">*</span></span>
					<input
						:value="activeRule.windowStart"
						type="time"
						required
						class="form-input-small"
						:aria-label="`第 ${activeIndex + 1} 筆開始時間`"
						:disabled="!canEdit"
						@input="handleField('windowStart', ($event.target as HTMLInputElement).value)"
					/>
				</label>
				<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
					<span>結束時間<span class="required-mark">*</span></span>
					<input
						:value="activeRule.windowEnd"
						type="time"
						required
						class="form-input-small"
						:aria-label="`第 ${activeIndex + 1} 筆結束時間`"
						:disabled="!canEdit"
						@input="handleField('windowEnd', ($event.target as HTMLInputElement).value)"
					/>
				</label>
				<fieldset class="min-w-0 text-sm text-white/80 2xl:text-base" :disabled="!canEdit">
					<legend class="mb-2.5">星期<span class="required-mark">*</span></legend>
					<div class="flex flex-wrap items-center gap-3">
						<label
							v-for="day in ROLL_CALL_WEEKDAY_OPTIONS"
							:key="day.value"
							class="flex items-center gap-1.5 text-sm"
						>
							<input
								type="checkbox"
								class="h-4 w-4 accent-cyan-400"
								:checked="activeRule.weekdays.includes(day.value)"
								:aria-label="`星期${day.label}`"
								@change="handleToggleWeekday(day.value)"
							/>
							{{ day.label }}
						</label>
					</div>
				</fieldset>
				<label class="min-w-0 text-sm text-white/80 2xl:text-base">
					<span class="mb-2 block">啟用</span>
					<span class="flex items-center gap-2">
						<input
							type="checkbox"
							class="h-4 w-4 accent-cyan-400"
							:checked="activeRule.enabled"
							aria-label="啟用規則"
							:disabled="!canEdit"
							@change="handleField('enabled', ($event.target as HTMLInputElement).checked)"
						/>
						啟用此時段規則
					</span>
				</label>
			</div>
		</div>
		<p class="text-xs text-white/60 2xl:text-sm">
			時段規則會與地點一併在下方「儲存變更」時寫入。應到人員請至「門禁管理」維護地點名單。
		</p>
	</div>
</template>

<script setup lang="ts">
import PersonnelFormItemTabs from "~/components/personnel/PersonnelFormItemTabs.vue";
import IconTrashButton from "~/components/common/IconTrashButton.vue";
import { clampFormTabIndex } from "~/utils/personnelFormTabUtils";
import {
	ROLL_CALL_WEEKDAY_OPTIONS,
	createRollCallRuleDraft,
	type RollCallRuleDraft
} from "~/types/rollCall";

const MAX_RULES = 8;

const props = defineProps<{
	modelValue: RollCallRuleDraft[];
	canEdit: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: RollCallRuleDraft[]];
}>();

const activeIndex = ref(0);
const errorMessage = ref("");

const activeRule = computed(() => props.modelValue[activeIndex.value] ?? null);

const ensureDefaultRule = () => {
	if (props.modelValue.length > 0) return;
	emit("update:modelValue", [createRollCallRuleDraft({ name: "規則 1" })]);
	activeIndex.value = 0;
};

watch(
	() => props.modelValue.length,
	len => {
		if (len === 0) {
			ensureDefaultRule();
			return;
		}
		activeIndex.value = clampFormTabIndex(activeIndex.value, len);
	},
	{ immediate: true }
);

const emitList = (list: RollCallRuleDraft[]) => {
	errorMessage.value = "";
	emit("update:modelValue", list.length > 0 ? list : [createRollCallRuleDraft({ name: "規則 1" })]);
};

const handleField = <K extends keyof RollCallRuleDraft>(key: K, value: RollCallRuleDraft[K]) => {
	const list = [...props.modelValue];
	const current = list[activeIndex.value];
	if (!current) return;
	list[activeIndex.value] = { ...current, [key]: value };
	emitList(list);
};

const handleToggleWeekday = (day: number) => {
	const current = activeRule.value;
	if (!current) return;
	const set = new Set(current.weekdays);
	if (set.has(day)) set.delete(day);
	else set.add(day);
	handleField(
		"weekdays",
		[...set].sort((a, b) => a - b)
	);
};

const handleAdd = () => {
	if (!props.canEdit || props.modelValue.length >= MAX_RULES) return;
	const list = [
		...props.modelValue,
		createRollCallRuleDraft({
			name: `規則 ${props.modelValue.length + 1}`
		})
	];
	emitList(list);
	activeIndex.value = list.length - 1;
};

const handleRemove = () => {
	if (!props.canEdit || props.modelValue.length <= 1) return;
	const list = props.modelValue.filter((_, i) => i !== activeIndex.value);
	emitList(list);
	activeIndex.value = clampFormTabIndex(activeIndex.value, list.length);
};
</script>
