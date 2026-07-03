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
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3
							class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							{{ dialogTitle }}
						</h3>
						<div class="flex shrink-0 items-center gap-3">
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="requestClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px] rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<div
								class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
							>
								<div class="min-w-0 space-y-2">
									<h4 class="text-lg font-medium text-white 2xl:text-xl">成員設定</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										勾選要加入各子群組的人員。同一主群組下每人僅能隸屬一個子群組；儲存後將更新成員名單。
									</p>
								</div>
								<div class="flex min-w-0 shrink-0 items-center gap-2 lg:max-w-sm">
									<SearchInput
										v-model="candidatesQuery"
										input-id="personnel-group-members-search"
										label="搜尋人員"
										placeholder="搜尋 ID / 姓名"
										aria-label="搜尋人員"
										wrapper-class="min-w-0 flex-1"
										input-wrapper-class="min-w-0 flex-1"
										input-class="!w-full min-w-0"
										:disabled="isSaving"
										:clearable="!isSaving"
										@search="loadCandidates"
										@clear="loadCandidates"
									/>
								</div>
							</div>

							<div class="mt-4 min-h-[160px]">
								<div
									v-if="isLoading && childGroups.length === 0"
									class="py-8 text-center text-base text-white/60 2xl:text-lg"
									role="status"
									aria-live="polite"
								>
									載入中…
								</div>
								<p v-else-if="errorMessage" class="form-error-text-lg" role="alert">
									{{ errorMessage }}
								</p>
								<Transition v-else name="fade" mode="out-in">
									<div
										v-if="childGroups.length > 0"
										:key="`child-groups-${childGroups.length}`"
										class="space-y-3"
									>
										<div
											v-for="child in childGroups"
											:key="child.id"
											class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
											:class="{ 'bg-white/15': expandedChildIds.has(child.id) }"
										>
											<div class="flex items-center gap-3 p-4">
												<button
													type="button"
													class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left transition-colors hover:opacity-90"
													:aria-expanded="expandedChildIds.has(child.id)"
													@click="toggleChildExpanded(child.id)"
												>
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
													<div
														class="flex h-16 min-w-[80px] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-3 shadow-lg"
													>
														<span
															class="max-w-[8rem] truncate text-xl font-bold tracking-wider text-white 2xl:max-w-[10rem] 2xl:text-2xl"
														>
															{{ child.name }}
														</span>
													</div>
													<span
														class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
													>
														{{ memberCountForChild(child.id) }} 人
													</span>
												</button>
												<button
													type="button"
													class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
													:disabled="!hasCandidateItems || isSaving"
													:aria-label="`${
														isAllSelectedForChild(child.id) ? '取消全選' : '全選'
													}子群組 ${child.name} 的可見人員`"
													@click="toggleSelectAllForChild(child.id)"
												>
													{{ isAllSelectedForChild(child.id) ? "取消" : "全選" }}
												</button>
											</div>

											<Transition name="expand">
												<div
													v-if="expandedChildIds.has(child.id)"
													class="space-y-4 border-t border-white/10 p-4"
												>
													<div
														v-if="isLoadingCandidates && candidateGroups.length === 0"
														class="py-6 text-center text-sm text-white/60 2xl:text-base"
														role="status"
														aria-live="polite"
													>
														載入人員中…
													</div>
													<p
														v-else-if="candidatesErrorText"
														class="form-error-text"
														role="alert"
													>
														{{ candidatesErrorText }}
													</p>
													<div
														v-else-if="candidateGroups.length === 0"
														class="rounded border border-white/10 bg-white/5 py-6 text-center text-sm text-white/60 2xl:text-base"
													>
														尚無可選人員
													</div>
													<div
														v-else
														class="show-scrollbar max-h-[320px] space-y-4 overflow-y-auto pe-1"
													>
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
																	class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors hover:bg-white/10"
																	:class="
																		isMemberSelected(child.id, p.id)
																			? 'border-cyan-400/50 bg-cyan-500/20'
																			: 'border-white/10 bg-white/5'
																	"
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
											</Transition>
										</div>
									</div>
									<div v-else key="empty" class="py-8 text-center text-white/60">
										<p class="text-base 2xl:text-lg">此主群組尚無子群組</p>
										<p class="mt-2 text-sm 2xl:text-base">請至「管理群組」新增子群組</p>
									</div>
								</Transition>
							</div>
						</div>
					</div>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="requestClose">關閉</button>
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
import type { PersonnelGroupsChangedPayload } from "~/utils/personnelGroups"

const props = defineProps<{
	modelValue: boolean
	mainGroupId: number
	groupTree: PersonGroup[]
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	changed: [payload: PersonnelGroupsChangedPayload]
}>()

const {
	dialogTitle,
	childGroups,
	isLoading,
	isSaving,
	errorMessage,
	expandedChildIds,
	candidatesQuery,
	candidateGroups,
	hasCandidateItems,
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
		emit("changed", { scope: "members" })
		emit("update:modelValue", false)
	},
	dismissDialog: () => emit("update:modelValue", false),
	toast: useToast(),
})
</script>
