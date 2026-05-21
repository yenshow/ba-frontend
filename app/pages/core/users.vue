<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">用戶管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">
					管理系統用戶帳號、角色與各模組<strong class="font-normal text-white">頁面進入</strong>權限
				</p>
			</div>
			<div class="flex items-center">
				<button
					v-if="canWrite"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="showCreateDialog = true"
				>
					新增用戶
				</button>
			</div>
		</header>

		<!-- 用戶列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<AsyncPanel
				:loading="isLoading"
				:empty="!isLoading && visibleUsers.length === 0"
				:error="listLoadError"
				empty-title="尚無用戶資料"
				empty-description="點擊「新增用戶」建立第一個帳號"
			>
				<div :key="`users-${offset}-${visibleUsers.length}`">
					<table class="w-full text-center">
						<thead>
							<tr class="border-b border-white/20">
								<th :class="tableHeaderClass">#</th>
								<th :class="tableHeaderClass">用戶名</th>
								<th :class="tableHeaderClass">角色</th>
								<th :class="tableHeaderClass">狀態</th>
								<th :class="tableHeaderClass">
									<div class="flex min-w-[80px] justify-center 2xl:min-w-[100px]">
										<FilterDropdown
											v-model="dateSortOrder"
											:options="dateSortOptions"
											placeholder="排序"
											text-size="text-sm 2xl:text-base"
											@update:model-value="handleSortChange"
										/>
									</div>
								</th>
								<th v-if="canWrite" :class="tableHeaderClass">操作</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(user, index) in visibleUsers"
								:key="user.id"
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">{{ offset + index + 1 }}</td>
								<td :class="tableCellClass">{{ user.username }}</td>
								<td :class="tableCellClass">
									<span
										:class="[getRoleBadgeClass(user.role), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']"
									>
										{{ roleLabels[user.role] }}
									</span>
								</td>
								<td :class="tableCellClass">
									<span
										:class="[
											getStatusBadgeClass(user.status),
											'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
										]"
									>
										{{ statusLabels[user.status] }}
									</span>
								</td>
								<td :class="[tableCellClass, 'text-white/70']">
									{{ formatDate(user.created_at) }}
								</td>
								<td v-if="canWrite" :class="tableCellClass">
									<div class="flex flex-wrap gap-2 2xl:gap-3">
										<button type="button" class="btn-list-edit" @click="editUser(user)">
											編輯
										</button>
										<button
											v-if="canShowDeleteButton(user)"
											type="button"
											class="btn-list-delete"
											@click="confirmDeleteUser(user)"
										>
											刪除
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<!-- 分頁：只在有數據且總數超過每頁限制時顯示 -->
					<Pagination
						v-if="total > limit"
						:total="total"
						:offset="offset"
						:limit="limit"
						:disabled="isLoading"
						@previous="handlePreviousPage"
						@next="handleNextPage"
					/>
				</div>
			</AsyncPanel>
		</section>

		<!-- 建立/編輯用戶對話框 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showCreateDialog || editingUser"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closeDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								{{ editingUser ? "編輯用戶" : "新增用戶" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closeDialog"
							>
								&times;
							</button>
						</header>

						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
							<div class="flex flex-col gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>用戶名</span>
									<input v-model="formData.username" type="text" required class="form-input" />
								</label>
								<label
									v-if="!editingUser"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>密碼</span>
									<input
										v-model="formData.password"
										type="password"
										:required="!editingUser"
										minlength="6"
										class="form-input"
									/>
								</label>
								<label
									v-if="canWrite"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>角色</span>
									<select
										v-model="formData.role"
										class="form-input form-select"
										@change="handleRoleSelectChange"
									>
										<option value="viewer">檢視者</option>
										<option value="operator">操作員</option>
										<option v-if="isAdmin" value="admin">管理員</option>
									</select>
								</label>
								<div
									v-if="canWrite && formData.role !== 'admin'"
									class="flex flex-col gap-2 border-t border-white/15 pt-4"
								>
									<span class="text-sm font-medium text-white/90 2xl:text-base">頁面進入權限</span>
									<span class="text-xs text-white/50">請手動勾選可進入的模組（預設皆不勾選）</span>
									<UserPermissionEditor
										v-model="permissionGranted"
										:definitions="permissionDefinitions"
										:loading="permissionLoading"
									/>
								</div>
								<label
									v-if="canWrite && editingUser"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>狀態</span>
									<select v-model="formData.status" class="form-input form-select">
										<option value="active">啟用</option>
										<option value="inactive">停用</option>
										<option value="suspended">暫停</option>
									</select>
								</label>
							</div>

							<p v-if="errorMessage" class="mt-4 text-sm text-rose-300 2xl:mt-5 2xl:text-base">
								{{ errorMessage }}
							</p>

							<footer class="mt-2 flex items-center gap-3 2xl:mt-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closeDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSubmitting">
									{{ isSubmitting ? "處理中..." : editingUser ? "更新" : "建立" }}
								</button>
							</footer>
						</form>
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
			:confirm-text="confirmDialogConfig.confirmText"
			:cancel-text="confirmDialogConfig.cancelText"
			@confirm="handleConfirmDialog"
			@cancel="handleCancelConfirmDialog"
		/>
	</div>
</template>

<script setup lang="ts">
import type { PermissionDefinition, User } from "~/types/user"
import Pagination from "~/components/common/Pagination.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import UserPermissionEditor from "~/components/common/UserPermissionEditor.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { formatDate } from "~/utils/dateUtils"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useUserApi } from "~/composables/systems/users/useUserApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import {
	buildGrantedMap,
	permissionGrantedMapsEqual,
	permissionOverridesFromGranted,
} from "~/composables/systems/users/useUserPermissionDraft"

definePageMeta({
	layout: "default",
})

const { user: currentUser, isAdmin, canWrite, fetchUser } = useAuth()
const userApi = useUserApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()

const dateSortOrder = ref<"asc" | "desc">("asc") // 預設由舊到新
const showCreateDialog = ref(false)
const editingUser = ref<User | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const confirmDialog = useConfirmDialog()
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})
const confirmDialogConfig = computed(() => confirmDialog.config.value)
const pendingDeleteUserId = ref<number | null>(null)
const confirmMode = ref<"delete">("delete")

const permissionDefinitions = ref<PermissionDefinition[]>([])
const permissionGranted = ref<Record<number, boolean>>({})
const permissionInitialGranted = ref<Record<number, boolean>>({})
const permissionLoading = ref(false)
const initialRoleOnEdit = ref<"admin" | "operator" | "viewer" | null>(null)

const isPermissionDirty = computed(
	() => !permissionGrantedMapsEqual(permissionGranted.value, permissionInitialGranted.value)
)

// 使用 useDataLoader 統一管理數據載入
const {
	data: users,
	total,
	offset,
	isLoading,
	errorMessage: listLoadError,
	load,
	nextPage,
	prevPage,
	resetPage,
} = useDataLoader<User, { order: "asc" | "desc"; limit?: number; offset?: number }>({
	fetcher: async (params) => {
		const result = await userApi.getUsers({
			limit: params.limit ?? 20,
			offset: params.offset ?? 0,
			orderBy: "id",
			order: params.order,
		})
		return { items: result.users, total: result.total }
	},
	debounce: 300,
	pageSize: 20,
	onError: (err) => handleApiError(err, "載入用戶列表失敗") || "載入用戶列表失敗",
})

const limit = 20 // 用於分頁組件

// operator 不顯示 admin；admin 則可看到全部
const visibleUsers = computed(() =>
	isAdmin.value ? users.value : users.value.filter((u) => u.role !== "admin")
)

// 標籤映射
const roleLabels: Record<string, string> = {
	admin: "管理員",
	operator: "操作員",
	viewer: "檢視者",
}

const statusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	suspended: "暫停",
}

// 日期排序篩選選項（供 FilterDropdown 使用）
const dateSortOptions = [
	{ value: "asc", label: "由舊到新" },
	{ value: "desc", label: "由新到舊" },
]

// 統一樣式類
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const formData = reactive({
	username: "",
	password: "",
	role: "viewer" as "admin" | "operator" | "viewer",
	status: "active" as "active" | "inactive" | "suspended",
})

const getRoleBadgeClass = (role: string) => {
	const classes = {
		admin: "bg-red-500/20 text-red-200",
		operator: "bg-blue-500/20 text-blue-200",
		viewer: "bg-gray-500/20 text-gray-200",
	}
	return classes[role as keyof typeof classes] || classes.viewer
}

const getStatusBadgeClass = (status: string) => {
	const classes = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		suspended: "bg-red-500/20 text-red-200",
	}
	return classes[status as keyof typeof classes] || classes.inactive
}

const canShowDeleteButton = (user: User) => {
	if (!canWrite.value) {
		return false
	}
	// 不顯示刪除自己的按鈕
	if (currentUser.value && user.id === currentUser.value.id) {
		return false
	}
	// 操作員不可刪除 admin（雖然列表已不顯示 admin，仍加雙重保護）
	if (!isAdmin.value && user.role === "admin") {
		return false
	}
	return true
}

// 業務邏輯函數：統一錯誤處理（同時更新頁面錯誤訊息）
const handleError = (error: unknown, defaultMessage: string) => {
	const errorMsg = handleApiError(error, defaultMessage)
	errorMessage.value = errorMsg || defaultMessage
	return errorMsg
}

const resetPermissionDraft = () => {
	permissionDefinitions.value = []
	permissionGranted.value = {}
	permissionInitialGranted.value = {}
	initialRoleOnEdit.value = null
}

const resetForm = () => {
	formData.username = ""
	formData.password = ""
	formData.role = "viewer"
	formData.status = "active"
	resetPermissionDraft()
}

const setPermissionGrantedSnapshot = (granted: Record<number, boolean>) => {
	permissionGranted.value = granted
	permissionInitialGranted.value = { ...granted }
}

const ensurePermissionDefinitions = async () => {
	if (permissionDefinitions.value.length > 0) return
	const res = await userApi.getPermissionDefinitions()
	permissionDefinitions.value = res.definitions
}

const loadPermissionDraft = async (userId?: number) => {
	if (formData.role === "admin") {
		resetPermissionDraft()
		return
	}
	permissionLoading.value = true
	try {
		await ensurePermissionDefinitions()
		if (userId != null) {
			const { overridesByPermId } = await userApi.getUserPermissionOverrides(userId)
			setPermissionGrantedSnapshot(
				buildGrantedMap(permissionDefinitions.value, overridesByPermId)
			)
		} else {
			setPermissionGrantedSnapshot(buildGrantedMap(permissionDefinitions.value))
		}
	} catch (error) {
		handleError(error, userId != null ? "載入權限設定失敗" : "載入權限清單失敗")
	} finally {
		permissionLoading.value = false
	}
}

const handleRoleSelectChange = async () => {
	if (formData.role === "admin") {
		resetPermissionDraft()
		return
	}
	try {
		await ensurePermissionDefinitions()
		setPermissionGrantedSnapshot(buildGrantedMap(permissionDefinitions.value))
	} catch (error) {
		handleError(error, "載入權限清單失敗")
	}
}

const editUser = async (user: User) => {
	editingUser.value = user
	formData.username = user.username
	formData.role = user.role
	formData.status = user.status
	formData.password = ""
	initialRoleOnEdit.value = user.role
	errorMessage.value = null
	await loadPermissionDraft(user.id)
}

const closeDialog = () => {
	showCreateDialog.value = false
	editingUser.value = null
	resetForm()
	errorMessage.value = null
}

watch(showCreateDialog, async (open) => {
	if (open) {
		resetForm()
		formData.role = "viewer"
		await loadPermissionDraft()
	}
})

const executeSubmit = async () => {
	isSubmitting.value = true
	errorMessage.value = null

	try {
		if (editingUser.value) {
			const userId = editingUser.value.id
			const roleChanged =
				initialRoleOnEdit.value != null && formData.role !== initialRoleOnEdit.value

			const updateRes = await userApi.updateUser(userId, {
				username: formData.username,
				role: formData.role,
				status: formData.status,
			})

			if (formData.role !== "admin") {
				const overrides = permissionOverridesFromGranted(
					permissionDefinitions.value,
					permissionGranted.value
				)
				await userApi.updateUserPermissions(userId, overrides)
				if (currentUser.value?.id === userId) {
					await fetchUser()
				}
			}

			const index = users.value.findIndex((u) => u.id === userId)
			if (index > -1) {
				users.value[index] = updateRes.user
			}
			closeDialog()
			toast.success(
				currentUser.value?.id === userId
					? "用戶已更新"
					: "用戶已更新；對方需重新整理或重新登入後權限才會生效"
			)
			return
		}

		const overrides =
			formData.role === "admin"
				? []
				: permissionOverridesFromGranted(permissionDefinitions.value, permissionGranted.value)
		const createRes = await userApi.createUser({
			username: formData.username,
			password: formData.password,
			role: formData.role,
			overrides,
		})
		users.value.push(createRes.user)
		total.value += 1
		closeDialog()
		toast.success("用戶已建立")
	} catch (error) {
		handleError(error, "操作失敗")
	} finally {
		isSubmitting.value = false
	}
}

const handleSubmit = async () => {
	await executeSubmit()
}

const confirmDeleteUser = (user: User) => {
	pendingDeleteUserId.value = user.id
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除用戶「${user.username}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
		confirmText: "刪除",
		cancelText: "取消",
	})
}

const handleConfirmDialog = async () => {
	const id = pendingDeleteUserId.value
	if (id == null) return
	const user = users.value.find((u) => u.id === id)
	if (!user) {
		pendingDeleteUserId.value = null
		return
	}

	try {
		const result = await userApi.deleteUser(user.id)
		users.value = users.value.filter((u) => u.id !== user.id)
		total.value = Math.max(0, total.value - 1)
		toast.success(result.message || "刪除成功")
	} catch (error) {
		handleError(error, "刪除用戶失敗")
	} finally {
		pendingDeleteUserId.value = null
	}
}

const handleCancelConfirmDialog = () => {
	pendingDeleteUserId.value = null
}

const handlePreviousPage = () => {
	prevPage({ order: dateSortOrder.value })
}

const handleNextPage = () => {
	nextPage({ order: dateSortOrder.value })
}

const handleSortChange = () => {
	resetPage()
	load({ order: dateSortOrder.value }, true) // 立即執行
}

onMounted(() => {
	load({ order: dateSortOrder.value }, true) // 立即執行
})
</script>

<style scoped>
.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}

.form-input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}
</style>
