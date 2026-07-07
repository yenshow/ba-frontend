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
						<div class="grid min-h-[420px] grid-cols-12 gap-4 2xl:gap-5">
							<!-- 左：子群組 -->
							<aside class="col-span-12 min-h-0 lg:col-span-4">
								<div
									class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
								>
									<div class="border-b border-white/10 p-3">
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>子群組</span>
											<input
												v-model="childQuery"
												type="text"
												class="form-input-small"
												placeholder="搜尋子群組"
												:disabled="isSaving"
												aria-label="搜尋子群組"
											/>
										</label>
									</div>

									<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
										<div
											v-if="isLoading && childGroups.length === 0"
											class="py-10 text-center text-base text-white/60 2xl:text-lg"
											role="status"
											aria-live="polite"
										>
											載入中…
										</div>
										<p v-else-if="errorMessage" class="form-error-text-lg" role="alert">
											{{ errorMessage }}
										</p>
										<div
											v-else-if="filteredChildGroups.length === 0"
											class="py-10 text-center text-white/60"
										>
											無符合的子群組
										</div>
										<div v-else class="space-y-2">
											<button
												v-for="child in filteredChildGroups"
												:key="child.id"
												type="button"
												class="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
												:class="
													activeChildId === child.id
														? 'border-cyan-400/50 bg-cyan-500/20 text-white ring-2 ring-cyan-400/40'
														: 'border-white/10 bg-white/[0.03] text-white/85 hover:border-white/20 hover:bg-white/10'
												"
												:disabled="isSaving"
												:aria-label="`選取子群組：${child.name}`"
												@click="setActiveChild(child.id)"
											>
												<span class="min-w-0 truncate font-medium">{{ child.name }}</span>
												<span
													class="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white/70"
												>
													{{ memberCountForChild(child.id) }}
												</span>
											</button>
										</div>
									</div>
								</div>
							</aside>

							<!-- 右：人員 -->
							<section class="col-span-12 min-h-0 lg:col-span-8">
								<div
									class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
								>
									<div
										class="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-end sm:justify-between"
									>
										<div class="min-w-0">
											<p class="text-sm font-medium text-white/85">目前子群組</p>
											<p class="mt-1 truncate text-base font-semibold text-white">
												{{ activeChild?.name || "請先選擇子群組" }}
											</p>
										</div>
										<div class="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-xs">
											<SearchInput
												v-model="candidatesQuery"
												input-id="personnel-group-members-search"
												label="搜尋人員"
												placeholder="搜尋 ID / 姓名"
												aria-label="搜尋人員"
												wrapper-class="min-w-0 flex-1"
												input-wrapper-class="min-w-0 flex-1"
												input-class="!w-full min-w-0"
												:disabled="isSaving || activeChildId == null"
												:clearable="!isSaving"
												@search="loadCandidates"
												@clear="loadCandidates"
											/>
											<button
												type="button"
												class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
												:disabled="!hasCandidateItems || isSaving || activeChildId == null"
												:aria-label="
													isAllSelectedInActiveChild ? '取消全選可見人員' : '全選可見人員'
												"
												@click="toggleSelectAllInActiveChild"
											>
												{{ isAllSelectedInActiveChild ? "取消" : "全選" }}
											</button>
										</div>
									</div>

									<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
										<div
											v-if="activeChildId == null"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
										>
											請先在左側選擇要編輯的子群組
										</div>
										<div
											v-else-if="isLoadingCandidates && candidatesItems.length === 0"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
											role="status"
											aria-live="polite"
										>
											載入人員中…
										</div>
										<p v-else-if="candidatesErrorText" class="form-error-text" role="alert">
											{{ candidatesErrorText }}
										</p>
										<div
											v-else-if="candidatesItems.length === 0"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
										>
											尚無可選人員
										</div>
										<div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<label
												v-for="p in candidatesItems"
												:key="String(p.id)"
												class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors hover:bg-white/10"
												:class="
													isMemberSelected(Number(p.id))
														? 'border-cyan-400/50 bg-cyan-500/20'
														: 'border-white/10 bg-white/[0.03]'
												"
											>
												<span class="flex min-w-0 items-center gap-2">
													<input
														type="checkbox"
														class="h-4 w-4 shrink-0 accent-cyan-400"
														:checked="isMemberSelected(Number(p.id))"
														:disabled="isSaving"
														:aria-label="`子群組 ${activeChild?.name || ''}：${p.employee_no} ${p.full_name || ''}`"
														@change="
															handleToggleMember(
																Number(p.id),
																($event.target as HTMLInputElement).checked
															)
														"
													/>
													<span class="min-w-0 truncate text-sm text-white/90">
														<span class="font-mono">{{ p.employee_no }}</span>
														<span class="ms-2">{{ p.full_name || "—" }}</span>
													</span>
												</span>
												<span class="flex shrink-0 flex-col items-end gap-1">
													<span
														v-if="conflictPersonIdSet.has(Number(p.id))"
														class="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
													>
														衝突
													</span>
													<span
														v-else-if="
															activeChildId != null &&
															Number(p.person_group_id) === activeChildId &&
															!isMemberSelected(Number(p.id))
														"
														class="rounded bg-white/10 px-2 py-0.5 text-xs text-white/65"
													>
														將變更：未分組
													</span>
													<span
														v-else-if="
															activeChild?.name &&
															activeChildId != null &&
															Number(p.person_group_id) !== activeChildId &&
															isMemberSelected(Number(p.id))
														"
														class="max-w-[9rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/65"
														:title="`將移至：${activeChild.name}`"
													>
														將移至：{{ activeChild.name }}
													</span>
													<span
														v-else-if="otherGroupLabel(p)"
														class="max-w-[9rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/60"
														:title="`目前：${otherGroupLabel(p)}`"
													>
														目前：{{ otherGroupLabel(p) }}
													</span>
												</span>
											</label>
										</div>
									</div>
								</div>
							</section>
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

	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="showConflictDialog"
				class="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-3xl p-6 2xl:max-w-4xl 2xl:gap-5 2xl:p-8"
				>
					<header class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
								處理群組衝突
							</h3>
							<p class="mt-2 text-sm text-white/60 2xl:text-base">
								同一人員在本次操作中被勾選到多個子群組。請為每位人員選擇最終歸屬（或未分組）後再儲存。
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉衝突清單"
							@click="dismissConflictDialog"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto pe-1">
						<div v-if="conflicts.length === 0" class="py-10 text-center text-white/60">
							目前沒有衝突
						</div>
						<div v-else class="space-y-3">
							<section
								v-for="item in conflicts"
								:key="item.personId"
								class="rounded-xl border border-white/15 bg-white/[0.03] p-4"
							>
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-base font-semibold text-white">
											<span v-if="item.employeeNo" class="font-mono">{{ item.employeeNo }}</span>
											<span class="ms-2">{{ item.displayName }}</span>
										</p>
										<p class="mt-1 text-xs text-white/55">
											此人員同時被勾選於 {{ item.childIds.length }} 個子群組
										</p>
									</div>
									<span class="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
										>需選擇</span
									>
								</div>

								<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
									<label
										v-for="cid in item.childIds"
										:key="`p-${item.personId}-c-${cid}`"
										class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/85 hover:bg-white/5"
									>
										<input
											type="radio"
											class="h-4 w-4 accent-cyan-400"
											:name="`conflict-${item.personId}`"
											:value="cid"
											:checked="conflictResolutions[item.personId] === cid"
											:disabled="isSaving"
											@change="conflictResolutions[item.personId] = cid"
										/>
										<span class="truncate">{{ childNameById.get(cid) || `子群組 ${cid}` }}</span>
									</label>

									<label
										class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/85 hover:bg-white/5"
									>
										<input
											type="radio"
											class="h-4 w-4 accent-cyan-400"
											:name="`conflict-${item.personId}`"
											:value="-1"
											:checked="conflictResolutions[item.personId] === -1"
											:disabled="isSaving"
											@change="conflictResolutions[item.personId] = -1"
										/>
										<span>未分組</span>
									</label>
								</div>
							</section>
						</div>
					</div>

					<footer class="flex items-center gap-3 border-t border-white/20 pt-4">
						<button
							type="button"
							class="btn-secondary"
							:disabled="isSaving"
							@click="dismissConflictDialog"
						>
							取消
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isSaving"
							@click="confirmConflictsAndSave"
						>
							{{ isSaving ? "儲存中…" : "套用並儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
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
	filteredChildGroups,
	childQuery,
	activeChildId,
	activeChild,
	setActiveChild,
	isLoading,
	isSaving,
	errorMessage,
	candidatesQuery,
	candidatesItems,
	hasCandidateItems,
	isLoadingCandidates,
	candidatesErrorText,
	hasUnsavedChanges,
	changedFieldsList,
	memberCountForChild,
	isMemberSelected,
	isAllSelectedInActiveChild,
	otherGroupLabel,
	handleToggleMember,
	toggleSelectAllInActiveChild,
	loadCandidates,
	handleSaveAll,
	showConflictDialog,
	childNameById,
	conflicts,
	conflictPersonIdSet,
	conflictResolutions,
	confirmConflictsAndSave,
	dismissConflictDialog,
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
