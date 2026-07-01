<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="flex min-w-0 items-center gap-3">
							<h3
								class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ dialogTitle }}
							</h3>
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
							/>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="requestClose"
						>
							&times;
						</button>
					</header>

					<div class="mb-3 flex min-w-0 items-center gap-2 pr-7 2xl:pr-8">
						<SearchInput
							v-model="candidatesQuery"
							input-id="personnel-group-members-search"
							label="搜尋人員"
							placeholder="搜尋 ID / 姓名"
							aria-label="搜尋人員"
							wrapper-class="min-w-0 flex-1"
							input-wrapper-class="min-w-0 flex-1 max-w-[280px]"
							:disabled="isSaving"
							@search="loadCandidates"
							@clear="loadCandidates"
						/>
					</div>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div v-if="isLoading" class="py-10 text-center text-white/60">載入中…</div>

						<p v-else-if="errorMessage" class="form-error-text" role="alert">
							{{ errorMessage }}
						</p>

						<div
							v-else-if="childGroups.length === 0"
							class="py-10 text-center text-sm text-white/60 2xl:text-base"
						>
							此主群組尚無子群組，請至「管理群組」新增子群組
						</div>

						<div v-else class="space-y-3">
							<div
								v-for="child in childGroups"
								:key="child.id"
								class="overflow-hidden rounded-lg border border-white/20 bg-white/10"
								:class="{ 'bg-white/15': expandedChildIds.has(child.id) }"
							>
								<button
									type="button"
									class="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-white/10"
									:aria-expanded="expandedChildIds.has(child.id)"
									@click="toggleChildExpanded(child.id)"
								>
									<div class="flex min-w-0 items-center gap-3">
										<svg
											class="h-5 w-5 shrink-0 text-white/70 transition-transform"
											:class="{ 'rotate-90': expandedChildIds.has(child.id) }"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
										<span class="truncate text-base font-medium text-white 2xl:text-lg">{{
											child.name
										}}</span>
									</div>
									<span class="shrink-0 rounded-full bg-white/25 px-3 py-1 text-xs text-white/80">
										{{ memberCountForChild(child.id) }} 人
									</span>
								</button>

								<div v-if="expandedChildIds.has(child.id)" class="border-t border-white/10 p-4">
									<div v-if="isLoadingCandidates" class="py-6 text-center text-sm text-white/60">
										載入人員中…
									</div>
									<p v-else-if="candidatesErrorText" class="form-error-text" role="alert">
										{{ candidatesErrorText }}
									</p>
									<div
										v-else-if="candidateGroups.length === 0"
										class="py-6 text-center text-sm text-white/60 2xl:text-base"
									>
										尚無可選人員
									</div>
									<div v-else class="space-y-4">
										<div class="flex justify-end">
											<button
												type="button"
												class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
												:disabled="isSaving"
												:aria-label="`${
													isAllSelectedForChild(child.id) ? '取消全選' : '全選'
												}子群組 ${child.name} 的可見人員`"
												@click="toggleSelectAllForChild(child.id)"
											>
												{{ isAllSelectedForChild(child.id) ? "取消" : "全選" }}
											</button>
										</div>
										<div class="show-scrollbar max-h-[320px] space-y-4 overflow-y-auto pe-1">
											<section
												v-for="group in candidateGroups"
												:key="`${child.id}-group-${group.groupId}`"
											>
												<h5 class="mb-2 text-xs font-medium text-white/55 2xl:text-sm">
													{{ group.groupName }}
													<span class="text-white/40">（{{ group.members.length }}）</span>
												</h5>
												<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
													<label
														v-for="p in group.members"
														:key="`${child.id}-${p.id}`"
														class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
													>
														<span class="flex min-w-0 items-center gap-2">
															<input
																type="checkbox"
																class="h-4 w-4 shrink-0 accent-cyan-400"
																:checked="isMemberSelected(child.id, p.id)"
																:disabled="isSaving"
																:aria-label="`子群組 ${child.name}：${p.employee_no} ${p.full_name || ''}`"
																@change="
																	handleToggleMember(
																		child.id,
																		p.id,
																		($event.target as HTMLInputElement).checked
																	)
																"
															/>
															<span class="min-w-0 truncate text-sm text-white/90">
																<span class="font-mono">{{ p.employee_no }}</span>
																<span class="ms-2">{{ p.full_name || "—" }}</span>
															</span>
														</span>
														<span
															v-if="otherGroupLabel(p)"
															class="max-w-[8rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/60"
															:title="otherGroupLabel(p) || undefined"
														>
															{{ otherGroupLabel(p) }}
														</span>
													</label>
												</div>
											</section>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="requestClose">取消</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges }"
							:disabled="childGroups.length === 0 || !hasUnsavedChanges || isSaving"
							@click="handleSaveAll"
						>
							{{ isSaving ? "儲存中…" : "儲存變更" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="confirmDismiss"
	/>
</template>

<script setup lang="ts">
import type { PersonGroup } from "~/types/personnel"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import { useToast } from "~/composables/core/useToast"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonnelGroupMembersDialog } from "~/composables/systems/personnel/usePersonnelGroupMembersDialog"

const props = defineProps<{
	modelValue: boolean
	mainGroupId: number
	groupTree: PersonGroup[]
}>()

const emit = defineEmits<{ "update:modelValue": [value: boolean]; changed: [] }>()

const {
	dialogTitle,
	childGroups,
	isLoading,
	isSaving,
	errorMessage,
	expandedChildIds,
	candidatesQuery,
	candidateGroups,
	isLoadingCandidates,
	candidatesErrorText,
	hasUnsavedChanges,
	changedFieldsList,
	memberCountForChild,
	isMemberSelected,
	isAllSelectedForChild,
	otherGroupLabel,
	toggleChildExpanded,
	handleToggleMember,
	toggleSelectAllForChild,
	loadCandidates,
	handleSaveAll,
	requestClose,
	showConfirmDialog,
	confirmDialogConfig,
	confirmDismiss,
} = usePersonnelGroupMembersDialog({
	personnelApi: usePersonnelApi(),
	mainGroupId: toRef(props, "mainGroupId"),
	groupTree: toRef(props, "groupTree"),
	modelValue: toRef(props, "modelValue"),
	onSaved: () => {
		emit("changed")
		emit("update:modelValue", false)
	},
	dismissDialog: () => emit("update:modelValue", false),
	toast: useToast(),
})
</script>
