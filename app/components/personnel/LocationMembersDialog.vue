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

					<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleApply">
						<!-- 目前名單 -->
						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="flex items-end justify-between gap-3">
								<p class="text-white/80">目前名單</p>
								<span class="text-xs text-white/50 2xl:text-sm" aria-label="目前名單數量">
									共 {{ membersTotal }} 人
								</span>
							</div>
							<div class="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
								<label
									v-for="m in membersPaged"
									:key="m.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											:checked="isMemberKept(m.id)"
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEdit || isApplying"
											:aria-label="`保留人員：${m.employee_no} ${m.full_name || ''}`"
											@change="toggleKeepMember(m.id, $event)"
										/>
										<span class="text-sm text-white/90 2xl:text-base">
											<span class="font-mono">{{ m.employee_no }}</span>
											<span class="ms-2">{{ m.full_name || "—" }}</span>
										</span>
									</span>
									<span
										class="rounded bg-white/5 px-2 py-1 text-xs text-white/70"
										:class="getStatusPillClass(m.status)"
									>
										{{ getStatusLabel(m.status) }}
									</span>
								</label>
								<div
									v-if="!isLoadingMembers && membersTotal === 0"
									class="py-6 text-center text-white/50"
								>
									此地點目前沒有門禁名單
								</div>
								<div v-if="isLoadingMembers" class="py-6 text-center text-white/60">載入中…</div>
							</div>
							<Pagination
								:total="membersTotal"
								:offset="membersOffset"
								:limit="membersPageSize"
								:disabled="isLoadingMembers"
								:show="membersTotal > membersPageSize"
								@previous="handlePrevMembers"
								@next="handleNextMembers"
							/>
						</div>

						<!-- 可加入人員 -->
						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="flex items-end justify-between gap-3">
								<p class="text-white/80">可加入人員</p>
								<p class="text-xs text-white/50 2xl:text-sm" aria-label="可加入人員數量">
									共 {{ addTotal }} 人
								</p>
							</div>
							<p v-if="addErrorText" class="text-xs text-rose-300 2xl:text-sm" role="alert">
								{{ addErrorText }}
							</p>
							<div class="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
								<label
									v-for="p in addAvailableItems"
									:key="p.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											type="checkbox"
											:checked="isAddSelected(p.id)"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEdit || isApplying"
											:aria-label="`加入名單：${p.employee_no} ${p.full_name || ''}`"
											@change="toggleSelectAdd(p.id, $event)"
										/>
										<span class="text-sm text-white/90 2xl:text-base">
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
									v-if="!isLoadingAdd && addAvailableItems.length === 0"
									class="py-6 text-center text-white/50"
								>
									目前沒有可加入的人員
								</div>
								<div v-if="isLoadingAdd" class="py-6 text-center text-white/60">載入中…</div>
							</div>
							<Pagination
								:total="addTotal"
								:offset="addOffset"
								:limit="addPageSize"
								:disabled="isLoadingAdd"
								:show="addTotal > addPageSize"
								@previous="handlePrevAdd"
								@next="handleNextAdd"
							/>
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
							<button type="submit" class="btn-primary" :disabled="!canEdit || isApplying">
								{{ isApplying ? "處理中..." : "套用變更" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { Person } from "~/types/personnel"
import Pagination from "~/components/common/Pagination.vue"
import type { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab"

const STATUS_LABELS: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	deleted: "已刪除",
}
const getStatusLabel = (status: unknown) => STATUS_LABELS[String(status)] ?? "已刪除"
const getStatusPillClass = (status: unknown) => {
	const s = String(status)
	if (s === "active") return "bg-emerald-500/15 text-emerald-100"
	if (s === "inactive") return "bg-yellow-500/15 text-yellow-100"
	return "bg-gray-500/15 text-gray-100"
}

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
	LOCATION_MEMBERS_PAGE_SIZE: membersPageSize,
	LOCATION_ADD_PAGE_SIZE: addPageSize,

	isLocationMembersLoading,
	isLocationMembersApplying,
	getLocationMembersError,
	getLocationMembersSuccess,
	getLocationMembersCount,
	getLocationMembersOffset,
	getLocationMembersPaged,
	getLocationMembersAll,
	prevLocationMembersPage,
	nextLocationMembersPage,
	isLocationMemberKept,
	toggleKeepLocationMember,

	isLocationAddLoading,
	getLocationAddError,
	getLocationAddTotal,
	getLocationAddOffset,
	getLocationAddItems,
	setLocationAddOffset,
	loadLocationAddCandidates,

	isLocationMemberAddSelected,
	toggleSelectAddLocationMember,
	applyLocationMembers,
	reloadLocationMembers,
} = props.syncTab

const isLoadingMembers = computed(() => isLocationMembersLoading(props.locationId))
const isApplying = computed(() => isLocationMembersApplying(props.locationId))
const errorText = computed(() => getLocationMembersError(props.locationId))
const successText = computed(() => getLocationMembersSuccess(props.locationId))

const membersTotal = computed(() => getLocationMembersCount(props.locationId))
const membersOffset = computed(() => getLocationMembersOffset(props.locationId))
const membersPaged = computed<Person[]>(() => getLocationMembersPaged(props.locationId))
const membersAll = computed<Person[]>(() => getLocationMembersAll(props.locationId))

const addErrorText = computed(() => getLocationAddError(props.locationId))
const isLoadingAdd = computed(() => isLocationAddLoading(props.locationId))
const addTotal = computed(() => getLocationAddTotal(props.locationId))
const addOffset = computed(() => getLocationAddOffset(props.locationId))
const addItems = computed<Person[]>(() => getLocationAddItems(props.locationId))
const addAvailableItems = computed<Person[]>(() => {
	const existing = new Set(membersAll.value.map((m) => m.id))
	return addItems.value.filter((p) => !existing.has(p.id))
})

const isMemberKept = (personId: number) => isLocationMemberKept(props.locationId, personId)
const toggleKeepMember = (personId: number, e: Event) =>
	toggleKeepLocationMember(props.locationId, personId, e)
const isAddSelected = (personId: number) => isLocationMemberAddSelected(props.locationId, personId)
const toggleSelectAdd = (personId: number, e: Event) =>
	toggleSelectAddLocationMember(props.locationId, personId, e)

const handleApply = async () => {
	await applyLocationMembers(props.locationId)
	if (errorText.value) return
	handleClose()
}

const handlePrevMembers = () => prevLocationMembersPage(props.locationId)
const handleNextMembers = () => nextLocationMembersPage(props.locationId)

const handlePrevAdd = async () => {
	setLocationAddOffset(props.locationId, Math.max(0, addOffset.value - addPageSize))
	await loadLocationAddCandidates(props.locationId)
}
const handleNextAdd = async () => {
	setLocationAddOffset(props.locationId, addOffset.value + addPageSize)
	await loadLocationAddCandidates(props.locationId)
}

watch(
	() => props.modelValue,
	(v) => {
		if (!v) return
		void reloadLocationMembers(props.locationId)
	}
)
</script>
