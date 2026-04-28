<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-3xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">群組管理</h3>
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
							<Transition name="fade" mode="out-in">
								<div v-if="isLoading" key="loading" class="py-10 text-center text-white/60">
									載入中…
								</div>

								<div
									v-else-if="mainGroups.length > 0"
									:key="`groups-${activeStep}-${mainGroups.length}`"
									class="space-y-3"
								>
									<!-- Step 1：只列主群組 -->
									<template v-if="activeStep === 'mainList'">
										<div
											v-for="main in mainGroups"
											:key="main.id"
											class="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-4 transition-colors hover:bg-white/15"
										>
											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-3">
													<h4 class="truncate text-base font-medium text-white 2xl:text-lg">
														{{ main.name }}
													</h4>
													<span
														class="rounded bg-white/10 px-2 py-1 text-xs text-white/70 2xl:text-sm"
													>
														子群組：{{ (main.children || []).length }}
													</span>
												</div>
											</div>
											<div class="flex gap-2 2xl:gap-3">
												<button type="button" class="btn-list-edit" @click="openMainDetail(main)">
													編輯
												</button>
												<button type="button" class="btn-list-delete" @click="handleDelete(main)">
													刪除
												</button>
											</div>
										</div>
									</template>

									<!-- Step 2：主群組內才列子群組 -->
									<template v-else>
										<div class="rounded-xl border border-white/20 bg-white/10 p-4">
											<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
												<div class="min-w-0">
													<div class="flex items-center gap-3">
														<h4 class="truncate text-base font-medium text-white 2xl:text-lg">
															{{ selectedMainGroup?.name || "主群組" }}
														</h4>
														<button
															type="button"
															class="btn-list-edit"
															:class="{ 'cursor-not-allowed opacity-50': !selectedMainGroup }"
															:disabled="!selectedMainGroup"
															aria-label="編輯主群組"
															@click="openEditMainGroup"
														>
															編輯
														</button>
													</div>
												</div>
											</div>

											<div v-if="!selectedMainGroup" class="py-10 text-center text-white/60">
												請先選擇主群組
											</div>

											<div
												v-else-if="(selectedMainGroup.children || []).length === 0"
												class="py-10 text-center text-white/60"
											>
												尚無子群組
											</div>

											<div v-else class="space-y-2">
												<div
													v-for="child in selectedMainGroup.children"
													:key="child.id"
													class="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-4 transition-colors hover:bg-white/15"
												>
													<div class="min-w-0 flex-1">
														<div class="flex items-center gap-3">
															<h5 class="truncate text-sm font-medium text-white/90 2xl:text-base">
																{{ child.name }}
															</h5>
														</div>
													</div>
													<div class="flex gap-2 2xl:gap-3">
														<button
															type="button"
															class="btn-list-edit"
															@click="openEditChild(child)"
														>
															編輯
														</button>
														<button
															type="button"
															class="btn-list-delete"
															@click="handleDelete(child)"
														>
															刪除
														</button>
													</div>
												</div>
											</div>
										</div>
									</template>
								</div>

								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無群組</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增主群組」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="pr-7 text-sm text-rose-300 2xl:pr-8 2xl:text-base">
						{{ errorMessage }}
					</p>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button
							v-if="activeStep === 'mainDetail'"
							type="button"
							class="btn-secondary"
							@click="backToMainList"
						>
							返回
						</button>
						<button v-else type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							v-if="activeStep === 'mainList'"
							type="button"
							class="btn-primary"
							@click="openCreateMain"
						>
							新增主群組
						</button>
						<button
							v-else
							type="button"
							class="btn-primary"
							@click="openCreateChild(selectedMainGroup!.id)"
							:disabled="!selectedMainGroup"
						>
							新增子群組
						</button>
					</footer>
				</div>

				<Transition name="dialog-fade">
					<div
						v-if="showForm"
						class="fixed inset-0 z-[2001] flex items-center justify-center bg-[rgba(5,24,40,0.9)] backdrop-blur-[10px]"
					>
						<div
							class="dialog-panel-bg flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-2xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
						>
							<header class="flex items-center justify-between pr-7 2xl:pr-8">
								<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
									{{ editingGroup ? "編輯群組" : "新增群組" }}
								</h3>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
									aria-label="關閉表單"
									@click="closeForm"
								>
									&times;
								</button>
							</header>

							<form
								class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
								@submit.prevent="handleSubmit"
								@keydown.enter.prevent
							>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>名稱 *</span>
									<input v-model="formData.name" type="text" required class="form-input" />
								</label>

								<div v-if="isChildGroup" class="border-t border-white/10 pt-4">
									<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
										<h4 class="text-sm text-white/80 2xl:text-base">群組成員</h4>
										<div class="text-xs text-white/60 2xl:text-sm">
											已選 {{ selectedMemberIds.length }} 人
										</div>
									</div>

									<div class="mb-3 flex flex-wrap items-center gap-2">
										<button
											type="button"
											class="btn-secondary text-xs 2xl:text-sm me-auto"
											@click="handleToggleSelectAllCandidatesPage"
											:disabled="candidatesItems.length === 0"
											:aria-label="
												isAllCandidatesPageSelected ? '取消全選（目前列表）' : '全選（目前列表）'
											"
										>
											{{ isAllCandidatesPageSelected ? "取消全選" : "全選" }}
										</button>
										<input
											v-model="candidatesQuery"
											type="text"
											class="form-input w-full md:max-w-[200px]"
											placeholder="搜尋工號 / 姓名"
											aria-label="搜尋可選人員"
											@keydown.enter="handleSearchCandidates"
										/>
										<button
											type="button"
											class="btn-secondary text-xs 2xl:text-sm"
											@click="handleSearchCandidates"
										>
											搜尋
										</button>
									</div>

									<div v-if="isLoadingCandidates" class="py-6 text-center text-white/60">
										載入中…
									</div>
									<p
										v-else-if="candidatesErrorText"
										class="py-2 text-sm text-rose-300"
										role="alert"
									>
										{{ candidatesErrorText }}
									</p>

									<div v-else class="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto">
										<label
											v-for="p in candidatesItems"
											:key="p.id"
											class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
										>
											<span class="flex min-w-0 items-center gap-2">
												<input
													v-model="selectedMemberIds"
													type="checkbox"
													:value="p.id"
													class="h-4 w-4 accent-cyan-400"
													:aria-label="`選取成員：${p.employee_no} ${p.full_name || ''}`"
												/>
												<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
													<span class="font-mono">{{ p.employee_no }}</span>
													<span class="ms-2">{{ p.full_name || "—" }}</span>
												</span>
											</span>
											<span class="rounded bg-white/5 px-2 py-1 text-xs text-white/70">
												{{ statusLabel(p.status) }}
											</span>
										</label>
									</div>
								</div>

								<p v-if="formErrorMessage" class="text-sm text-rose-300" role="alert">
									{{ formErrorMessage }}
								</p>

								<footer class="mt-2 flex gap-3 2xl:gap-4">
									<button type="button" class="btn-secondary" @click="closeForm">取消</button>
									<div class="flex-1"></div>
									<button type="submit" class="btn-primary" :disabled="isSubmitting">
										{{ isSubmitting ? "處理中..." : editingGroup ? "更新" : "建立" }}
									</button>
								</footer>
							</form>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="handleConfirmDeleteGroup"
	/>
</template>

<script setup lang="ts">
import type { PersonGroup } from "~/types/personnel"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import type { Person } from "~/types/personnel"
import { usePageSelectAll } from "~/composables/systems/personnel/usePageSelectAll"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/usePersonnelCandidatesLoader"

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [value: boolean]; changed: [] }>()

const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const personnelApi = usePersonnelApi()
const groupTreeState = usePersonnelGroupTree()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const mainGroups = computed<PersonGroup[]>(() => groupTreeState.groupTree.value || [])

type ActiveStep = "mainList" | "mainDetail"
const activeStep = ref<ActiveStep>("mainList")
const selectedMainGroupId = ref<number | null>(null)
const selectedMainGroup = computed<PersonGroup | null>(() => {
	const id = selectedMainGroupId.value
	if (id == null) return null
	return (mainGroups.value || []).find((g) => g.id === id) || null
})

const loadTree = async () => {
	isLoading.value = true
	errorMessage.value = null
	try {
		await groupTreeState.refresh()
	} catch (err) {
		errorMessage.value = handleApiError(err, "載入群組失敗") || "載入群組失敗"
	} finally {
		isLoading.value = false
	}
}

watch(
	() => props.modelValue,
	(v) => {
		if (!v) return
		activeStep.value = "mainList"
		selectedMainGroupId.value = null
		void loadTree()
	},
	{ immediate: true }
)

const showForm = ref(false)
const editingGroup = ref<PersonGroup | null>(null)
const formData = reactive<{ name: string; parentId: number | null }>({ name: "", parentId: null })
const isSubmitting = ref(false)
const formErrorMessage = ref<string | null>(null)

const selectedMemberIds = ref<number[]>([])

const isChildGroup = computed(() => formData.parentId != null)

const statusLabel = (status: unknown) => {
	const s = String(status)
	if (s === "active") return "啟用"
	if (s === "inactive") return "停用"
	return "已刪除"
}

// 子群組成員：候選人清單（移除分頁，改為滾動）
const candidatesQuery = ref("")
const candidatesItems = ref<Person[]>([])
const isLoadingCandidates = ref(false)
const candidatesErrorText = ref<string | null>(null)

const loadCandidates = async () => {
	if (!isChildGroup.value) return
	isLoadingCandidates.value = true
	candidatesErrorText.value = null
	try {
		const all = await fetchAllPersonnelCandidates({
			personnelApi,
			query: candidatesQuery.value,
		})
		candidatesItems.value = Array.isArray(all) ? all : []
	} catch (err) {
		candidatesItems.value = []
		candidatesErrorText.value = err instanceof Error ? err.message : "載入人員失敗"
	} finally {
		isLoadingCandidates.value = false
	}
}

const handleSearchCandidates = async () => {
	await loadCandidates()
}

const toggleManySelectedMemberIds = (ids: number[], checked: boolean) => {
	const current = new Set(selectedMemberIds.value || [])
	for (const id of ids || []) {
		const n = Number(id)
		if (!Number.isFinite(n)) continue
		if (checked) current.add(Math.trunc(n))
		else current.delete(Math.trunc(n))
	}
	selectedMemberIds.value = Array.from(current)
}

const candidatesPageSelectAll = usePageSelectAll<Person>({
	items: candidatesItems,
	isSelected: (id) => (selectedMemberIds.value || []).includes(id),
	setMany: toggleManySelectedMemberIds,
})

const isAllCandidatesPageSelected = candidatesPageSelectAll.isAllSelectedOnPage
const handleToggleSelectAllCandidatesPage = candidatesPageSelectAll.toggleSelectAllOnPage

const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const confirmAction = ref<null | { type: "delete"; group: PersonGroup }>(null)

const loadSelectedMemberIds = async (groupId: number) => {
	try {
		const res = await personnelApi.getPersonGroupMemberIds(groupId)
		selectedMemberIds.value = Array.isArray(res?.ids) ? res.ids : []
	} catch {
		selectedMemberIds.value = []
	}
}

const openCreateMain = () => {
	editingGroup.value = null
	formData.name = ""
	formData.parentId = null
	candidatesQuery.value = ""
	candidatesItems.value = []
	selectedMemberIds.value = []
	formErrorMessage.value = null
	showForm.value = true
}

const openCreateChild = (parentId: number) => {
	editingGroup.value = null
	formData.name = ""
	formData.parentId = parentId
	candidatesQuery.value = ""
	candidatesItems.value = []
	selectedMemberIds.value = []
	formErrorMessage.value = null
	showForm.value = true
	void loadCandidates()
}

const openEdit = (g: PersonGroup) => {
	editingGroup.value = g
	formData.name = g.name
	formData.parentId = g.parent_id != null ? Number(g.parent_id) : null
	candidatesQuery.value = ""
	candidatesItems.value = []
	selectedMemberIds.value = []
	formErrorMessage.value = null
	showForm.value = true
	if (formData.parentId != null) {
		void loadSelectedMemberIds(g.id)
		void loadCandidates()
	}
}

const openMainDetail = (main: PersonGroup) => {
	selectedMainGroupId.value = main.id
	activeStep.value = "mainDetail"
}

const backToMainList = () => {
	activeStep.value = "mainList"
	selectedMainGroupId.value = null
}

const openEditMainGroup = () => {
	const g = selectedMainGroup.value
	if (!g) return
	openEdit(g)
}

const openEditChild = (child: PersonGroup) => openEdit(child)

const closeForm = () => {
	showForm.value = false
	editingGroup.value = null
	formErrorMessage.value = null
}

const handleDelete = async (g: PersonGroup) => {
	confirmAction.value = { type: "delete", group: g }
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除群組「${g.name}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
	})
}

const handleConfirmDeleteGroup = async () => {
	const action = confirmAction.value
	if (!action || action.type !== "delete") return
	try {
		await personnelApi.deletePersonGroup(action.group.id)
		toast.success("已刪除群組")
		emit("changed")
		await loadTree()
	} catch (err) {
		errorMessage.value = handleApiError(err, "刪除群組失敗") || "刪除群組失敗"
	} finally {
		confirmAction.value = null
	}
}

const handleSubmit = async () => {
	if (!formData.name.trim()) {
		formErrorMessage.value = "名稱為必填"
		return
	}
	isSubmitting.value = true
	formErrorMessage.value = null
	try {
		const parentId = formData.parentId != null ? Number(formData.parentId) : null
		const payload = { name: formData.name.trim(), parentId }
		const saved = editingGroup.value
			? await personnelApi.updatePersonGroup(editingGroup.value.id, payload)
			: await personnelApi.createPersonGroup(payload)

		if (parentId != null) {
			const unique = Array.from(
				new Set(
					(selectedMemberIds.value || []).map((x) => Number(x)).filter((x) => Number.isFinite(x))
				)
			).map((x) => Math.trunc(x))
			await personnelApi.replacePersonGroupMembers(saved.id, unique)
		}

		toast.success(editingGroup.value ? "已更新群組" : "已新增群組")
		emit("changed")
		closeForm()
		void loadTree()
		if (activeStep.value === "mainDetail" && parentId == null) {
			selectedMainGroupId.value = saved.id
		}
	} catch (err) {
		formErrorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗"
	} finally {
		isSubmitting.value = false
	}
}

const handleClose = () => emit("update:modelValue", false)
</script>

<style scoped></style>
