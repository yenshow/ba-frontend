<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<header class="flex flex-col gap-1 2xl:gap-2 me-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理人員群組、人員主檔與門禁權限</p>
			</header>

			<!-- Tab 切換（參考 alert-log.vue 的分段按鈕樣式） -->
			<div class="rounded-xl border border-white/20 bg-white/5 p-1 space-x-2 me-auto">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					@click="activeTab = tab.id"
					:class="[
						'rounded-lg px-3 py-1.5 text-base transition-colors 2xl:text-lg',
						activeTab === tab.id ? 'bg-cyan-500 text-white' : 'text-white/80 hover:bg-white/10',
					]"
					:aria-label="tab.label"
				>
					{{ tab.label }}
				</button>
			</div>
		</div>

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
									<td :class="tableCellClass">{{ g.description || "-" }}</td>
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
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">人員列表</h2>
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex items-center gap-2">
						<input
							v-model="personFilter.q"
							type="text"
							class="form-input w-[220px] border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:w-[260px] 2xl:py-2 2xl:text-base"
							placeholder="搜尋工號 / 姓名"
							aria-label="搜尋工號或姓名"
							@keydown.enter="handleSearch"
						/>
						<button
							type="button"
							class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
							@click="handleSearch"
						>
							搜尋
						</button>
					</div>
					<button
						v-if="canEdit"
						type="button"
						class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="showImportDialog = true"
					>
						批次匯入
					</button>
					<button
						v-if="canEdit"
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
							<th :class="tableHeaderClass">門禁權限</th>
							<th :class="tableHeaderClass">
								<div class="mx-auto max-w-[200px]">
									<FilterDropdown
										v-model="selectedGroupId"
										:options="groupFilterOptions"
										placeholder="全部群組"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
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
								<td :class="tableCellClass">
									<div class="mx-auto flex max-w-[280px] flex-wrap justify-center gap-1">
										<span
											v-for="(label, i) in getPersonAccessLocationLabels(p)"
											:key="`${p.id}-${i}`"
											class="rounded bg-white/10 px-2 py-1 text-sm text-white/85 2xl:text-base"
										>
											{{ label }}
										</span>
										<span
											v-if="getPersonAccessLocationOverflowCount(p) > 0"
											class="rounded bg-white/5 px-2 py-1 text-sm text-white/60 2xl:text-base"
										>
											+{{ getPersonAccessLocationOverflowCount(p) }}
										</span>
										<span
											v-if="getPersonAccessLocationLabels(p).length === 0"
											class="text-sm text-white/50 2xl:text-base"
										>
											—
										</span>
									</div>
								</td>
								<td :class="tableCellClass">{{ p.group_name || "—" }}</td>
								<td :class="tableCellClass">
									<span
										:class="[
											getPersonStatusBadgeClass(p.status),
											'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
										]"
									>
										{{ personStatusLabels[p.status] }}
									</span>
								</td>
								<td v-if="canEdit" :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
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
							<td :colspan="canEdit ? 7 : 6" class="py-12 text-center text-base 2xl:text-lg">
								{{ isLoadingPersons ? "載入中..." : "尚無人員或無符合群組篩選結果" }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<Pagination
				:total="personsTotal"
				:offset="personsOffset"
				:limit="PAGE_SIZE"
				:disabled="isLoadingPersons"
				:show="personsTotal > PAGE_SIZE"
				@previous="goPrevPage"
				@next="goNextPage"
			/>
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
			:locations="syncableLocations"
			v-model:selected-location-ids="personAccessLocationIds"
			:face-preview-url="personFormFacePreview"
			:has-face-preview="hasFacePreview"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			@submit="submitPerson"
			@face-file-change="handleFaceFileChange"
			@clear-face="clearFaceUrl"
		/>

		<!-- 批次匯入 彈窗 -->
		<PersonnelImportDialog
			v-model="showImportDialog"
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
	SyncWarning,
} from "~/types/personnel"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePersonnelApi, type PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import PersonnelGroupDialog from "~/components/personnel/PersonnelGroupDialog.vue"
import PersonnelPersonDialog from "~/components/personnel/PersonnelPersonDialog.vue"
import PersonnelImportDialog from "~/components/personnel/PersonnelImportDialog.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import Pagination from "~/components/common/Pagination.vue"

definePageMeta({
	layout: "default",
})

const personnelApi: PersonnelApi = usePersonnelApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const { isAdmin, isOperator } = useAuth()
const canEdit = computed(() => isAdmin || isOperator)

const activeTab = ref<"groups" | "persons" | "sync">("groups")
const tabs: { id: "groups" | "persons" | "sync"; label: string }[] = [
	{ id: "groups", label: "人員群組" },
	{ id: "persons", label: "人員列表" },
	{ id: "sync", label: "設備同步" },
]
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const personStatusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	deleted: "已刪除",
}

const getPersonStatusBadgeClass = (status: string) => {
	const classes: Record<string, string> = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		deleted: "bg-gray-500/20 text-gray-200",
	}
	return classes[status] || classes.inactive
}

// ---------- 群組 ----------
const groups = ref<PersonGroup[]>([])
const showGroupDialog = ref(false)
const editingGroup = ref<PersonGroup | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const groupForm = reactive({ name: "", description: "" })

const loadGroups = async () => {
	try {
		groups.value = await personnelApi.getPersonGroups()
	} catch (err) {
		handleApiError(err, "載入群組失敗")
		groups.value = []
	}
}

const openGroupCreate = () => {
	editingGroup.value = null
	groupForm.name = ""
	groupForm.description = ""
	errorMessage.value = null
	showGroupDialog.value = true
}

const editGroup = (g: PersonGroup) => {
	editingGroup.value = g
	groupForm.name = g.name
	groupForm.description = g.description ?? ""
	errorMessage.value = null
	showGroupDialog.value = true
}

const submitGroup = async () => {
	isSubmitting.value = true
	errorMessage.value = null
	try {
		if (editingGroup.value) {
			const updated = await personnelApi.updatePersonGroup(editingGroup.value.id, {
				name: groupForm.name,
				description: groupForm.description || null,
			})
			const idx = groups.value.findIndex((x) => x.id === editingGroup.value!.id)
			if (idx > -1) groups.value[idx] = updated
			toast.success("已更新群組")
		} else {
			const created = await personnelApi.createPersonGroup({
				name: groupForm.name,
				description: groupForm.description || null,
			})
			groups.value.push(created)
			toast.success("已新增群組")
		}
		showGroupDialog.value = false
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗"
	} finally {
		isSubmitting.value = false
	}
}

const confirmDeleteGroup = async (g: PersonGroup) => {
	if (!confirm(`確定要刪除群組「${g.name}」嗎？若群組下有人員則無法刪除。`)) return
	try {
		await personnelApi.deletePersonGroup(g.id)
		groups.value = groups.value.filter((x) => x.id !== g.id)
		toast.success("已刪除群組")
	} catch (err) {
		handleApiError(err, "刪除群組失敗")
	}
}

// ---------- 人員 ----------
const persons = ref<Person[]>([])
const isLoadingPersons = ref(false)
const personFilter = reactive<{
	groupId: number | null
	q: string
}>({ groupId: null, q: "" })
const PAGE_SIZE = 10
const personsTotal = ref(0)
const personsOffset = ref(0)

const groupFilterOptions = computed(() => {
	return [
		{ value: "", label: "全部群組" },
		...groups.value.map((g) => ({ value: String(g.id), label: g.name })),
	]
})
const selectedGroupId = computed<string>({
	get: () => (personFilter.groupId == null ? "" : String(personFilter.groupId)),
	set: (v) => {
		personFilter.groupId = v ? Number(v) : null
		handleFilterChange()
	},
})
const showPersonDialog = ref(false)
const editingPerson = ref<Person | null>(null)
const personForm = reactive<{
	employeeNo: string
	fullName: string
	personGroupId: number | null
	status: "active" | "inactive"
	faceUrl: string
}>({ employeeNo: "", fullName: "", personGroupId: null, status: "active", faceUrl: "" })

const personAccessLocationIds = ref<number[]>([])

const config = useRuntimeConfig()
const getFaceImageSrc = (url: string | null | undefined): string | null => {
	if (!url) return null
	if (url.startsWith("http")) return url
	const base = (config.public.apiBase as string) || ""
	const origin = base.replace(/\/api\/?$/, "")
	return `${origin}${url}`
}

const pendingFaceFile = ref<File | null>(null)
const facePreviewObjectUrl = ref<string | null>(null)

const personFormFacePreview = computed(() => {
	if (facePreviewObjectUrl.value) return facePreviewObjectUrl.value
	const u = personForm.faceUrl?.trim()
	if (!u) return null
	if (u.startsWith("data:")) return u
	return getFaceImageSrc(u)
})

const hasFacePreview = computed(() => !!personForm.faceUrl?.trim() || !!facePreviewObjectUrl.value)

const clearFaceUrl = () => {
	personForm.faceUrl = ""
	pendingFaceFile.value = null
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = null
	}
}
const handleFaceFileChange = async (file: File) => {
	if (!file) return
	if (editingPerson.value) {
		try {
			const res = await personnelApi.uploadFaceForPerson(editingPerson.value.id, file)
			if (res?.faceUrl) personForm.faceUrl = res.faceUrl
			if (res?.person) {
				const idx = persons.value.findIndex((x) => x.id === editingPerson.value!.id)
				if (idx > -1) persons.value[idx] = res.person
			}
			toast.success("已更新大頭照")
		} catch (err) {
			handleApiError(err, "上傳大頭照失敗")
		}
	} else {
		pendingFaceFile.value = file
		if (facePreviewObjectUrl.value) URL.revokeObjectURL(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = URL.createObjectURL(file)
	}
}

const loadPersons = async () => {
	isLoadingPersons.value = true
	try {
		const params = {
			personGroupId: personFilter.groupId ?? undefined,
			q: personFilter.q?.trim() || undefined,
			limit: PAGE_SIZE,
			offset: personsOffset.value,
		}
		const res = await personnelApi.getPersons(params)
		persons.value = res.items
		personsTotal.value = res.total
	} catch (err) {
		handleApiError(err, "載入人員失敗")
		persons.value = []
		personsTotal.value = 0
	} finally {
		isLoadingPersons.value = false
	}
}

const handleFilterChange = () => {
	personsOffset.value = 0
	loadPersons()
}

const handleSearch = () => {
	personsOffset.value = 0
	loadPersons()
}

const goPrevPage = () => {
	if (personsOffset.value === 0) return
	personsOffset.value = Math.max(0, personsOffset.value - PAGE_SIZE)
	loadPersons()
}

const goNextPage = () => {
	if (personsOffset.value + PAGE_SIZE >= personsTotal.value) return
	personsOffset.value = personsOffset.value + PAGE_SIZE
	loadPersons()
}

const openPersonCreate = () => {
	editingPerson.value = null
	personForm.employeeNo = ""
	personForm.fullName = ""
	personForm.personGroupId = null
	personForm.status = "active"
	personForm.faceUrl = ""
	personAccessLocationIds.value = []
	pendingFaceFile.value = null
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = null
	}
	errorMessage.value = null
	void ensureSyncableLocationsLoaded()
	showPersonDialog.value = true
}

const editPerson = (p: Person) => {
	editingPerson.value = p
	personForm.employeeNo = p.employee_no
	personForm.fullName = p.full_name ?? ""
	personForm.personGroupId = p.person_group_id ?? null
	personForm.status = p.status === "active" ? "active" : "inactive"
	personForm.faceUrl = p.face_url ?? ""
	pendingFaceFile.value = null
	personAccessLocationIds.value = []
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = null
	}
	errorMessage.value = null
	showPersonDialog.value = true
	void loadPersonAccessLocationsForEdit(p.id)
}

const ensureSyncableLocationsLoaded = async () => {
	if (syncableLocations.value.length > 0) return
	try {
		syncableLocations.value = await personnelApi.getSyncableLocations()
	} catch (err) {
		handleApiError(err, "載入可同步地點失敗")
		syncableLocations.value = []
	}
}

const loadPersonAccessLocationsForEdit = async (personId: number) => {
	try {
		await ensureSyncableLocationsLoaded()
		const res = await personnelApi.getAccessLocations(personId)
		personAccessLocationIds.value = res.locations.map((l) => l.location_id)
	} catch (err) {
		handleApiError(err, "載入門禁權限失敗")
		personAccessLocationIds.value = []
	}
}

const submitPerson = async () => {
	if (!personForm.fullName.trim()) {
		errorMessage.value = "姓名為必填"
		return
	}

	isSubmitting.value = true
	errorMessage.value = null
	try {
		if (editingPerson.value) {
			const updated = await personnelApi.updatePerson(editingPerson.value.id, {
				fullName: personForm.fullName || null,
				personGroupId: personForm.personGroupId,
				status: personForm.status,
				faceUrl: personForm.faceUrl.trim() || null,
			})
			const personId = editingPerson.value.id
			const accessRes = await personnelApi.setAccessLocations(
				personId,
				personAccessLocationIds.value
			)
			const idx = persons.value.findIndex((x) => x.id === editingPerson.value!.id)
			if (idx > -1) persons.value[idx] = { ...updated, access_locations: accessRes.locations }
			toast.success("已更新人員")
		} else {
			const created = await personnelApi.createPerson({
				employeeNo: personForm.employeeNo.trim(),
				fullName: personForm.fullName.trim(),
				personGroupId: personForm.personGroupId,
				status: personForm.status,
			})
			const accessRes = await personnelApi.setAccessLocations(
				created.id,
				personAccessLocationIds.value
			)
			if (pendingFaceFile.value) {
				const uploadRes = await personnelApi.uploadFaceForPerson(created.id, pendingFaceFile.value)
				persons.value.push({ ...uploadRes.person, access_locations: accessRes.locations })
				pendingFaceFile.value = null
				if (facePreviewObjectUrl.value) {
					URL.revokeObjectURL(facePreviewObjectUrl.value)
					facePreviewObjectUrl.value = null
				}
			} else {
				persons.value.push({ ...created, access_locations: accessRes.locations })
			}
			toast.success("已新增人員")
		}
		showPersonDialog.value = false
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗"
	} finally {
		isSubmitting.value = false
	}
}

const confirmDeletePerson = async (p: Person) => {
	if (!confirm(`確定要刪除人員「${p.employee_no} ${p.full_name || ""}」嗎？`)) return
	try {
		await personnelApi.deletePerson(p.id)
		persons.value = persons.value.filter((x) => x.id !== p.id)
		toast.success("已刪除人員")
	} catch (err) {
		handleApiError(err, "刪除人員失敗")
	}
}

// ---------- 人員列表：門禁權限欄位（最多顯示 3 個） ----------
const getPersonAccessLocationLabels = (p: Person): string[] => {
	const list = (p.access_locations || []).filter(Boolean) as Array<{
		zone_name?: string
		location_name?: string
	}>
	return list
		.map((x) => [x.zone_name, x.location_name].filter(Boolean).join(" - "))
		.filter(Boolean)
		.slice(0, 3)
}
const getPersonAccessLocationOverflowCount = (p: Person): number => {
	const total = Array.isArray(p.access_locations) ? p.access_locations.length : 0
	return Math.max(0, total - 3)
}

// ---------- 同步 ----------
const syncableLocations = ref<SyncableLocation[]>([])
const isLoadingSyncable = ref(false)
const isSyncingAll = ref(false)
const syncingLocationId = ref<number | null>(null)
const syncWarnings = ref<SyncWarning[]>([])
const SYNC_WARNING_LABELS: Record<string, string> = {
	face: "人臉更新失敗",
	add: "新增失敗",
	update: "更新失敗",
	delete: "刪除失敗",
	sync: "同步失敗",
}
const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type

const loadSyncableLocations = async () => {
	isLoadingSyncable.value = true
	try {
		syncableLocations.value = await personnelApi.getSyncableLocations()
	} catch (err) {
		handleApiError(err, "載入可同步地點失敗")
		syncableLocations.value = []
	} finally {
		isLoadingSyncable.value = false
	}
}

const syncOneLocation = async (locationId: number) => {
	syncingLocationId.value = locationId
	syncWarnings.value = []
	try {
		const result = await personnelApi.syncLocation(locationId)
		syncWarnings.value = result.warnings ?? []
		if (syncWarnings.value.length > 0) {
			toast.warning(`同步完成，但有 ${syncWarnings.value.length} 筆警告`)
		} else {
			toast.success("同步完成")
		}
	} catch (err) {
		handleApiError(err, "同步失敗")
	} finally {
		syncingLocationId.value = null
	}
}

const syncAllLocations = async () => {
	isSyncingAll.value = true
	syncWarnings.value = []
	try {
		const { jobId } = await personnelApi.syncAllLocations()
		const startedAt = Date.now()
		for (;;) {
			const job = await personnelApi.getSyncAllLocationsJob(jobId)
			if (job.status !== "completed") {
				// 最長等待 10 分鐘，避免無限輪詢
				if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試")
				await new Promise((r) => setTimeout(r, 1000))
				continue
			}

			if (job.error?.message) throw new Error(job.error.message)

			const result = job.result
			const allWarnings = (result?.results ?? []).flatMap((r) =>
				(r.warnings ?? []).map((w) => ({ ...w, locationName: r.locationName }))
			)
			syncWarnings.value = allWarnings
			const synced = result?.synced ?? 0
			if (allWarnings.length > 0) {
				toast.warning(`已同步 ${synced} 個地點，但有 ${allWarnings.length} 筆警告`)
			} else {
				toast.success(`已同步 ${synced} 個地點`)
			}
			break
		}
	} catch (err) {
		handleApiError(err, "同步全部失敗")
	} finally {
		isSyncingAll.value = false
	}
}

// ---------- 批次匯入 ----------
const showImportDialog = ref(false)
const importError = ref("")
const importResult = ref<ImportResult | null>(null)
const isImporting = ref(false)

const submitImport = async (payload: { excel: File; imagesZip: File | null }) => {
	importError.value = ""
	importResult.value = null
	isImporting.value = true
	try {
		const form = new FormData()
		form.append("excel", payload.excel)
		if (payload.imagesZip) form.append("imagesZip", payload.imagesZip)
		const result = await personnelApi.importPersons(form)
		importResult.value = result
		if (result.created > 0) {
			toast.success(`已匯入 ${result.created} 筆`)
			loadPersons()
		}
		if (result.errors?.length) toast.error(`部分失敗：${result.errors.length} 筆`)
	} catch (err) {
		importError.value = handleApiError(err, "匯入失敗") || "匯入失敗"
	} finally {
		isImporting.value = false
	}
}

// ---------- 生命週期與 watch ----------
watch(
	activeTab,
	(tab) => {
		if (tab === "groups") loadGroups()
		else if (tab === "persons") {
			loadGroups()
			loadPersons()
		} else if (tab === "sync") {
			loadSyncableLocations()
		}
	},
	{ immediate: true }
)

watch(showGroupDialog, (v) => {
	if (!v) {
		editingGroup.value = null
		errorMessage.value = null
	}
})

watch(showPersonDialog, (v) => {
	if (!v) {
		if (facePreviewObjectUrl.value) {
			URL.revokeObjectURL(facePreviewObjectUrl.value)
			facePreviewObjectUrl.value = null
		}
		editingPerson.value = null
		errorMessage.value = null
		personAccessLocationIds.value = []
	}
})

watch(showImportDialog, (v) => {
	if (!v) return
	importError.value = ""
	importResult.value = null
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
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
