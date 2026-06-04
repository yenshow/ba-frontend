<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-3">
						<div class="flex gap-2 text-xl 2xl:text-2xl">
							<h3 class="truncate font-semibold tracking-[4px] text-white">管理名單</h3>
							<p class="truncate text-white/60" :title="locationName">
								{{ locationName }}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<form
						class="flex flex-col gap-4 2xl:gap-6"
						@submit.prevent="handleApply"
						@keydown.enter.prevent
					>
						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="mb-2 flex flex-wrap items-center justify-between gap-3">
								<h4 class="text-sm text-white/80 2xl:text-base">名單成員</h4>
								<div class="text-xs text-white/60 2xl:text-sm">已選 {{ selectedCount }} 人</div>
							</div>
							<div class="mb-3 flex flex-wrap items-center gap-2">
								<button
									type="button"
									class="btn-secondary text-xs 2xl:text-sm me-auto"
									@click="handleToggleSelectAllMembersPage"
									:disabled="candidates.length === 0"
									:aria-label="isAllMembersPageKept ? '取消全選（目前列表）' : '全選（目前列表）'"
								>
									{{ isAllMembersPageKept ? "取消全選" : "全選" }}
								</button>
								<input
									v-model="candidatesQuery"
									type="text"
									class="form-input w-full md:max-w-[200px]"
									placeholder="搜尋 ID / 姓名"
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
							<div class="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto">
								<label
									v-for="p in candidates"
									:key="p.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											:checked="isMemberKept(p.id)"
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEdit || isApplying"
											:aria-label="`選取成員：${p.employee_no} ${p.full_name || ''}`"
											@change="toggleKeepMember(p.id, $event)"
										/>
										<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
											<span class="font-mono">{{ p.employee_no }}</span>
											<span class="ms-2">{{ p.full_name || "—" }}</span>
										</span>
									</span>
									<span
										class="rounded bg-white/5 px-2 py-1 text-xs text-white/70"
										:class="getStatusPillClass(p.status)"
									>
										{{ getStatusLabel(p.status) }}
									</span>
								</label>
								<div
									v-if="
										!isLoadingCandidates &&
										candidates.length === 0 &&
										candidatesQuery.trim().length > 0
									"
									class="py-6 text-center text-white/50"
								>
									無符合搜尋結果
								</div>
								<div
									v-else-if="!isLoadingCandidates && candidates.length === 0"
									class="py-6 text-center text-white/50"
								>
									尚無人員
								</div>
								<div v-if="candidatesErrorText" class="py-2 text-center text-rose-300" role="alert">
									{{ candidatesErrorText }}
								</div>
								<div v-if="isLoadingCandidates" class="py-6 text-center text-white/60">載入中…</div>
							</div>
						</div>

						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1">
								<p v-if="errorText" class="text-sm text-rose-300" role="alert">
									{{ errorText }}
								</p>
								<p v-else-if="successText" class="text-sm text-emerald-200" role="status">
									{{ successText }}
								</p>
							</div>
							<PermissionActionButton
								native-type="submit"
								:allowed="canEdit && !isApplying"
								aria-label="套用門禁名單變更"
								class="btn-primary"
							>
								{{ isApplying ? "處理中..." : "套用變更" }}
							</PermissionActionButton>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { Person } from "~/types/personnel"
import { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab"
import { usePageSelectAll } from "~/composables/systems/personnel/usePageSelectAll"
import { getPersonStatusLabel, getPersonStatusPillClass } from "~/utils/personnelUtils"

const getStatusLabel = getPersonStatusLabel
const getStatusPillClass = getPersonStatusPillClass

const props = defineProps<{
	modelValue: boolean
	locationId: number
	locationName: string
	canEdit: boolean
	syncTab: ReturnType<typeof usePersonnelSyncTab>
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const handleClose = () => emit("update:modelValue", false)

const {
	isLocationMembersLoading,
	isLocationMembersApplying,
	getLocationMembersError,
	getLocationMembersSuccess,
	getLocationMembersSelectedCount,
	isLocationMemberKept,
	toggleManyLocationMembers,
	toggleKeepLocationMember,
	getLocationMemberKeptIds,
	isLocationCandidatesLoading,
	getLocationCandidatesError,
	getLocationCandidatesItems,
	getLocationCandidatesQuery,
	setLocationCandidatesQuery,
	loadLocationCandidates,

	applyLocationMembers,
	reloadLocationMembers,
} = props.syncTab

const isApplying = computed(() => isLocationMembersApplying(props.locationId))
const errorText = computed(() => getLocationMembersError(props.locationId))
const successText = computed(() => getLocationMembersSuccess(props.locationId))

const selectedCount = computed(() => getLocationMembersSelectedCount(props.locationId))

const isLoadingCandidates = computed(() => isLocationCandidatesLoading(props.locationId))
const candidatesErrorText = computed(() => getLocationCandidatesError(props.locationId))
const candidates = computed<Person[]>(() => getLocationCandidatesItems(props.locationId))
const candidatesQuery = computed({
	get: () => getLocationCandidatesQuery(props.locationId),
	set: (v: string) => setLocationCandidatesQuery(props.locationId, v),
})

const isMemberKept = (personId: number) => isLocationMemberKept(props.locationId, personId)
const toggleKeepMember = (personId: number, e: Event) =>
	toggleKeepLocationMember(props.locationId, personId, e)

const pageSelectAll = usePageSelectAll<Person>({
	items: candidates,
	isSelected: (id) => isMemberKept(id),
	setMany: (ids, checked) => toggleManyLocationMembers(props.locationId, ids, checked),
})

const isAllMembersPageKept = pageSelectAll.isAllSelectedOnPage
const handleToggleSelectAllMembersPage = pageSelectAll.toggleSelectAllOnPage

const handleApply = async () => {
	await applyLocationMembers(props.locationId)
	if (errorText.value) return
	handleClose()
}

const handleSearchCandidates = async () => {
	await loadLocationCandidates(props.locationId)
}

watch(
	() => props.modelValue,
	(v) => {
		if (!v) return
		void reloadLocationMembers(props.locationId)
	}
)
</script>
