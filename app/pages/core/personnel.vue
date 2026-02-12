<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">
					管理人員群組、人員主檔、門禁權限與設備同步
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2 2xl:gap-3">
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="handleOpenGroupDialog()"
				>
					新增群組
				</button>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="handleOpenPersonDialog()"
				>
					新增人員
				</button>
			</div>
		</header>

		<!-- 區塊一：人員群組 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<h2 class="mb-4 text-xl font-semibold text-white 2xl:mb-6 2xl:text-2xl">人員群組</h2>
			<div class="min-h-[200px]">
				<Transition name="fade" mode="out-in">
					<div v-if="groups.length > 0" key="groups-list">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">名稱</th>
									<th :class="tableHeaderClass">說明</th>
									<th v-if="canEdit" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="group in groups"
									:key="group.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ group.name }}</td>
									<td :class="tableCellClass">{{ group.description || "—" }}</td>
									<td v-if="canEdit" :class="tableCellClass">
										<div class="flex justify-center gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="handleOpenGroupDialog(group)"
											>
												編輯
											</button>
											<button
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
												@click="handleConfirmDeleteGroup(group)"
											>
												刪除
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else key="groups-empty" class="py-8 text-center text-white/60">
						{{ groupsLoading ? "載入中..." : "尚無人員群組" }}
					</div>
				</Transition>
			</div>
		</section>

		<!-- 區塊二：人員列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<h2 class="mb-4 text-xl font-semibold text-white 2xl:mb-6 2xl:text-2xl">人員列表</h2>
			<!-- 篩選 -->
			<div class="mb-4 flex flex-wrap items-center gap-3 2xl:mb-6 2xl:gap-4">
				<select
					v-model="filterPersonGroupId"
					class="form-input form-select w-40 2xl:w-48"
					@change="handleFilterChange"
				>
					<option value="">全部群組</option>
					<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
				</select>
				<select
					v-model="filterStatus"
					class="form-input form-select w-32 2xl:w-40"
					@change="handleFilterChange"
				>
					<option value="">全部狀態</option>
					<option value="active">啟用</option>
					<option value="inactive">停用</option>
					<option value="deleted">已刪除</option>
				</select>
				<input
					v-model="filterKeyword"
					type="text"
					placeholder="員工編號或姓名"
					class="form-input w-44 2xl:w-56"
					@keydown.enter="handleFilterChange"
				/>
				<button
					type="button"
					class="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 2xl:px-5 2xl:py-2.5"
					@click="handleFilterChange"
				>
					查詢
				</button>
			</div>
			<div class="min-h-[400px]">
				<Transition name="fade" mode="out-in">
					<div v-if="persons.length > 0" :key="`persons-${offset}-${persons.length}`">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">員工編號</th>
									<th :class="tableHeaderClass">姓名</th>
									<th :class="tableHeaderClass">所屬群組</th>
									<th :class="tableHeaderClass">狀態</th>
									<th v-if="canEdit" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="person in persons"
									:key="person.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ person.employee_no }}</td>
									<td :class="tableCellClass">{{ person.full_name || "—" }}</td>
									<td :class="tableCellClass">{{ person.group_name || "—" }}</td>
									<td :class="tableCellClass">
										<span
											:class="[
												getPersonStatusBadgeClass(person.status),
												'rounded px-2 py-1 2xl:px-3 2xl:py-1.5'
											]"
										>
											{{ personStatusLabels[person.status] }}
										</span>
									</td>
									<td v-if="canEdit" :class="tableCellClass">
										<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="handleOpenPersonDialog(person)"
											>
												編輯
											</button>
											<button
												type="button"
												class="rounded bg-amber-500/80 px-3 py-1 text-white hover:bg-amber-400 2xl:px-4 2xl:py-2"
												@click="handleOpenAccessDialog(person)"
											>
												門禁權限
											</button>
											<button
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
												@click="handleConfirmDeletePerson(person)"
											>
												刪除
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
						<Pagination
							v-if="personsTotal > personsLimit"
							:total="personsTotal"
							:offset="offset"
							:limit="personsLimit"
							:disabled="personsLoading"
							@previous="handlePreviousPage"
							@next="handleNextPage"
						/>
					</div>
					<div v-else key="persons-empty" class="py-8 text-center text-white/60">
						{{ personsLoading ? "載入中..." : "尚無人員資料" }}
					</div>
				</Transition>
			</div>
		</section>

		<!-- 區塊四：設備同步 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<h2 class="mb-4 text-xl font-semibold text-white 2xl:mb-6 2xl:text-2xl">設備同步</h2>
			<p class="mb-4 text-sm text-white/70 2xl:text-base">
				可同步地點為已設定門禁入口設備之地點，同步後將依人員門禁權限寫入設備。
			</p>
			<div class="mb-4 flex items-center gap-3">
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 2xl:px-5 2xl:py-2.5"
					:disabled="syncAllLoading"
					@click="handleSyncAll"
				>
					{{ syncAllLoading ? "同步中..." : "同步全部" }}
				</button>
			</div>
			<div class="min-h-[120px]">
				<div v-if="syncableLocations.length > 0" class="space-y-2">
					<div
						v-for="loc in syncableLocations"
						:key="loc.id"
						class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 2xl:py-3"
					>
						<span class="text-white/90">{{ loc.name }}</span>
						<span class="text-sm text-white/60">{{ loc.zone_name }}</span>
						<button
							v-if="canEdit"
							type="button"
							class="rounded bg-blue-500/80 px-3 py-1 text-sm text-white hover:bg-blue-400 disabled:opacity-50"
							:disabled="syncingLocationId === loc.id"
							@click="handleSyncLocation(loc.id)"
						>
							{{ syncingLocationId === loc.id ? "同步中..." : "同步" }}
						</button>
					</div>
				</div>
				<div v-else class="py-6 text-center text-white/60">
					{{ syncableLoading ? "載入中..." : "尚無可同步地點" }}
				</div>
			</div>
		</section>

		<!-- 群組新增/編輯彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showGroupDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closeGroupDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:max-w-lg 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								{{ editingGroup ? "編輯群組" : "新增群組" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closeGroupDialog"
							>
								&times;
							</button>
						</header>
						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmitGroup">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>名稱</span>
								<input v-model="groupForm.name" type="text" required class="form-input" />
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>說明</span>
								<input v-model="groupForm.description" type="text" class="form-input" />
							</label>
							<p v-if="errorMessage" class="text-sm text-rose-300 2xl:text-base">{{ errorMessage }}</p>
							<footer class="mt-2 flex items-center gap-3 2xl:mt-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closeGroupDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSubmitting">
									{{ isSubmitting ? "處理中..." : editingGroup ? "更新" : "建立" }}
								</button>
							</footer>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 人員新增/編輯彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showPersonDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closePersonDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:max-w-lg 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								{{ editingPerson ? "編輯人員" : "新增人員" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closePersonDialog"
							>
								&times;
							</button>
						</header>
						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmitPerson">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>員工編號</span>
								<input
									v-model="personForm.employee_no"
									type="text"
									required
									class="form-input"
									:readonly="!!editingPerson"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>姓名</span>
								<input v-model="personForm.full_name" type="text" class="form-input" />
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>所屬群組</span>
								<select v-model="personForm.person_group_id" class="form-input form-select">
									<option :value="undefined">— 未指定 —</option>
									<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
								</select>
							</label>
							<label
								v-if="editingPerson"
								class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
							>
								<span>狀態</span>
								<select v-model="personForm.status" class="form-input form-select">
									<option value="active">啟用</option>
									<option value="inactive">停用</option>
									<option value="deleted">已刪除</option>
								</select>
							</label>
							<p v-if="errorMessage" class="text-sm text-rose-300 2xl:text-base">{{ errorMessage }}</p>
							<footer class="mt-2 flex items-center gap-3 2xl:mt-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closePersonDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSubmitting">
									{{ isSubmitting ? "處理中..." : editingPerson ? "更新" : "建立" }}
								</button>
							</footer>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 門禁權限彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showAccessDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closeAccessDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:max-w-xl 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								設定門禁權限 — {{ accessPerson?.full_name || accessPerson?.employee_no }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closeAccessDialog"
							>
								&times;
							</button>
						</header>
						<p class="text-sm text-white/70">勾選該人員可進出的地點</p>
						<div class="max-h-80 space-y-2 overflow-y-auto">
							<label
								v-for="loc in syncableLocations"
								:key="loc.id"
								class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
							>
								<input
									v-model="accessSelectedLocationIds"
									type="checkbox"
									:value="loc.id"
									class="h-4 w-4 rounded border-white/30"
								/>
								<span class="text-white/90">{{ loc.name }}</span>
								<span class="text-sm text-white/50">{{ loc.zone_name }}</span>
							</label>
						</div>
						<p v-if="accessError" class="text-sm text-rose-300">{{ accessError }}</p>
						<footer class="mt-2 flex items-center gap-3 2xl:mt-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="closeAccessDialog">取消</button>
							<div class="flex-1"></div>
							<button
								type="button"
								class="btn-primary"
								:disabled="accessSaving"
								@click="handleSaveAccess"
							>
								{{ accessSaving ? "儲存中..." : "儲存" }}
							</button>
						</footer>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import type { PersonGroup, Person } from "~/types/personnel";
import Pagination from "~/components/common/Pagination.vue";
import { useDataLoader } from "~/composables/monitoring/useDataLoader";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelApi } from "~/composables/systems/usePersonnelApi";

definePageMeta({
	layout: "default"
});

const personnelApi = usePersonnelApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const { isOperator } = useAuth();
const canEdit = computed(() => isOperator);

// 人員群組
const groups = ref<PersonGroup[]>([]);
const groupsLoading = ref(false);
const showGroupDialog = ref(false);
const editingGroup = ref<PersonGroup | null>(null);
const groupForm = reactive({ name: "", description: "" });

// 人員列表
const filterPersonGroupId = ref<number | "">("");
const filterStatus = ref<string>("");
const filterKeyword = ref("");
const personsLimit = 20;
const {
	data: persons,
	total: personsTotal,
	offset,
	isLoading: personsLoading,
	load: loadPersons,
	nextPage,
	prevPage,
	resetPage
} = useDataLoader<
	Person,
	{
		personGroupId?: number;
		status?: string;
		employeeNo?: string;
		fullName?: string;
		limit?: number;
		offset?: number;
	}
>({
	fetcher: async params => {
		const result = await personnelApi.getPersons({
			personGroupId: params.personGroupId,
			status: params.status || undefined,
			employeeNo: params.employeeNo,
			fullName: params.fullName,
			limit: params.limit ?? personsLimit,
			offset: params.offset ?? 0
		});
		return { items: result.persons, total: result.total };
	},
	debounce: 300,
	pageSize: personsLimit,
	minLoadingDelay: 300,
	onError: err => {
		handleApiError(err, "載入人員列表失敗");
	}
});

// 可同步地點與同步狀態
const syncableLocations = ref<Awaited<ReturnType<typeof personnelApi.getSyncableLocations>>>([]);
const syncableLoading = ref(false);
const syncAllLoading = ref(false);
const syncingLocationId = ref<number | null>(null);

// 人員表單與彈窗
const showPersonDialog = ref(false);
const editingPerson = ref<Person | null>(null);
const personForm = reactive({
	employee_no: "",
	full_name: "",
	person_group_id: undefined as number | undefined,
	status: "active" as "active" | "inactive" | "deleted"
});

// 門禁權限彈窗
const showAccessDialog = ref(false);
const accessPerson = ref<Person | null>(null);
const accessSelectedLocationIds = ref<number[]>([]);
const accessSaving = ref(false);
const accessError = ref<string | null>(null);

const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";

const personStatusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	deleted: "已刪除"
};

const getPersonStatusBadgeClass = (status: string) => {
	const classes: Record<string, string> = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		deleted: "bg-red-500/20 text-red-200"
	};
	return classes[status] || classes.inactive;
};

const handleError = (error: unknown, defaultMessage: string) => {
	const msg = handleApiError(error, defaultMessage);
	errorMessage.value = msg || defaultMessage;
	return msg;
};

// ---------- 群組 ----------
const loadGroups = async () => {
	groupsLoading.value = true;
	try {
		const result = await personnelApi.getPersonGroups();
		groups.value = result.groups || [];
	} catch (e) {
		handleApiError(e, "載入群組失敗");
	} finally {
		groupsLoading.value = false;
	}
};

const handleOpenGroupDialog = (group?: PersonGroup) => {
	editingGroup.value = group ?? null;
	groupForm.name = group?.name ?? "";
	groupForm.description = group?.description ?? "";
	errorMessage.value = null;
	showGroupDialog.value = true;
};

const closeGroupDialog = () => {
	showGroupDialog.value = false;
	editingGroup.value = null;
	groupForm.name = "";
	groupForm.description = "";
	errorMessage.value = null;
};

const handleSubmitGroup = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingGroup.value) {
			const result = await personnelApi.updatePersonGroup(editingGroup.value.id, {
				name: groupForm.name,
				description: groupForm.description || undefined
			});
			const idx = groups.value.findIndex(g => g.id === editingGroup.value!.id);
			if (idx > -1) groups.value[idx] = result.group;
			toast.success(result.message || "更新成功");
		} else {
			const result = await personnelApi.createPersonGroup({
				name: groupForm.name,
				description: groupForm.description || undefined
			});
			groups.value.push(result.group);
			toast.success(result.message || "建立成功");
		}
		closeGroupDialog();
	} catch (e) {
		handleError(e, "儲存群組失敗");
	} finally {
		isSubmitting.value = false;
	}
};

const handleConfirmDeleteGroup = async (group: PersonGroup) => {
	if (!confirm(`確定要刪除群組「${group.name}」嗎？若有人員引用則無法刪除。`)) return;
	try {
		await personnelApi.deletePersonGroup(group.id);
		groups.value = groups.value.filter(g => g.id !== group.id);
		toast.success("刪除成功");
	} catch (e) {
		handleApiError(e, "刪除群組失敗");
	}
};

// ---------- 人員 ----------
const getPersonLoadParams = () => ({
	personGroupId:
		filterPersonGroupId.value === "" ? undefined : (filterPersonGroupId.value as number),
	status: filterStatus.value || undefined,
	employeeNo: filterKeyword.value.trim() || undefined,
	fullName: filterKeyword.value.trim() || undefined
});

const handleFilterChange = () => {
	resetPage();
	loadPersons(getPersonLoadParams(), true);
};

const handlePreviousPage = () => {
	prevPage(getPersonLoadParams());
};

const handleNextPage = () => {
	nextPage(getPersonLoadParams());
};

const handleOpenPersonDialog = (person?: Person) => {
	editingPerson.value = person ?? null;
	personForm.employee_no = person?.employee_no ?? "";
	personForm.full_name = person?.full_name ?? "";
	personForm.person_group_id = person?.person_group_id ?? undefined;
	personForm.status = (person?.status as "active" | "inactive" | "deleted") || "active";
	errorMessage.value = null;
	showPersonDialog.value = true;
};

const closePersonDialog = () => {
	showPersonDialog.value = false;
	editingPerson.value = null;
	personForm.employee_no = "";
	personForm.full_name = "";
	personForm.person_group_id = undefined;
	personForm.status = "active";
	errorMessage.value = null;
};

const handleSubmitPerson = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingPerson.value) {
			const result = await personnelApi.updatePerson(editingPerson.value.id, {
				employee_no: personForm.employee_no,
				full_name: personForm.full_name || undefined,
				person_group_id: personForm.person_group_id,
				status: personForm.status
			});
			const idx = persons.value.findIndex(p => p.id === editingPerson.value!.id);
			if (idx > -1) persons.value[idx] = result.person;
			toast.success(result.message || "更新成功");
		} else {
			const result = await personnelApi.createPerson({
				employee_no: personForm.employee_no,
				full_name: personForm.full_name || undefined,
				person_group_id: personForm.person_group_id,
				status: personForm.status as "active" | "inactive"
			});
			persons.value.push(result.person);
			personsTotal.value += 1;
			toast.success(result.message || "建立成功");
		}
		closePersonDialog();
	} catch (e) {
		handleError(e, "儲存人員失敗");
	} finally {
		isSubmitting.value = false;
	}
};

const handleConfirmDeletePerson = async (person: Person) => {
	if (!confirm(`確定要刪除人員「${person.full_name || person.employee_no}」嗎？`)) return;
	try {
		await personnelApi.deletePerson(person.id);
		persons.value = persons.value.filter(p => p.id !== person.id);
		personsTotal.value = Math.max(0, personsTotal.value - 1);
		toast.success("刪除成功");
	} catch (e) {
		handleApiError(e, "刪除人員失敗");
	}
};

// ---------- 門禁權限 ----------
const handleOpenAccessDialog = async (person: Person) => {
	accessPerson.value = person;
	accessError.value = null;
	accessSelectedLocationIds.value = [];
	try {
		const res = await personnelApi.getAccessLocations(person.id);
		accessSelectedLocationIds.value = res.locations.map(l => l.location_id);
	} catch (e) {
		accessError.value = "無法載入門禁權限";
		handleApiError(e, "載入門禁權限失敗");
	}
	showAccessDialog.value = true;
};

const closeAccessDialog = () => {
	showAccessDialog.value = false;
	accessPerson.value = null;
	accessSelectedLocationIds.value = [];
	accessError.value = null;
};

const handleSaveAccess = async () => {
	if (!accessPerson.value) return;
	accessSaving.value = true;
	accessError.value = null;
	try {
		await personnelApi.setAccessLocations(accessPerson.value.id, accessSelectedLocationIds.value);
		toast.success("門禁權限已更新");
		closeAccessDialog();
	} catch (e) {
		accessError.value = (e as Error)?.message || "儲存失敗";
		handleApiError(e, "更新門禁權限失敗");
	} finally {
		accessSaving.value = false;
	}
};

// ---------- 設備同步 ----------
const loadSyncableLocations = async () => {
	syncableLoading.value = true;
	try {
		syncableLocations.value = await personnelApi.getSyncableLocations();
	} catch (e) {
		handleApiError(e, "載入可同步地點失敗");
	} finally {
		syncableLoading.value = false;
	}
};

const handleSyncLocation = async (locationId: number) => {
	syncingLocationId.value = locationId;
	try {
		const result = await personnelApi.syncLocation(locationId);
		toast.success(result.message || "同步完成");
	} catch (e) {
		handleApiError(e, "同步失敗");
	} finally {
		syncingLocationId.value = null;
	}
};

const handleSyncAll = async () => {
	syncAllLoading.value = true;
	try {
		const result = await personnelApi.syncAllLocations();
		toast.success(result.message || "全部同步完成");
	} catch (e) {
		handleApiError(e, "同步全部失敗");
	} finally {
		syncAllLoading.value = false;
	}
};

onMounted(() => {
	loadGroups();
	loadSyncableLocations();
	loadPersons(getPersonLoadParams(), true);
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
