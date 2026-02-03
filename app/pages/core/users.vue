<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">用戶管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理系統用戶帳號、角色與權限</p>
			</div>
			<div class="flex items-center">
				<button
					v-if="isAdmin"
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
			<!-- 用戶列表表格：使用過渡動畫 -->
			<div class="min-h-[500px]">
				<Transition name="fade" mode="out-in">
					<div v-if="users.length > 0" :key="`users-${offset}-${users.length}`">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">ID</th>
									<th :class="tableHeaderClass">用戶名</th>
									<th :class="tableHeaderClass">Email</th>
									<th :class="tableHeaderClass">角色</th>
									<th :class="tableHeaderClass">狀態</th>
									<th :class="tableHeaderClass">
										<label>
											<select v-model="dateSortOrder" :class="sortSelectClass" @change="handleSortChange">
												<option value="asc">由舊到新</option>
												<option value="desc">由新到舊</option>
											</select>
										</label>
									</th>
									<th v-if="isAdmin" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="user in users"
									:key="user.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ user.id }}</td>
									<td :class="tableCellClass">{{ user.username }}</td>
									<td :class="tableCellClass">{{ user.email }}</td>
									<td :class="tableCellClass">
										<span :class="[getRoleBadgeClass(user.role), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']">
											{{ roleLabels[user.role] }}
										</span>
									</td>
									<td :class="tableCellClass">
										<span
											:class="[getStatusBadgeClass(user.status), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']"
										>
											{{ statusLabels[user.status] }}
										</span>
									</td>
									<td :class="[tableCellClass, 'text-white/70']">{{ formatDate(user.created_at) }}</td>
									<td v-if="isAdmin" :class="tableCellClass">
										<div class="flex gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="editUser(user)"
											>
												編輯
											</button>
											<button
												v-if="user.id !== currentUser?.id"
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
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
				</Transition>
			</div>
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
						class="dialog-panel-bg flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:max-w-lg 2xl:gap-6 2xl:p-8"
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
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>Email</span>
									<input v-model="formData.email" type="email" required class="form-input" />
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
									v-if="isAdmin"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>角色</span>
									<select v-model="formData.role" class="form-input form-select">
										<option value="viewer">檢視者</option>
										<option value="operator">操作員</option>
										<option value="admin">管理員</option>
									</select>
								</label>
								<label
									v-if="isAdmin && editingUser"
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
	</div>
</template>

<script setup lang="ts">
import type { User } from "~/types/user";
import Pagination from "~/components/common/Pagination.vue";
import { formatDate } from "~/utils/dateUtils";
import { useDataLoader } from "~/composables/monitoring/useDataLoader";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useUserApi } from "~/composables/systems/useUserApi";

definePageMeta({
	layout: "auxiliary",
	middleware: "admin" // 需要管理員權限
});

const { user: currentUser, isAdmin } = useAuth();
const userApi = useUserApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();

const dateSortOrder = ref<"asc" | "desc">("asc"); // 預設由舊到新
const showCreateDialog = ref(false);
const editingUser = ref<User | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

// 使用 useDataLoader 統一管理數據載入
const {
	data: users,
	total,
	offset,
	isLoading,
	load,
	nextPage,
	prevPage,
	resetPage
} = useDataLoader<User, { order: "asc" | "desc" }>({
		fetcher: async params => {
			const result = await userApi.getUsers({
				limit: 20,
				offset: 0,
				orderBy: "id",
				order: params.order
			});
			return { items: result.users, total: result.total };
		},
	debounce: 300,
	pageSize: 20,
	minLoadingDelay: 300, // 防止畫面閃爍
	onError: err => {
		const errorMsg = handleApiError(err, "載入用戶列表失敗");
		errorMessage.value = errorMsg || "載入用戶列表失敗";
	}
});

const limit = 20; // 用於分頁組件

// 標籤映射
const roleLabels: Record<string, string> = {
	admin: "管理員",
	operator: "操作員",
	viewer: "檢視者"
};

const statusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	suspended: "暫停"
};

// 統一樣式類
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";
const sortSelectClass =
	"rounded-lg border border-white/40 bg-white/10 px-2 2xl:px-3 py-1 2xl:py-2 text-sm 2xl:text-base text-white focus:border-white focus:outline-none";

const formData = reactive({
	username: "",
	email: "",
	password: "",
	role: "viewer" as "admin" | "operator" | "viewer",
	status: "active" as "active" | "inactive" | "suspended"
});

const getRoleBadgeClass = (role: string) => {
	const classes = {
		admin: "bg-red-500/20 text-red-200",
		operator: "bg-blue-500/20 text-blue-200",
		viewer: "bg-gray-500/20 text-gray-200"
	};
	return classes[role as keyof typeof classes] || classes.viewer;
};

const getStatusBadgeClass = (status: string) => {
	const classes = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		suspended: "bg-red-500/20 text-red-200"
	};
	return classes[status as keyof typeof classes] || classes.inactive;
};

// 業務邏輯函數：統一錯誤處理（同時更新頁面錯誤訊息）
const handleError = (error: unknown, defaultMessage: string) => {
	const errorMsg = handleApiError(error, defaultMessage);
	errorMessage.value = errorMsg || defaultMessage;
	return errorMsg;
};

const resetForm = () => {
	formData.username = "";
	formData.email = "";
	formData.password = "";
	formData.role = "viewer";
	formData.status = "active";
};

const editUser = (user: User) => {
	editingUser.value = user;
	formData.username = user.username;
	formData.email = user.email;
	formData.role = user.role;
	formData.status = user.status;
	formData.password = "";
};

const closeDialog = () => {
	showCreateDialog.value = false;
	editingUser.value = null;
	resetForm();
	errorMessage.value = null;
};

const handleSubmit = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;

	try {
		const result = editingUser.value
			? // 更新用戶
				await userApi.updateUser(editingUser.value.id, {
					username: formData.username,
					email: formData.email,
					role: formData.role,
					status: formData.status
				})
			: // 建立用戶
				await userApi.register({
					username: formData.username,
					email: formData.email,
					password: formData.password,
					role: formData.role
				});

		// 更新本地狀態（避免不必要的重新載入）
		if (editingUser.value) {
			// 更新操作：更新本地狀態
			const index = users.value.findIndex(u => u.id === editingUser.value!.id);
			if (index > -1) {
				users.value[index] = result.user;
			}
		} else {
			// 創建操作：添加到本地
			users.value.push(result.user);
			total.value += 1;
		}

		closeDialog();
		toast.success(result.message || "操作成功");
	} catch (error) {
		handleError(error, "操作失敗");
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeleteUser = async (user: User) => {
	if (!confirm(`確定要刪除用戶 "${user.username}" 嗎？此操作無法復原。`)) {
		return;
	}

	try {
		const result = await userApi.deleteUser(user.id);

		// 從本地移除（避免不必要的重新載入）
		users.value = users.value.filter(u => u.id !== user.id);
		total.value = Math.max(0, total.value - 1);

		toast.success(result.message || "刪除成功");
	} catch (error) {
		handleError(error, "刪除用戶失敗");
	}
};

const handlePreviousPage = () => {
	prevPage({ order: dateSortOrder.value });
};

const handleNextPage = () => {
	nextPage({ order: dateSortOrder.value });
};

const handleSortChange = () => {
	resetPage();
	load({ order: dateSortOrder.value }, true); // 立即執行
};

onMounted(() => {
	load({ order: dateSortOrder.value }, true); // 立即執行
});
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

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

.btn-primary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	border: none;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
