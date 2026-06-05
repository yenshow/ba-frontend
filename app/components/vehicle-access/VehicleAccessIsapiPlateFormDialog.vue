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
							tabindex="0"
							@click="emit('cancel')"
							@keydown.enter="emit('cancel')"
							@keydown.space.prevent="emit('cancel')"
						>
							&times;
						</button>
					</header>

					<form class="flex min-h-0 flex-1 flex-col gap-4" @submit.prevent="emit('save')">
						<div class="show-scrollbar flex-1 overflow-y-auto">
							<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>車牌 *</span>
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
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>名單類型 *</span>
									<FilterDropdown
										v-model="form.listType"
										:options="LICENSE_PLATE_LIST_TYPE_OPTIONS"
										placeholder="請選擇名單類型"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>開始時間 *</span>
									<input
										v-model="form.createTimeLocal"
										type="datetime-local"
										step="60"
										required
										class="form-input-small"
										aria-required="true"
									/>
								</label>
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>結束時間 *</span>
									<input
										v-model="form.effectiveTimeLocal"
										type="datetime-local"
										step="60"
										required
										class="form-input-small"
										aria-required="true"
									/>
								</label>
								<label
									class="col-span-full flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>綁定人員（選填）</span>
									<FilterDropdown
										v-model="form.bindPersonId"
										:options="personBindOptions"
										placeholder="不綁定人員"
										:disabled="isLoadingPersonOptions"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
							</div>
						</div>

						<footer class="mt-2 flex items-center gap-3 border-t border-white/20 pt-4 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="emit('cancel')">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary" :disabled="isSaving">
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
import type { IsapiPlateFormModel } from "~/utils/licensePlateFormUtils"
import { LICENSE_PLATE_LIST_TYPE_OPTIONS } from "~/utils/licensePlateFormUtils"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

const form = defineModel<IsapiPlateFormModel>("form", { required: true })

defineProps<{
	mode: "add" | "modify"
	personBindOptions: Array<{ value: string; label: string }>
	isLoadingPersonOptions?: boolean
	isSaving?: boolean
}>()

const emit = defineEmits<{
	save: []
	cancel: []
}>()
</script>
