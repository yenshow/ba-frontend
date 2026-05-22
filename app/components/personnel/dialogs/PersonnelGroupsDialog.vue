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
						<div class="flex items-center gap-3">
							<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">群組管理</h3>
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<div v-if="isLoading" class="py-10 text-center text-white/60">載入中…</div>

							<div v-else-if="pendingMains.length > 0" class="space-y-3">
								<div
									v-for="main in pendingMains"
									:key="main.uiKey"
									class="overflow-hidden rounded-lg border transition-all"
									:class="mainCardClass(main)"
								>
									<div
										class="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-white/10"
										@click="toggleMainExpanded(main.uiKey)"
									>
										<div class="flex min-w-0 flex-1 items-center gap-3">
											<svg
												class="h-5 w-5 shrink-0 text-white/70 transition-transform"
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
											<h4 class="truncate text-base font-medium text-white 2xl:text-lg">
												{{ main.name.trim() || "未命名" }}
											</h4>
											<span
												class="shrink-0 rounded-full bg-white/25 px-3 py-1 text-xs text-white/80 2xl:text-sm"
											>
												子群組 {{ main.children.length }}
											</span>
										</div>
										<IconTrashButton
											button-class="shrink-0"
											title="刪除主群組"
											aria-label="刪除主群組"
											@click.stop="requestDeleteMain(main)"
										/>
									</div>

									<Transition name="expand">
										<div
											v-if="expandedMainUiKeys.has(main.uiKey)"
											class="border-t border-white/10 p-4"
											@click.stop
										>
											<div class="flex items-center gap-3 border-b border-white/10 pb-3">
												<span class="text-base font-medium text-white 2xl:text-lg">主群組名稱</span>
												<input
													v-model="main.name"
													type="text"
													required
													class="form-input-small flex-1"
													placeholder="例如：遠岫科技"
													aria-label="主群組名稱"
												/>
											</div>

											<div class="mb-3 mt-3 flex items-center justify-between gap-2">
												<span class="text-base font-medium text-white 2xl:text-lg">子群組列表</span>
												<button
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click="addChild(main.uiKey)"
												>
													新增子群組
												</button>
											</div>

											<div
												v-if="main.children.length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無子群組，請新增子群組
											</div>
											<div v-else class="space-y-2">
												<div
													v-for="child in main.children"
													:key="child.uiKey"
													class="flex min-w-0 items-end gap-2 rounded border border-white/10 bg-white/5 p-2"
													:class="{
														'border-amber-400/40 bg-amber-500/10':
															isNewPersonnelGroupDraftChild(child),
													}"
												>
													<label
														class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>子群組名稱 *</span>
														<input
															v-model="child.name"
															type="text"
															required
															class="form-input-small"
															placeholder="例如：遠岫營造"
														/>
													</label>
													<IconTrashButton
														button-class="ml-auto flex-shrink-0"
														title="刪除子群組"
														:aria-label="`刪除子群組 ${child.name || '未命名'}`"
														@click="requestDeleteChild(main, child)"
													/>
												</div>
											</div>
										</div>
									</Transition>
								</div>
							</div>

							<div v-else class="py-8 text-center text-white/60">
								<p class="text-base 2xl:text-lg">尚無群組</p>
								<p class="mt-2 text-sm 2xl:text-base">點擊「新增主群組」開始建立</p>
							</div>
						</div>
					</div>

					<p v-if="errorMessage" class="pr-7 text-sm text-rose-300 2xl:pr-8 2xl:text-base">
						{{ errorMessage }}
					</p>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-secondary" @click="addMain">新增主群組</button>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges }"
							:disabled="!hasUnsavedChanges || isSaving"
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
</template>

<script setup lang="ts">
import {
	usePersonnelGroupsDraft,
	isNewPersonnelGroupDraftMain,
	isNewPersonnelGroupDraftChild,
	type PersonnelGroupDraftChild,
	type PersonnelGroupDraftMain,
} from "~/composables/systems/personnel/usePersonnelGroupsDraft"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import {
	buildDeletePersonnelChildGroupConfirmCopy,
	buildDeletePersonnelMainGroupConfirmCopy,
} from "~/utils/personnelGroups"

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [value: boolean]; changed: [] }>()

const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const personnelApi = usePersonnelApi()
const { groupTree, refresh: refreshGroupTree } = usePersonnelGroupTree()

const {
	pendingMains,
	deletedMainIds,
	deletedChildIds,
	expandedMainUiKeys,
	syncFromTree,
	resetToSource,
	hasUnsavedChanges,
	changedFieldsList,
	changeSummary,
	toggleMainExpanded,
	addMain,
	addChild,
	removeMain,
	removeChild,
	getSourceIndex,
	getPendingChildGroupDeleteIds,
} = usePersonnelGroupsDraft()

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string | null>(null)

const mainCardClass = (main: PersonnelGroupDraftMain) => {
	const expanded = expandedMainUiKeys.value.has(main.uiKey)
	const isNew = isNewPersonnelGroupDraftMain(main)
	if (isNew) {
		return [
			"border-2 border-amber-400/90 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]",
			expanded ? "bg-amber-500/15" : "",
		]
	}
	return ["border-white/20 bg-white/10", expanded ? "bg-white/15" : ""]
}

const loadTree = async () => {
	isLoading.value = true
	errorMessage.value = null
	try {
		await refreshGroupTree()
		syncFromTree(groupTree.value || [])
	} catch (err) {
		errorMessage.value = handleApiError(err, "載入群組失敗") || "載入群組失敗"
	} finally {
		isLoading.value = false
	}
}

watch(
	() => props.modelValue,
	(open) => {
		if (open) void loadTree()
	},
	{ immediate: true }
)

const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const confirmAction = ref<
	| null
	| { type: "close" }
	| { type: "deleteMain"; mainUiKey: string }
	| { type: "deleteChild"; mainUiKey: string; childUiKey: string }
>(null)

const closeDialog = () => {
	emit("update:modelValue", false)
	errorMessage.value = null
	resetToSource()
}

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		confirmAction.value = { type: "close" }
		confirmDialog.show({
			title: "確認關閉",
			message: "您有未保存的變更，確定要關閉嗎？",
			details: "未保存的變更將會遺失。",
			type: "warning",
		})
		return
	}
	closeDialog()
}

const requestDeleteMain = (main: PersonnelGroupDraftMain) => {
	if (isNewPersonnelGroupDraftMain(main)) {
		removeMain(main.uiKey)
		return
	}
	confirmAction.value = { type: "deleteMain", mainUiKey: main.uiKey }
	confirmDialog.show(buildDeletePersonnelMainGroupConfirmCopy(main.name, main.children.length))
}

const requestDeleteChild = (main: PersonnelGroupDraftMain, child: PersonnelGroupDraftChild) => {
	if (isNewPersonnelGroupDraftChild(child)) {
		removeChild(main.uiKey, child.uiKey)
		return
	}
	confirmAction.value = {
		type: "deleteChild",
		mainUiKey: main.uiKey,
		childUiKey: child.uiKey,
	}
	confirmDialog.show(buildDeletePersonnelChildGroupConfirmCopy(child.name))
}

const handleConfirmDialog = () => {
	const action = confirmAction.value
	if (!action) return
	if (action.type === "close") closeDialog()
	else if (action.type === "deleteMain") removeMain(action.mainUiKey)
	else if (action.type === "deleteChild") removeChild(action.mainUiKey, action.childUiKey)
	confirmAction.value = null
}

const validateDraft = (): boolean => {
	for (const main of pendingMains.value) {
		if (!main.name.trim()) {
			errorMessage.value = "主群組名稱為必填"
			return false
		}
		for (const child of main.children) {
			if (!child.name.trim()) {
				errorMessage.value = `子群組名稱為必填（主群組：${main.name.trim()}）`
				return false
			}
		}
	}
	return true
}

const handleSaveAll = async () => {
	if (!hasUnsavedChanges.value || !validateDraft()) return

	isSaving.value = true
	errorMessage.value = null
	const { mainById, childById } = getSourceIndex()

	try {
		for (const id of getPendingChildGroupDeleteIds()) {
			await personnelApi.deletePersonGroup(id)
		}
		for (const id of deletedMainIds.value) {
			await personnelApi.deletePersonGroup(id)
		}

		for (const main of pendingMains.value) {
			const mainName = main.name.trim()
			let mainId = main.id
			if (mainId == null) {
				mainId = (await personnelApi.createPersonGroup({ name: mainName, parentId: null })).id
			} else {
				const src = mainById.get(mainId)
				if (src?.name !== mainName) {
					await personnelApi.updatePersonGroup(mainId, { name: mainName, parentId: null })
				}
			}

			for (const child of main.children) {
				const childName = child.name.trim()
				if (child.id == null) {
					await personnelApi.createPersonGroup({ name: childName, parentId: mainId })
				} else {
					const src = childById.get(child.id)
					if (src?.name !== childName) {
						await personnelApi.updatePersonGroup(child.id, {
							name: childName,
							parentId: mainId,
						})
					}
				}
			}
		}

		toast.success("已儲存群組變更")
		emit("changed")
		await loadTree()
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存群組失敗") || "儲存群組失敗"
	} finally {
		isSaving.value = false
	}
}
</script>
