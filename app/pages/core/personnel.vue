<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理人員群組、人員主檔與門禁權限</p>
			</div>
		</header>

		<!-- Tab 切換 -->
		<nav class="flex gap-2 border-b border-white/20">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				type="button"
				:class="[
					'rounded-t-xl px-4 py-2 text-sm font-medium transition-colors 2xl:px-6 2xl:py-3 2xl:text-base',
					activeTab === tab.id
						? 'bg-white/20 text-white'
						: 'text-white/70 hover:bg-white/10 hover:text-white'
				]"
				:aria-label="tab.label"
				@click="activeTab = tab.id"
			>
				{{ tab.label }}
			</button>
		</nav>

		<!-- Tab: 人員群組 -->
		<section
			v-show="activeTab === 'groups'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">群組列表</h2>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="openGroupCreate"
				>
					新增群組
				</button>
			</div>
			<div class="min-h-[300px]">
				<Transition name="fade" mode="out-in">
					<div v-if="groups.length > 0" key="groups">
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
									v-for="g in groups"
									:key="g.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ g.name }}</td>
									<td :class="tableCellClass">{{ g.description || "—" }}</td>
									<td v-if="canEdit" :class="tableCellClass">
										<div class="flex justify-center gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="editGroup(g)"
											>
												編輯
											</button>
											<button
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
												@click="confirmDeleteGroup(g)"
											>
												刪除
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else key="empty-groups" class="py-12 text-center text-white/60">
						<p class="text-base 2xl:text-lg">尚無群組，請點擊「新增群組」</p>
					</div>
				</Transition>
			</div>
		</section>

		<!-- Tab: 人員列表 -->
		<section
			v-show="activeTab === 'persons'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">人員列表</h2>
				<div v-if="canEdit" class="flex gap-2">
					<button
						type="button"
						class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="showImportDialog = true"
					>
						批次匯入
					</button>
					<button
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="openPersonCreate"
					>
						新增人員
					</button>
				</div>
			</div>
			<div class="min-h-[300px]">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">頭像</th>
							<th :class="tableHeaderClass">工號</th>
							<th :class="tableHeaderClass">姓名</th>
							<th :class="tableHeaderClass">
								<select
									v-model="personFilter.groupId"
									class="form-input form-select inline-block max-w-[140px] border-white/30 bg-white/10 py-1.5 text-sm text-white 2xl:max-w-[160px] 2xl:py-2 2xl:text-base"
									aria-label="依群組篩選"
									@change="loadPersons"
								>
									<option :value="null">全部群組</option>
									<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
								</select>
							</th>
							<th :class="tableHeaderClass">狀態</th>
							<th v-if="canEdit" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<template v-if="persons.length > 0">
							<tr
								v-for="p in persons"
								:key="p.id"
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">
									<div class="flex justify-center">
										<img
											v-if="getFaceImageSrc(p.face_url)"
											:src="getFaceImageSrc(p.face_url)!"
											:alt="p.full_name || p.employee_no"
											class="h-10 w-10 rounded-full object-cover 2xl:h-12 2xl:w-12"
										/>
										<div
											v-else
											class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg text-white/60 2xl:h-12 2xl:w-12"
											aria-hidden="true"
										>
											{{ (p.full_name || p.employee_no).charAt(0) || "?" }}
										</div>
									</div>
								</td>
								<td :class="tableCellClass">{{ p.employee_no }}</td>
								<td :class="tableCellClass">{{ p.full_name || "—" }}</td>
								<td :class="tableCellClass">{{ p.group_name || "—" }}</td>
								<td :class="tableCellClass">
									<span
										:class="[getPersonStatusBadgeClass(p.status), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']"
									>
										{{ personStatusLabels[p.status] }}
									</span>
								</td>
								<td v-if="canEdit" :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
										<button
											type="button"
											class="rounded bg-cyan-500/80 px-3 py-1 text-white hover:bg-cyan-400 2xl:px-4 2xl:py-2"
											@click="openAccessLocations(p)"
										>
											門禁權限
										</button>
										<button
											type="button"
											class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
											@click="editPerson(p)"
										>
											編輯
										</button>
										<button
											type="button"
											class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
											@click="confirmDeletePerson(p)"
										>
											刪除
										</button>
									</div>
								</td>
							</tr>
						</template>
						<tr v-else class="text-white/60">
							<td :colspan="canEdit ? 6 : 5" class="py-12 text-center text-base 2xl:text-lg">
								{{ isLoadingPersons ? "載入中..." : "尚無人員或無符合群組篩選結果" }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Tab: 設備同步 -->
		<section
			v-show="activeTab === 'sync'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">可同步地點</h2>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					:disabled="isSyncingAll || syncableLocations.length === 0"
					@click="syncAllLocations"
				>
					{{ isSyncingAll ? "同步中..." : "同步全部" }}
				</button>
			</div>
			<p class="mb-4 text-sm text-white/70 2xl:text-base">
				可同步地點為人流統計中已設定門禁入口設備的地點；同步會將有權限的人員寫入該地點的門禁設備。門禁事件由後端自動向設備訂閱，不需在設備設定監聽主機。
			</p>
			<div class="min-h-[200px]">
				<Transition name="fade" mode="out-in">
					<div v-if="syncableLocations.length > 0" key="sync-list">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">區域</th>
									<th :class="tableHeaderClass">地點名稱</th>
									<th v-if="canEdit" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="loc in syncableLocations"
									:key="loc.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ loc.zone_name }}</td>
									<td :class="tableCellClass">{{ loc.name }}</td>
									<td v-if="canEdit" :class="tableCellClass">
										<button
											type="button"
											class="rounded bg-cyan-500/80 px-3 py-1 text-white hover:bg-cyan-400 disabled:opacity-50 2xl:px-4 2xl:py-2"
											:disabled="syncingLocationId === loc.id"
											@click="syncOneLocation(loc.id)"
										>
											{{ syncingLocationId === loc.id ? "同步中..." : "同步" }}
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else key="empty-sync" class="py-12 text-center text-white/60">
						<p class="text-base 2xl:text-lg">
							{{
								isLoadingSyncable
									? "載入中..."
									: "尚無可同步地點，請先在人流統計中建立區域與地點並配對門禁設備"
							}}
						</p>
					</div>
				</Transition>
			</div>
			<div
				v-if="syncWarnings.length > 0"
				class="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm text-amber-200 2xl:text-base"
				role="alert"
			>
				<p class="mb-2 font-medium">同步警告（{{ syncWarnings.length }} 筆）</p>
				<ul class="list-inside list-disc space-y-1">
					<li v-for="(w, i) in syncWarnings" :key="i" class="break-words">
						<span v-if="w.locationName" class="text-white/90">{{ w.locationName }}：</span>
						<span v-if="w.employeeNo" class="text-white/90">員工 {{ w.employeeNo }}</span>
						<span class="text-amber-200">{{ syncWarningTypeLabel(w.type) }}</span>
						<span class="text-white/70"> — {{ w.message }}</span>
					</li>
				</ul>
			</div>
		</section>

		<!-- 群組 新增/編輯 彈窗 -->
		<PersonnelGroupDialog
			v-model="showGroupDialog"
			:editing-group="editingGroup"
			:form="groupForm"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			@submit="submitGroup"
		/>

		<!-- 人員 新增/編輯 彈窗 -->
		<PersonnelPersonDialog
			v-model="showPersonDialog"
			:editing-person="editingPerson"
			:form="personForm"
			:groups="groups"
			:face-preview-url="personFormFacePreview"
			:has-face-preview="hasFacePreview"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			@submit="submitPerson"
			@face-file-change="handleFaceFileChange"
			@clear-face="clearFaceUrl"
		/>

		<!-- 門禁權限 彈窗 -->
		<PersonnelAccessDialog
			v-model="showAccessDialog"
			:person="accessPerson"
			:locations="syncableLocations"
			v-model:selected-location-ids="selectedLocationIds"
			:is-loading="isLoadingAccess"
			:is-saving="isSavingAccess"
			@save="saveAccessLocations"
		/>

		<!-- 批次匯入 彈窗 -->
		<PersonnelImportDialog
			v-model="showImportDialog"
			v-model:json-text="importJsonText"
			:error="importError"
			:result="importResult"
			:is-importing="isImporting"
			@submit="submitImport"
		/>
	</div>
</template>

<script setup lang="ts">
import type {
	PersonGroup,
	Person,
	SyncableLocation,
	ImportResult,
	SyncWarning
} from "~/types/personnel";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelApi } from "~/composables/systems/usePersonnelApi";
import PersonnelGroupDialog from "~/components/personnel/PersonnelGroupDialog.vue";
import PersonnelPersonDialog from "~/components/personnel/PersonnelPersonDialog.vue";
import PersonnelAccessDialog from "~/components/personnel/PersonnelAccessDialog.vue";
import PersonnelImportDialog from "~/components/personnel/PersonnelImportDialog.vue";

definePageMeta({
	layout: "auxiliary"
});

const personnelApi = usePersonnelApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const { isAdmin, isOperator } = useAuth();
const canEdit = computed(() => isAdmin || isOperator);

const activeTab = ref<"groups" | "persons" | "sync">("groups");
const tabs: { id: "groups" | "persons" | "sync"; label: string }[] = [
	{ id: "groups", label: "人員群組" },
	{ id: "persons", label: "人員列表" },
	{ id: "sync", label: "設備同步" }
];
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
		deleted: "bg-gray-500/20 text-gray-200"
	};
	return classes[status] || classes.inactive;
};

// ---------- 群組 ----------
const groups = ref<PersonGroup[]>([]);
const showGroupDialog = ref(false);
const editingGroup = ref<PersonGroup | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const groupForm = reactive({ name: "", description: "" });

const loadGroups = async () => {
	try {
		groups.value = await personnelApi.getPersonGroups();
	} catch (err) {
		handleApiError(err, "載入群組失敗");
		groups.value = [];
	}
};

const openGroupCreate = () => {
	editingGroup.value = null;
	groupForm.name = "";
	groupForm.description = "";
	errorMessage.value = null;
	showGroupDialog.value = true;
};

const editGroup = (g: PersonGroup) => {
	editingGroup.value = g;
	groupForm.name = g.name;
	groupForm.description = g.description ?? "";
	errorMessage.value = null;
	showGroupDialog.value = true;
};

const submitGroup = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingGroup.value) {
			const updated = await personnelApi.updatePersonGroup(editingGroup.value.id, {
				name: groupForm.name,
				description: groupForm.description || null
			});
			const idx = groups.value.findIndex(x => x.id === editingGroup.value!.id);
			if (idx > -1) groups.value[idx] = updated;
			toast.success("已更新群組");
		} else {
			const created = await personnelApi.createPersonGroup({
				name: groupForm.name,
				description: groupForm.description || null
			});
			groups.value.push(created);
			toast.success("已新增群組");
		}
		showGroupDialog.value = false;
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗";
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeleteGroup = async (g: PersonGroup) => {
	if (!confirm(`確定要刪除群組「${g.name}」嗎？若群組下有人員則無法刪除。`)) return;
	try {
		await personnelApi.deletePersonGroup(g.id);
		groups.value = groups.value.filter(x => x.id !== g.id);
		toast.success("已刪除群組");
	} catch (err) {
		handleApiError(err, "刪除群組失敗");
	}
};

// ---------- 人員 ----------
const persons = ref<Person[]>([]);
const isLoadingPersons = ref(false);
const personFilter = reactive<{
	groupId: number | null;
}>({ groupId: null });
const showPersonDialog = ref(false);
const editingPerson = ref<Person | null>(null);
const personForm = reactive<{
	employeeNo: string;
	fullName: string;
	personGroupId: number | null;
	status: "active" | "inactive";
	faceUrl: string;
}>({ employeeNo: "", fullName: "", personGroupId: null, status: "active", faceUrl: "" });

const config = useRuntimeConfig();
const getFaceImageSrc = (url: string | null | undefined): string | null => {
	if (!url) return null;
	if (url.startsWith("http")) return url;
	const base = (config.public.apiBase as string) || "";
	const origin = base.replace(/\/api\/?$/, "");
	return `${origin}${url}`;
};

const pendingFaceFile = ref<File | null>(null);
const facePreviewObjectUrl = ref<string | null>(null);

const personFormFacePreview = computed(() => {
	if (facePreviewObjectUrl.value) return facePreviewObjectUrl.value;
	const u = personForm.faceUrl?.trim();
	if (!u) return null;
	if (u.startsWith("data:")) return u;
	return getFaceImageSrc(u);
});

const hasFacePreview = computed(() => !!personForm.faceUrl?.trim() || !!facePreviewObjectUrl.value);

const clearFaceUrl = () => {
	personForm.faceUrl = "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
};
const handleFaceFileChange = async (file: File) => {
	if (!file) return;
	if (editingPerson.value) {
		try {
			const res = await personnelApi.uploadFaceForPerson(editingPerson.value.id, file);
			if (res?.faceUrl) personForm.faceUrl = res.faceUrl;
			if (res?.person) {
				const idx = persons.value.findIndex(x => x.id === editingPerson.value!.id);
				if (idx > -1) persons.value[idx] = res.person;
			}
			toast.success("已更新大頭照");
		} catch (err) {
			handleApiError(err, "上傳大頭照失敗");
		}
	} else {
		pendingFaceFile.value = file;
		if (facePreviewObjectUrl.value) URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = URL.createObjectURL(file);
	}
};

const loadPersons = async () => {
	isLoadingPersons.value = true;
	try {
		const params = personFilter.groupId != null ? { personGroupId: personFilter.groupId } : {};
		persons.value = await personnelApi.getPersons(params);
	} catch (err) {
		handleApiError(err, "載入人員失敗");
		persons.value = [];
	} finally {
		isLoadingPersons.value = false;
	}
};

const openPersonCreate = () => {
	editingPerson.value = null;
	personForm.employeeNo = "";
	personForm.fullName = "";
	personForm.personGroupId = null;
	personForm.status = "active";
	personForm.faceUrl = "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	errorMessage.value = null;
	showPersonDialog.value = true;
};

const editPerson = (p: Person) => {
	editingPerson.value = p;
	personForm.employeeNo = p.employee_no;
	personForm.fullName = p.full_name ?? "";
	personForm.personGroupId = p.person_group_id ?? null;
	personForm.status = p.status === "active" ? "active" : "inactive";
	personForm.faceUrl = p.face_url ?? "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	errorMessage.value = null;
	showPersonDialog.value = true;
};

const submitPerson = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingPerson.value) {
			const updated = await personnelApi.updatePerson(editingPerson.value.id, {
				fullName: personForm.fullName || null,
				personGroupId: personForm.personGroupId,
				status: personForm.status,
				faceUrl: personForm.faceUrl.trim() || null
			});
			const idx = persons.value.findIndex(x => x.id === editingPerson.value!.id);
			if (idx > -1) persons.value[idx] = updated;
			toast.success("已更新人員");
		} else {
			const created = await personnelApi.createPerson({
				employeeNo: personForm.employeeNo.trim(),
				fullName: personForm.fullName.trim() || null,
				personGroupId: personForm.personGroupId,
				status: personForm.status
			});
			if (pendingFaceFile.value) {
				const uploadRes = await personnelApi.uploadFaceForPerson(created.id, pendingFaceFile.value);
				persons.value.push(uploadRes.person);
				pendingFaceFile.value = null;
				if (facePreviewObjectUrl.value) {
					URL.revokeObjectURL(facePreviewObjectUrl.value);
					facePreviewObjectUrl.value = null;
				}
			} else {
				persons.value.push(created);
			}
			toast.success("已新增人員");
		}
		showPersonDialog.value = false;
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗";
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeletePerson = async (p: Person) => {
	if (!confirm(`確定要刪除人員「${p.employee_no} ${p.full_name || ""}」嗎？`)) return;
	try {
		await personnelApi.deletePerson(p.id);
		persons.value = persons.value.filter(x => x.id !== p.id);
		toast.success("已刪除人員");
	} catch (err) {
		handleApiError(err, "刪除人員失敗");
	}
};

// ---------- 門禁權限彈窗 ----------
const showAccessDialog = ref(false);
const accessPerson = ref<Person | null>(null);
const selectedLocationIds = ref<number[]>([]);
const isLoadingAccess = ref(false);
const isSavingAccess = ref(false);

const openAccessLocations = async (p: Person) => {
	accessPerson.value = p;
	selectedLocationIds.value = [];
	showAccessDialog.value = true;
	isLoadingAccess.value = true;
	try {
		const [res, syncList] = await Promise.all([
			personnelApi.getAccessLocations(p.id),
			syncableLocations.value.length > 0
				? Promise.resolve(syncableLocations.value)
				: personnelApi.getSyncableLocations()
		]);
		selectedLocationIds.value = res.locations.map(l => l.location_id);
		if (syncableLocations.value.length === 0) syncableLocations.value = syncList;
	} catch (err) {
		handleApiError(err, "載入門禁權限失敗");
	} finally {
		isLoadingAccess.value = false;
	}
};

const saveAccessLocations = async () => {
	if (!accessPerson.value) return;
	isSavingAccess.value = true;
	try {
		await personnelApi.setAccessLocations(accessPerson.value.id, selectedLocationIds.value);
		toast.success("已更新門禁權限");
		showAccessDialog.value = false;
	} catch (err) {
		handleApiError(err, "更新門禁權限失敗");
	} finally {
		isSavingAccess.value = false;
	}
};

// ---------- 同步 ----------
const syncableLocations = ref<SyncableLocation[]>([]);
const isLoadingSyncable = ref(false);
const isSyncingAll = ref(false);
const syncingLocationId = ref<number | null>(null);
const syncWarnings = ref<SyncWarning[]>([]);
const SYNC_WARNING_LABELS: Record<string, string> = {
	face: "人臉更新失敗",
	add: "新增失敗",
	update: "更新失敗",
	delete: "刪除失敗",
	sync: "同步失敗"
};
const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type;

const loadSyncableLocations = async () => {
	isLoadingSyncable.value = true;
	try {
		syncableLocations.value = await personnelApi.getSyncableLocations();
	} catch (err) {
		handleApiError(err, "載入可同步地點失敗");
		syncableLocations.value = [];
	} finally {
		isLoadingSyncable.value = false;
	}
};

const syncOneLocation = async (locationId: number) => {
	syncingLocationId.value = locationId;
	syncWarnings.value = [];
	try {
		const result = await personnelApi.syncLocation(locationId);
		syncWarnings.value = result.warnings ?? [];
		if (syncWarnings.value.length > 0) {
			toast.warning(`同步完成，但有 ${syncWarnings.value.length} 筆警告`);
		} else {
			toast.success("同步完成");
		}
	} catch (err) {
		handleApiError(err, "同步失敗");
	} finally {
		syncingLocationId.value = null;
	}
};

const syncAllLocations = async () => {
	isSyncingAll.value = true;
	syncWarnings.value = [];
	try {
		const result = await personnelApi.syncAllLocations();
		const allWarnings = (result.results ?? []).flatMap(r =>
			(r.warnings ?? []).map(w => ({ ...w, locationName: r.locationName }))
		);
		syncWarnings.value = allWarnings;
		if (allWarnings.length > 0) {
			toast.warning(`已同步 ${result.synced} 個地點，但有 ${allWarnings.length} 筆警告`);
		} else {
			toast.success(`已同步 ${result.synced} 個地點`);
		}
	} catch (err) {
		handleApiError(err, "同步全部失敗");
	} finally {
		isSyncingAll.value = false;
	}
};

// ---------- 批次匯入 ----------
const showImportDialog = ref(false);
const importJsonText = ref("");
const importError = ref("");
const importResult = ref<ImportResult | null>(null);
const isImporting = ref(false);

const submitImport = async () => {
	importError.value = "";
	importResult.value = null;
	let arr: unknown[];
	try {
		const parsed = JSON.parse(importJsonText.value);
		arr = Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		importError.value = "JSON 格式錯誤";
		return;
	}
	const personsPayload = (arr as Record<string, unknown>[]).map((row) => ({
		employeeNo: (row.employeeNo ?? row.employee_no ?? "") as string,
		fullName: (row.fullName ?? row.full_name) as string | undefined,
		personGroupId: (row.personGroupId ?? row.person_group_id) as number | undefined,
		locationIds: (row.locationIds ?? row.location_ids ?? []) as number[]
	}));
	isImporting.value = true;
	try {
		const result = await personnelApi.importPersons({ persons: personsPayload });
		importResult.value = result;
		if (result.created > 0) {
			toast.success(`已匯入 ${result.created} 筆`);
			loadPersons();
		}
		if (result.errors?.length) toast.error(`部分失敗：${result.errors.length} 筆`);
	} catch (err) {
		importError.value = handleApiError(err, "匯入失敗") || "匯入失敗";
	} finally {
		isImporting.value = false;
	}
};

// ---------- 生命週期與 watch ----------
watch(
	activeTab,
	tab => {
		if (tab === "groups") loadGroups();
		else if (tab === "persons") {
			loadGroups();
			loadPersons();
		} else if (tab === "sync") {
			loadSyncableLocations();
		}
	},
	{ immediate: true }
);

watch(showGroupDialog, v => {
	if (!v) {
		editingGroup.value = null;
		errorMessage.value = null;
	}
});

watch(showPersonDialog, v => {
	if (!v) {
		if (facePreviewObjectUrl.value) {
			URL.revokeObjectURL(facePreviewObjectUrl.value);
			facePreviewObjectUrl.value = null;
		}
		editingPerson.value = null;
		errorMessage.value = null;
	}
});

watch(showAccessDialog, v => {
	if (!v) accessPerson.value = null;
});
</script>

<style scoped>
.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition: border-color 0.2s ease, background 0.2s ease;
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
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
