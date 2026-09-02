<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] min-h-0 w-full max-w-7xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3
							class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							管理群組
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

					<div class="flex min-h-0 flex-1 flex-col overflow-hidden pr-7 2xl:pr-8">
						<p v-if="errorMessage" class="mb-3 form-error-text-lg" role="alert">
							{{ errorMessage }}
						</p>
						<div class="grid min-h-0 flex-1 grid-cols-12 gap-4 2xl:gap-5">
							<!-- 左：主／子群組（卡片樹；inline 改名） -->
							<aside
								class="col-span-12 flex max-h-64 min-h-0 flex-col lg:col-span-4 lg:max-h-none"
							>
								<div
									class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
								>
									<div
										class="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5"
									>
										<span class="text-sm font-medium text-white/85">群組</span>
										<PermissionActionButton
											:allowed="canCreateGroup"
											class="rounded-lg px-2.5 py-1 text-xs text-cyan-200/90 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white 2xl:text-sm"
											aria-label="新增主群組"
											:disabled="isSaving"
											@click="addMain"
										>
											＋ 主群組
										</PermissionActionButton>
									</div>

									<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
										<div
											v-if="isLoading && pendingMains.length === 0"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
											role="status"
											aria-live="polite"
										>
											載入中…
										</div>
										<p
											v-else-if="groupTreeError && pendingMains.length === 0"
											class="form-error-text px-1"
											role="alert"
										>
											{{ groupTreeError }}
										</p>
										<div
											v-else-if="pendingMains.length === 0"
											class="py-10 text-center text-sm text-white/60"
										>
											尚無群組，請新增主群組
										</div>
										<ul v-else class="space-y-2.5" role="tree" aria-label="人員群組樹">
											<li
												v-for="main in pendingMains"
												:key="main.uiKey"
												class="group/main overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
												role="treeitem"
												:aria-expanded="expandedMainUiKeys.has(main.uiKey)"
											>
												<div class="flex items-center gap-1 px-2 py-2">
													<button
														type="button"
														class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white/90"
														:aria-label="
															expandedMainUiKeys.has(main.uiKey)
																? `收合 ${main.name || '主群組'}`
																: `展開 ${main.name || '主群組'}`
														"
														@click="toggleMainExpanded(main.uiKey)"
													>
														<svg
															class="h-3.5 w-3.5 transition-transform duration-200"
															:class="{ 'rotate-90': expandedMainUiKeys.has(main.uiKey) }"
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
													</button>
													<input
														v-model="main.name"
														type="text"
														:class="mainGroupInlineInputClass"
														placeholder="主群組名稱"
														:disabled="isSaving || !canEditGroupName(main.id != null)"
														:aria-label="`主群組名稱 ${main.name || '未命名'}`"
													/>
													<IconTrashButton
														v-if="canDeleteGroup"
														class="shrink-0 opacity-70 transition-opacity group-hover/main:opacity-100"
														title="刪除主群組"
														:aria-label="`刪除主群組 ${main.name || '未命名'}`"
														:disabled="isSaving"
														@click="requestDeleteMain(main)"
													/>
												</div>

												<div
													v-if="expandedMainUiKeys.has(main.uiKey)"
													class="border-t border-white/10 px-2 pb-2 pt-1.5"
												>
													<p
														v-if="main.children.length === 0"
														class="px-2 py-2 text-xs text-white/45"
													>
														尚無子群組
													</p>
													<ul v-else class="space-y-0.5" role="group">
														<li
															v-for="child in main.children"
															:key="child.uiKey"
															role="treeitem"
															class="group/child flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
															:class="
																activeChildUiKey === child.uiKey
																	? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
																	: 'hover:bg-white/[0.06]'
															"
															:aria-current="
																activeChildUiKey === child.uiKey ? 'true' : undefined
															"
															@click="setActiveChild(child.uiKey)"
														>
															<input
																v-model="child.name"
																type="text"
																:class="[
																	childInlineInputClass,
																	activeChildUiKey === child.uiKey
																		? 'font-semibold text-white'
																		: '',
																]"
																placeholder="子群組名稱"
																:disabled="isSaving || !canEditGroupName(child.id != null)"
																:aria-label="`子群組名稱 ${child.name || '未命名'}`"
																@click.stop
																@focus="setActiveChild(child.uiKey)"
															/>
															<span
																v-if="child.id != null"
																class="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/55"
																:title="`成員 ${memberCountForChild(child.id)} 人`"
															>
																{{ memberCountForChild(child.id) }}
															</span>
															<span
																v-else
																class="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200/90"
															>
																新
															</span>
															<IconTrashButton
																v-if="canDeleteGroup"
																class="shrink-0 opacity-0 transition-opacity group-hover/child:opacity-100"
																title="刪除子群組"
																:aria-label="`刪除子群組 ${child.name || '未命名'}`"
																:disabled="isSaving"
																@click.stop="requestDeleteChild(main, child)"
															/>
														</li>
													</ul>
													<button
														v-if="canCreateGroup"
														type="button"
														class="mt-1.5 flex w-full items-center rounded-lg px-2 py-1.5 text-left text-xs text-white/55 transition-colors hover:bg-white/[0.04] hover:text-cyan-200/90 disabled:cursor-not-allowed disabled:opacity-50"
														:disabled="isSaving"
														aria-label="新增子群組"
														@click="handleAddChild(main.uiKey)"
													>
														＋ 新增子群組
													</button>
												</div>
											</li>
										</ul>
									</div>
								</div>
							</aside>

							<!-- 右：成員 -->
							<section
								class="col-span-12 flex h-full min-h-[280px] flex-1 flex-col lg:col-span-8 lg:min-h-0"
							>
								<PersonnelMemberPickerPanel
									v-model:query="candidatesQuery"
									search-input-id="personnel-groups-manage-search"
									:candidates="candidatesItems"
									:is-checked="(personId) => isMemberSelected(personId)"
									:can-edit="canEditMembers && activeChildId != null && !activeChildIsUnsaved"
									:is-disabled="isSaving"
									:is-loading="isLoadingCandidates"
									:is-empty="showMembersEmptyState"
									empty-title="尚無可選人員"
									:can-select-all="hasCandidateItems && canEditMembers && activeChildId != null && !activeChildIsUnsaved"
									:is-all-selected="isAllSelectedInActiveChild"
									context-label="目前子群組"
									:context-value="activeChild?.name?.trim() || null"
									context-placeholder="請先選擇子群組"
									compact-select-all
									grid-variant="group"
									:checkbox-aria-label="groupMemberCheckboxLabel"
									@search="loadCandidates"
									@toggle-select-all="toggleSelectAllInActiveChild"
									@toggle="(personId, checked) => handleToggleMember(personId, checked)"
								>
									<template v-if="showMembersCustomEmpty" #empty-state>
										<div class="py-10 text-center text-sm text-white/60 2xl:text-base">
											{{ membersEmptyMessage }}
										</div>
									</template>
									<template #person-badge="{ person }">
										<span
											v-if="conflictPersonIdSet.has(person.id)"
											class="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
										>
											衝突
										</span>
										<span
											v-else-if="
												activeChildId != null &&
												Number(person.person_group_id) === activeChildId &&
												!isMemberSelected(person.id)
											"
											class="rounded bg-white/10 px-2 py-0.5 text-xs text-white/65"
										>
											將變更：未分組
										</span>
										<span
											v-else-if="
												activeChild?.name &&
												activeChildId != null &&
												Number(person.person_group_id) !== activeChildId &&
												isMemberSelected(person.id)
											"
											class="max-w-[9rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/65"
											:title="`將移至：${activeChild.name}`"
										>
											將移至：{{ activeChild.name }}
										</span>
										<span
											v-else-if="otherGroupLabel(person)"
											class="max-w-[9rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/60"
											:title="`目前：${otherGroupLabel(person)}`"
										>
											目前：{{ otherGroupLabel(person) }}
										</span>
									</template>
								</PersonnelMemberPickerPanel>
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
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges || !canSave }"
							:disabled="!hasUnsavedChanges || !canSave || isSaving"
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
		@confirm="handleConfirmDialog"
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
import { computed } from "vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import PersonnelMemberPickerPanel from "~/components/personnel/PersonnelMemberPickerPanel.vue"
import type { Person } from "~/types/personnel"
import { useToast } from "~/composables/core/useToast"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonnelGroupsManageDialog } from "~/composables/systems/personnel/usePersonnelGroupsManageDialog"
import type { PersonnelGroupsChangedPayload } from "~/utils/personnelGroups"

const props = defineProps<{
	modelValue: boolean
	canCreateGroup: boolean
	canUpdateGroup: boolean
	canDeleteGroup: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	changed: [payload: PersonnelGroupsChangedPayload]
}>()

const groupInlineInputClass =
	"min-w-0 w-full flex-1 border-0 bg-transparent p-0 shadow-none outline-none ring-0 placeholder:text-white/35 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
const mainGroupInlineInputClass = `${groupInlineInputClass} truncate text-sm font-semibold text-white/90 2xl:text-base`
const childInlineInputClass = `${groupInlineInputClass} truncate text-sm text-white/85 2xl:text-base`

const {
	isLoading,
	isSaving,
	errorMessage,
	groupTreeError,
	pendingMains,
	expandedMainUiKeys,
	toggleMainExpanded,
	addMain,
	handleAddChild,
	requestDeleteMain,
	requestDeleteChild,
	activeChildUiKey,
	activeChild,
	activeChildId,
	activeChildIsUnsaved,
	setActiveChild,
	canCreateGroup,
	canDeleteGroup,
	canEditGroupName,
	canEditMembers,
	canSave,
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
	handleConfirmDialog,
} = usePersonnelGroupsManageDialog({
	personnelApi: usePersonnelApi(),
	modelValue: toRef(props, "modelValue"),
	canCreateGroup: toRef(props, "canCreateGroup"),
	canUpdateGroup: toRef(props, "canUpdateGroup"),
	canDeleteGroup: toRef(props, "canDeleteGroup"),
	onSaved: (payload) => emit("changed", payload),
	dismissDialog: () => emit("update:modelValue", false),
	toast: useToast(),
})

const showMembersCustomEmpty = computed(
	() =>
		activeChildUiKey.value == null ||
		activeChildIsUnsaved.value ||
		!canEditMembers.value ||
		Boolean(candidatesErrorText.value),
)

const membersEmptyMessage = computed(() => {
	if (activeChildUiKey.value == null) return "請先在左側選擇要編輯的子群組"
	if (activeChildIsUnsaved.value) return "請先儲存群組結構後再編輯成員"
	if (!canEditMembers.value) return "您沒有編輯群組成員的權限"
	if (candidatesErrorText.value) return candidatesErrorText.value
	return "尚無可選人員"
})

const showMembersEmptyState = computed(() => {
	if (isLoadingCandidates.value) return false
	return showMembersCustomEmpty.value || candidatesItems.value.length === 0
})

const groupMemberCheckboxLabel = (person: Person) =>
	`子群組 ${activeChild.value?.name || ""}：${person.employee_no} ${person.full_name || ""}`
</script>
