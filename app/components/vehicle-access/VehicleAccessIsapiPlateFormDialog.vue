<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				class="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="vehicle-isapi-plate-form-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-3xl p-7 2xl:max-w-xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3
								id="vehicle-isapi-plate-form-title"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ mode === "add" ? "新增車牌" : "編輯車牌" }}
							</h3>
						</div>
						<button
							type="button"
							class="shrink-0 cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉表單"
							@click="emit('cancel')"
						>
							&times;
						</button>
					</header>

					<form class="flex min-h-0 flex-1 flex-col gap-4" @submit.prevent>
						<div class="show-scrollbar flex-1 overflow-y-auto">
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>類型<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="bindModeModel"
										:options="LICENSE_PLATE_BIND_MODE_OPTIONS"
										placeholder="請選擇類型"
										:class="{ 'pointer-events-none opacity-50': mode === 'modify' }"
										text-size="text-sm 2xl:text-base"
									/>
								</label>

								<label
									v-if="form.bindMode === 'bound'"
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>綁定人員<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="form.bindPersonId"
										:options="personBindOptions"
										placeholder="請選擇綁定人員"
										:class="{ 'pointer-events-none opacity-50': isPersonBindDisabled }"
										text-size="text-sm 2xl:text-base"
									/>
									<p
										v-if="!isLoadingPersonOptions && personBindOptions.length === 0"
										class="text-xs text-amber-300/90 2xl:text-sm"
									>
										此地點尚無進出名單成員。請先在車牌管理勾選人員並按「套用權限」。
									</p>
								</label>

								<label
									v-else
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>姓名<span class="required-mark">*</span></span>
									<input
										v-model="form.displayName"
										type="text"
										required
										class="form-input-small"
										placeholder="例如：王小明"
										aria-required="true"
										aria-label="臨時車輛姓名"
									/>
								</label>

								<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>車牌<span class="required-mark">*</span></span>
									<input
										v-model="form.licensePlate"
										type="text"
										required
										class="form-input-small"
										placeholder="例如：ABC1234"
										:disabled="mode === 'modify'"
										aria-required="true"
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>名單類型<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="form.listType"
										:options="LICENSE_PLATE_LIST_TYPE_OPTIONS"
										placeholder="請選擇名單類型"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>開始時間<span class="required-mark">*</span></span>
									<input
										v-model="form.effectiveBeginLocal"
										type="datetime-local"
										step="60"
										required
										class="form-input-small"
										aria-required="true"
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>結束時間<span class="required-mark">*</span></span>
									<input
										v-model="form.effectiveEndLocal"
										type="datetime-local"
										step="60"
										required
										class="form-input-small"
										aria-required="true"
									/>
								</label>
							</div>
						</div>

						<p v-if="errorMessage" class="form-error-text" role="alert">{{ errorMessage }}</p>

						<footer class="mt-2 flex items-center gap-3 border-t border-white/20 pt-4 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="emit('cancel')">取消</button>
							<div class="flex-1"></div>
							<button type="button" class="btn-primary" :disabled="isSaving" @click="emit('save')">
								{{ isSaving ? "處理中..." : "儲存" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IsapiPlateBindMode, IsapiPlateFormModel } from "~/utils/licensePlateFormUtils";
import {
	LICENSE_PLATE_BIND_MODE_OPTIONS,
	LICENSE_PLATE_LIST_TYPE_OPTIONS
} from "~/utils/licensePlateFormUtils";
import FilterDropdown from "~/components/common/FilterDropdown.vue";

const form = defineModel<IsapiPlateFormModel>("form", { required: true });

const props = defineProps<{
	mode: "add" | "modify";
	personBindOptions: Array<{ value: string; label: string }>;
	isLoadingPersonOptions?: boolean;
	isSaving?: boolean;
	errorMessage?: string | null;
}>();

const emit = defineEmits<{
	save: [];
	cancel: [];
	bindModeChange: [mode: IsapiPlateBindMode];
}>();

const isPersonBindDisabled = computed(
	() =>
		props.mode === "modify" ||
		Boolean(props.isLoadingPersonOptions) ||
		props.personBindOptions.length === 0
);

const bindModeModel = computed({
	get: () => form.value.bindMode,
	set: (next: string) => {
		if (props.mode !== "add") return;
		const nextMode = (next === "temporary" ? "temporary" : "bound") as IsapiPlateBindMode;
		if (form.value.bindMode === nextMode) return;
		form.value.bindMode = nextMode;
		if (nextMode === "bound") form.value.displayName = "";
		else form.value.bindPersonId = "";
		emit("bindModeChange", nextMode);
	}
});
</script>
