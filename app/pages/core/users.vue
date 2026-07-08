<template>
	<div class="page-shell">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="page-title">用戶管理</h1>
				<p class="page-subtitle">
					管理系統用戶帳號、角色與權限
				</p>
			</div>
			<div class="flex items-center">
				<PermissionActionButton
					:allowed="canAdmin"
					aria-label="新增用戶"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="showCreateDialog = true"
				>
					新增用戶
				</PermissionActionButton>
			</div>
		</header>

		<!-- 用戶列表 -->
		<section class="section-card">
			<AsyncPanel
				:loading="isLoading"
				:empty="!isLoading && visibleUsers.length === 0"
				:error="listLoadError"
				empty-title="尚無用戶資料"
				empty-description="點擊「新增用戶」建立第一個帳號"
			>
				<div :key="`users-${offset}-${visibleUsers.length}`" class="table-scroll">
					<table class="w-full min-w-[640px] text-center">
						<thead>
							<tr class="border-b border-white/20">
								<th class="table-th">#</th>
								<th class="table-th">用戶名</th>
								<th class="table-th">角色</th>
								<th class="table-th">狀態</th>
								<th class="table-th">
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
								<th class="table-th">操作</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(user, index) in visibleUsers"
								:key="user.id"
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td class="table-td">{{ offset + index + 1 }}</td>
								<td class="table-td">{{ user.username }}</td>
								<td class="table-td">
									<span
										:class="[getRoleBadgeClass(user.role), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']"
									>
										{{ getUserRoleLabel(user.role) }}
									</span>
								</td>
								<td class="table-td">
									<span
										:class="[
											getStatusBadgeClass(user.status),
											'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
										]"
									>
										{{ statusLabels[user.status] }}
									</span>
								</td>
								<td class="table-td text-white/70">
									{{ formatDate(user.created_at) }}
								</td>
								<td class="table-td">
									<div class="flex flex-wrap gap-2 2xl:gap-3">
										<button type="button" class="btn-list-edit" @click="editUser(user)">
											編輯
										</button>
										<PermissionActionButton
											:allowed="canShowResetPasswordButton(user)"
											aria-label="重設密碼"
											class="btn-list-reset"
											@click="confirmResetPassword(user)"
										>重設密碼</PermissionActionButton>
										<PermissionActionButton
											:allowed="canShowDeleteButton(user)"
											aria-label="刪除用戶"
											class="btn-list-delete"
											@click="confirmDeleteUser(user)"
										>刪除</PermissionActionButton>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<!-- 分頁：只有總數大於每頁筆數時才顯示 -->
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
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
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
							<fieldset
								:disabled="!canAdmin"
								class="flex min-w-0 flex-col gap-4 border-0 p-0 2xl:gap-6"
							>
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
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>角色</span>
									<div
										v-if="isRoleReadOnlyOnEdit"
										class="form-input cursor-not-allowed bg-white/5 text-white/80"
										aria-readonly="true"
									>
										{{ getUserRoleLabel(formData.role) }}
									</div>
									<FilterDropdown
										v-else
										v-model="formData.role"
										:options="roleFormOptions"
										placeholder="請選擇角色"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleRoleFilterChange"
									/>
								</label>
								<div
									v-show="formData.role !== 'admin'"
									class="flex flex-col gap-2 border-t border-white/15 pt-4"
								>
									<span class="text-sm font-medium text-white/90 2xl:text-base">功能權限</span>
									<UserPermissionEditor
										v-model="permissionGranted"
										:definitions="permissionDefinitions"
										:loading="permissionLoading"
									/>
								</div>
								<label
									v-show="!!editingUser"
									class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base"
								>
									<label class="relative inline-flex cursor-pointer items-center">
										<input
											v-model="formData.status"
											type="checkbox"
											value="active"
											true-value="active"
											false-value="inactive"
											class="peer sr-only"
											aria-label="用戶啟用狀態"
										/>
										<div
											class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
										></div>
										<span class="ml-3 text-sm 2xl:text-base">{{
											formData.status === "active" ? "已啟用" : "已停用"
										}}</span>
									</label>
								</label>
							</fieldset>

							<p v-if="errorMessage" class="form-error-text mt-4 2xl:mt-5">
								{{ errorMessage }}
							</p>

							<footer class="mt-2 flex items-center gap-3 2xl:mt-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closeDialog">取消</button>
								<div class="flex-1"></div>
								<PermissionActionButton
									native-type="submit"
									:allowed="canAdmin"
									:disabled="isSubmitting"
									aria-label="儲存用戶"
									class="btn-primary"
								>
									{{ isSubmitting ? "處理中…" : editingUser ? "更新" : "建立" }}
								</PermissionActionButton>
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
import { TOAST } from "~/config/toastCatalog"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { PermissionDefinition, User } from "~/types/user"
import Pagination from "~/components/common/Pagination.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import UserPermissionEditor from "~/components/common/UserPermissionEditor.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { formatDate } from "~/utils/dateUtils"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { useAuth, useAdminOnly, usePlatformAdmin, isPlatformAdmin } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useUserApi } from "~/composables/systems/users/useUserApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { applyFormApiErrorToRef } from "~/utils/apiError"
import { validateUserFormForSave } from "~/utils/userFormValidation"
import {
	buildGrantedMap,
	permissionGrantedMapsEqual,
	permissionOverridesFromGranted,
} from "~/composables/systems/users/useUserPermissionDraft"
import {
	canResetPasswordForUser,
	DEFAULT_RESET_PASSWORD,
} from "~/composables/systems/users/useAccountSettings"
import { getUserRoleFormOptions, getUserRoleLabel } from "~/utils/userRoleLabels"

definePageMeta({
	layout: "auxiliary",
})

const { user: currentUser, fetchUser } = useAuth()
const canAdmin = useAdminOnly()
const canPlatformAdmin = usePlatformAdmin()
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
const pendingActionUserId = ref<number | null>(null)
const confirmMode = ref<"delete" | "resetPassword">("delete")

const permissionDefinitions = ref<PermissionDefinition[]>([])
const permissionGranted = ref<Record<number, boolean>>({})
const permissionInitialGranted = ref<Record<number, boolean>>({})
const permissionLoading = ref(false)
const initialRoleOnEdit = ref<"admin" | "user" | null>(null)

const isPermissionDirty = computed(
	() => !permissionGrantedMapsEqual(permissionGranted.value, permissionInitialGranted.value)
)

// 使用 useDataLoader 統一管理列表載入
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

const visibleUsers = computed(() => {
	if (canPlatformAdmin.value) return users.value
	return users.value.filter((u) => !isPlatformAdmin(u))
})

const statusLabels: Record<"active" | "inactive", string> = {
	active: "啟用",
	inactive: "停用",
}

const roleFormOptions = computed(() => getUserRoleFormOptions(canPlatformAdmin.value))

const isRoleReadOnlyOnEdit = computed(
	() => !!editingUser.value && editingUser.value.role === "admin" && !canPlatformAdmin.value,
)

// 日期排序篩選選項（供 FilterDropdown 使用）
const dateSortOptions = [
	{ value: "asc", label: "由舊到新" },
	{ value: "desc", label: "由新到舊" },
]

// 統一表格樣式
const formData = reactive({
	username: "",
	password: "",
	role: "user" as "admin" | "user",
	status: "active" as "active" | "inactive",
})

const getRoleBadgeClass = (role: string) => {
	const classes = {
		admin: "bg-red-500/20 text-red-200",
		user: "bg-gray-500/20 text-gray-200",
	}
	return classes[role as keyof typeof classes] || classes.user
}

const getStatusBadgeClass = (status: string) => {
	const classes = {
		active: "bg-emerald-500/20 text-emerald-100",
		inactive: "bg-yellow-500/20 text-yellow-200",
	}
	return classes[status as keyof typeof classes] ?? classes.inactive
}

const canShowResetPasswordButton = (user: User) => canResetPasswordForUser(currentUser.value, user)

const canShowDeleteButton = (user: User) => {
	if (!canAdmin.value) return false
	if (currentUser.value && user.id === currentUser.value.id) return false
	if (isPlatformAdmin(user)) return false
	if (!canPlatformAdmin.value && user.role === "admin") return false
	return true
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
	formData.role = "user"
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
			setPermissionGrantedSnapshot(buildGrantedMap(permissionDefinitions.value, overridesByPermId))
		} else {
			setPermissionGrantedSnapshot(buildGrantedMap(permissionDefinitions.value))
		}
	} catch (error) {
		applyFormApiErrorToRef(errorMessage, error, userId != null ? "載入權限清單失敗" : "載入權限清單失敗")
	} finally {
		permissionLoading.value = false
	}
}

const handleRoleFilterChange = async () => {
	if (formData.role === "admin") {
		resetPermissionDraft()
		return
	}
	try {
		await ensurePermissionDefinitions()
		setPermissionGrantedSnapshot(buildGrantedMap(permissionDefinitions.value))
	} catch (error) {
		applyFormApiErrorToRef(errorMessage, error, "操作失敗")
	}
}

const editUser = async (user: User) => {
	if (isPlatformAdmin(user) && !canPlatformAdmin.value) return
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
		formData.role = "user"
		await loadPermissionDraft()
	}
})

const executeSubmit = async () => {
	isSubmitting.value = true
	errorMessage.value = null

	try {
		if (editingUser.value) {
			const userId = editingUser.value.id
			const roleForUpdate = isRoleReadOnlyOnEdit.value
				? initialRoleOnEdit.value!
				: formData.role

			const updateRes = await userApi.updateUser(userId, {
				username: formData.username,
				role: roleForUpdate,
				status: formData.status,
			})

			if (roleForUpdate !== "admin") {
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
			toast.success(
				currentUser.value?.id === userId
					? "用戶已更新"
					: "用戶已更新；若對方正在使用中，請對方重新登入後權限才會生效"
			)
			closeDialog()
			return
		}

		const overrides =
			formData.role === "admin"
				? []
				: permissionOverridesFromGranted(permissionDefinitions.value, permissionGranted.value)
		await userApi.createUser({
			username: formData.username,
			password: formData.password,
			role: formData.role,
			overrides,
		})
		resetPage()
		await load({ order: dateSortOrder.value }, true)
		toast.success(TOAST.USER_CREATED)
		closeDialog()
	} catch (error) {
		applyFormApiErrorToRef(errorMessage, error, "操作失敗")
	} finally {
		isSubmitting.value = false
	}
}

const handleSubmit = async () => {
	errorMessage.value = null
	const formError = validateUserFormForSave({
		username: formData.username,
		password: formData.password,
		isEditing: !!editingUser.value,
	})
	if (formError) {
		errorMessage.value = formError
		return
	}
	formData.username = formData.username.trim()
	await executeSubmit()
}

const confirmDeleteUser = (user: User) => {
	pendingActionUserId.value = user.id
	confirmMode.value = "delete"
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除用戶「${user.username}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
		confirmText: "刪除",
		cancelText: "取消",
	})
}

const confirmResetPassword = (user: User) => {
	pendingActionUserId.value = user.id
	confirmMode.value = "resetPassword"
	confirmDialog.show({
		title: "重設密碼",
		message: `確定要將「${user.username}」的密碼重設為預設值嗎？`,
		details: `密碼將設為 ${DEFAULT_RESET_PASSWORD}，請通知對方使用新密碼重新登入。`,
		type: "warning",
		confirmText: "重設",
		cancelText: "取消",
	})
}

const handleConfirmDialog = async () => {
	const id = pendingActionUserId.value
	if (id == null) return
	const target = users.value.find((u) => u.id === id)
	if (!target) {
		pendingActionUserId.value = null
		return
	}

	if (confirmMode.value === "resetPassword") {
		try {
			const result = await userApi.updatePassword(id, {
				newPassword: DEFAULT_RESET_PASSWORD,
			})
			toast.success(result.message || "密碼已重設")
		} catch (error) {
			handleApiError(error, "重設密碼失敗")
		} finally {
			pendingActionUserId.value = null
		}
		return
	}

	try {
		const result = await userApi.deleteUser(target.id)
		users.value = users.value.filter((u) => u.id !== target.id)
		total.value = Math.max(0, total.value - 1)
		toast.success(result.message || "刪除成功")
	} catch (error) {
		handleApiError(error, "刪除用戶失敗")
	} finally {
		pendingActionUserId.value = null
	}
}

const handleCancelConfirmDialog = () => {
	pendingActionUserId.value = null
}

const handlePreviousPage = () => {
	prevPage({ order: dateSortOrder.value })
}

const handleNextPage = () => {
	nextPage({ order: dateSortOrder.value })
}

const handleSortChange = () => {
	resetPage()
	load({ order: dateSortOrder.value }, true)
}

onMounted(() => {
	load({ order: dateSortOrder.value }, true)
})
</script>
