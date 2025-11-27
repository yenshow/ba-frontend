<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl 2xl:text-4xl font-semibold text-white">用戶管理</h1>
				<p class="text-base 2xl:text-xl text-white/80">管理系統用戶帳號、角色與權限</p>
			</div>
			<div class="flex items-center">
				<button
					v-if="isAdmin"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 2xl:px-6 py-2 2xl:py-3 text-sm 2xl:text-base text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
					@click="showCreateDialog = true"
				>
					新增用戶
				</button>
			</div>
		</header>

		<!-- 用戶列表 -->
		<section class="rounded-2xl bg-white/15 p-6 2xl:p-8 border border-white/20">
			<!-- 骨架屏：載入中時顯示 -->
			<template v-if="isLoading">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">ID</th>
							<th :class="tableHeaderClass">用戶名</th>
							<th :class="tableHeaderClass">Email</th>
							<th :class="tableHeaderClass">角色</th>
							<th :class="tableHeaderClass">狀態</th>
							<th :class="tableHeaderClass">
								<label class="flex flex-col gap-1">
									<span>建立時間</span>
									<select v-model="dateSortOrder" :class="sortSelectClass" @change="handleSortChange">
										<option value="desc">由新到舊</option>
										<option value="asc">由舊到新</option>
									</select>
								</label>
							</th>
							<th v-if="isAdmin" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-white/10">
							<td :class="tableCellClass">
								<div class="h-4 2xl:h-5 w-8 2xl:w-10 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 2xl:h-5 w-20 2xl:w-24 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 2xl:h-5 w-32 2xl:w-40 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-6 2xl:h-7 w-16 2xl:w-20 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-6 2xl:h-7 w-16 2xl:w-20 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 2xl:h-5 w-32 2xl:w-40 bg-white/20 rounded animate-pulse"></div>
							</td>
							<td v-if="isAdmin" :class="tableCellClass">
								<div class="flex gap-2 2xl:gap-3">
									<div class="h-6 2xl:h-7 w-12 2xl:w-16 bg-white/20 rounded animate-pulse"></div>
									<div class="h-6 2xl:h-7 w-12 2xl:w-16 bg-white/20 rounded animate-pulse"></div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>
			<!-- 用戶列表表格：有數據時顯示 -->
			<template v-else-if="users.length > 0">
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
										<option value="desc">由新到舊</option>
										<option value="asc">由舊到新</option>
									</select>
								</label>
							</th>
							<th v-if="isAdmin" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="user in users" :key="user.id" class="border-b border-white/10 hover:bg-white/5 text-base 2xl:text-lg text-white">
							<td :class="tableCellClass">{{ user.id }}</td>
							<td :class="tableCellClass">{{ user.username }}</td>
							<td :class="tableCellClass">{{ user.email }}</td>
							<td :class="tableCellClass">
								<span :class="[getRoleBadgeClass(user.role), 'px-2 2xl:px-3 py-1 2xl:py-1.5 rounded']">
									{{ roleLabels[user.role] }}
								</span>
							</td>
							<td :class="tableCellClass">
								<span :class="[getStatusBadgeClass(user.status), 'px-2 2xl:px-3 py-1 2xl:py-1.5 rounded']">
									{{ statusLabels[user.status] }}
								</span>
							</td>
							<td :class="[tableCellClass, 'text-white/70']">{{ formatDate(user.created_at) }}</td>
							<td v-if="isAdmin" :class="tableCellClass">
								<div class="flex gap-2 2xl:gap-3">
									<button type="button" class="px-3 2xl:px-4 py-1 2xl:py-2 rounded bg-blue-500/80 text-white hover:bg-blue-400" @click="editUser(user)">
										編輯
									</button>
									<button
										v-if="user.id !== currentUser?.id"
										type="button"
										class="px-3 2xl:px-4 py-1 2xl:py-2 rounded bg-red-500/80 text-white hover:bg-red-400"
										@click="confirmDeleteUser(user)"
									>
										刪除
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>

			<!-- 分頁：只在有數據且總數超過每頁限制時顯示 -->
			<div v-if="!isLoading && users.length > 0 && total > limit" class="mt-4 2xl:mt-6 flex items-center justify-between text-white/80">
				<div class="text-sm 2xl:text-base">顯示 {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} / 共 {{ total }} 筆</div>
				<div class="flex gap-2 2xl:gap-3">
					<button
						type="button"
						class="px-3 2xl:px-4 py-1 2xl:py-2 rounded text-sm 2xl:text-base bg-white/10 hover:bg-white/20 disabled:opacity-50"
						:disabled="offset === 0"
						@click="previousPage"
					>
						上一頁
					</button>
					<button
						type="button"
						class="px-3 2xl:px-4 py-1 2xl:py-2 rounded text-sm 2xl:text-base bg-white/10 hover:bg-white/20 disabled:opacity-50"
						:disabled="offset + limit >= total"
						@click="nextPage"
					>
						下一頁
					</button>
				</div>
			</div>
		</section>

		<!-- 建立/編輯用戶對話框 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showCreateDialog || editingUser"
					class="fixed inset-0 bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px] flex items-center justify-center z-[2000]"
					@click.self="closeDialog"
				>
					<div class="w-full max-w-md 2xl:max-w-lg max-h-[90vh] rounded-3xl p-7 2xl:p-8 flex flex-col gap-4 2xl:gap-6 overflow-y-auto dialog-panel-bg">
						<header class="flex items-center justify-between">
							<h3 class="text-lg 2xl:text-xl text-white font-semibold tracking-[4px]">{{ editingUser ? "編輯用戶" : "新增用戶" }}</h3>
							<button
								type="button"
								class="text-[1.75rem] leading-none text-white bg-transparent border-none cursor-pointer transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closeDialog"
							>
								&times;
							</button>
						</header>

						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
							<div class="flex flex-col gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>用戶名</span>
									<input v-model="formData.username" type="text" required class="form-input" />
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>Email</span>
									<input v-model="formData.email" type="email" required class="form-input" />
								</label>
								<label v-if="!editingUser" class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>密碼</span>
									<input v-model="formData.password" type="password" :required="!editingUser" minlength="6" class="form-input" />
								</label>
								<label v-if="isAdmin" class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>角色</span>
									<select v-model="formData.role" class="form-input form-select">
										<option value="viewer">檢視者</option>
										<option value="operator">操作員</option>
										<option value="admin">管理員</option>
									</select>
								</label>
								<label v-if="isAdmin && editingUser" class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>狀態</span>
									<select v-model="formData.status" class="form-input form-select">
										<option value="active">啟用</option>
										<option value="inactive">停用</option>
										<option value="suspended">暫停</option>
									</select>
								</label>
							</div>

							<p v-if="errorMessage" class="text-rose-300 text-sm 2xl:text-base mt-4 2xl:mt-5">{{ errorMessage }}</p>

							<footer class="flex items-center gap-3 2xl:gap-4 mt-2 2xl:mt-3">
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

definePageMeta({
	layout: "default",
	middleware: "admin" // 需要管理員權限
});

const { user: currentUser, isAdmin } = useAuth();
const userApi = useUserApi();
const toast = useToast();

const users = ref<User[]>([]);
const isLoading = ref(true); // 初始為 true，避免首次載入時出現空容器
const errorMessage = ref<string | null>(null);
const showCreateDialog = ref(false);
const editingUser = ref<User | null>(null);
const isSubmitting = ref(false);

// 常數配置
const LIMIT = 20;
const MIN_LOADING_DELAY = 300; // 最小載入延遲時間（ms），防止畫面閃爍

const limit = LIMIT;
const offset = ref(0);
const total = ref(0);
const dateSortOrder = ref<"asc" | "desc">("desc"); // 預設由新到舊

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

// 工具函數
const formatDate = (dateString?: string) => {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleDateString("zh-TW");
};

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

// 業務邏輯函數
const handleError = (error: unknown, defaultMessage: string) => {
	console.error(defaultMessage, error);
	const errorMsg = error instanceof Error ? error.message : defaultMessage;
	errorMessage.value = errorMsg;
	toast.error(errorMsg);
	return errorMsg;
};

const resetForm = () => {
	formData.username = "";
	formData.email = "";
	formData.password = "";
	formData.role = "viewer";
	formData.status = "active";
};

const loadUsers = async () => {
	isLoading.value = true;
	errorMessage.value = null;

	const startTime = Date.now();

	try {
		// 執行 API 請求
		const result = await userApi.getUsers({
			limit,
			offset: offset.value,
			orderBy: "created_at",
			order: dateSortOrder.value
		});

		// 計算已用時間，確保至少顯示最小延遲時間以緩和閃爍
		const elapsed = Date.now() - startTime;
		const remainingDelay = Math.max(0, MIN_LOADING_DELAY - elapsed);

		if (remainingDelay > 0) {
			await new Promise((resolve) => setTimeout(resolve, remainingDelay));
		}

		// 更新數據
		users.value = result.users;
		total.value = result.total;
	} catch (error) {
		handleError(error, "載入用戶列表失敗");
	} finally {
		isLoading.value = false;
	}
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
		if (editingUser.value) {
			// 更新用戶
			await userApi.updateUser(editingUser.value.id, {
				username: formData.username,
				email: formData.email,
				role: formData.role,
				status: formData.status
			});
		} else {
			// 建立用戶
			await userApi.register({
				username: formData.username,
				email: formData.email,
				password: formData.password,
				role: formData.role
			});
		}

		const wasEditing = !!editingUser.value;
		closeDialog();
		await loadUsers();
		toast.success(wasEditing ? "用戶更新成功" : "用戶建立成功");
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
		await userApi.deleteUser(user.id);
		await loadUsers();
		toast.success(`用戶 "${user.username}" 已刪除`);
	} catch (error) {
		const errorMsg = handleError(error, "刪除用戶失敗");
		alert(errorMsg);
	}
};

const previousPage = () => {
	if (offset.value > 0) {
		offset.value -= limit;
		loadUsers();
	}
};

const nextPage = () => {
	if (offset.value + limit < total.value) {
		offset.value += limit;
		loadUsers();
	}
};

const handleSortChange = () => {
	offset.value = 0; // 重置分頁
	loadUsers();
};

onMounted(() => {
	loadUsers();
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
