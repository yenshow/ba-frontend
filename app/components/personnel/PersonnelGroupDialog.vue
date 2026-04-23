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
					<header class="flex items-center justify-between">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ editingGroup ? "編輯群組" : "新增群組" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
						<!-- 名稱 -->
						<div class="flex flex-col gap-2 2xl:gap-3">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>名稱 *</span>
								<input v-model="form.name" type="text" required class="form-input-small" />
							</label>
							<p v-if="errorMessage" class="text-sm text-rose-300" role="alert">
								{{ errorMessage }}
							</p>
						</div>

						<!-- 目前成員（僅編輯群組時存在） -->
						<div
							v-if="editingGroup"
							class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base"
						>
							<div class="flex items-end justify-between gap-3">
								<p class="text-white/80">目前成員</p>
								<span class="text-xs text-white/50 2xl:text-sm" aria-label="目前成員數量">
									共 {{ members.length }} 人
								</span>
							</div>
							<p
								v-if="groupMembersErrorText"
								class="text-xs text-rose-300 2xl:text-sm"
								role="alert"
							>
								{{ groupMembersErrorText }}
							</p>
							<div class="grid max-h-[360px] gap-2 grid-cols-2">
								<label
									v-for="m in pagedMembers"
									:key="m.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											v-model="keptMemberIds"
											type="checkbox"
											:value="m.id"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEditMembers"
											:aria-label="`保留成員：${m.employee_no} ${m.full_name || ''}`"
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
									v-if="!isLoadingGroupMembers && members.length === 0"
									class="py-6 text-center text-white/50"
								>
									此群組目前沒有成員
								</div>
								<div v-if="isLoadingGroupMembers" class="py-6 text-center text-white/60">
									載入中…
								</div>
							</div>
							<Pagination
								:total="members.length"
								:offset="membersOffset"
								:limit="MEMBERS_PAGE_SIZE"
								:disabled="false"
								:show="members.length > MEMBERS_PAGE_SIZE"
								@previous="membersPageIndex = Math.max(0, membersPageIndex - 1)"
								@next="membersPageIndex = Math.min(membersTotalPages - 1, membersPageIndex + 1)"
							/>
						</div>

						<!-- 可加入成員 -->
						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="flex items-end justify-between gap-3">
								<p class="text-white/80">可加入成員</p>
								<p class="text-xs text-white/50 2xl:text-sm" aria-label="可加入成員數量">
									共 {{ availablePersons.length }} 人
								</p>
							</div>
							<p v-if="allPersonsErrorText" class="text-xs text-rose-300 2xl:text-sm" role="alert">
								{{ allPersonsErrorText }}
							</p>
							<div class="grid max-h-[360px] gap-2 grid-cols-2 overflow-y-auto">
								<label
									v-for="p in pagedAvailablePersons"
									:key="p.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											v-model="selectedAddIds"
											type="checkbox"
											:value="p.id"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEditMembers"
											:aria-label="`加入成員：${p.employee_no} ${p.full_name || ''}`"
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
									v-if="!isLoadingAllPersons && availablePersons.length === 0"
									class="py-6 text-center text-white/50"
								>
									目前沒有可加入的人員
								</div>
								<div v-if="isLoadingAllPersons" class="py-6 text-center text-white/60">載入中…</div>
							</div>
							<Pagination
								:total="availablePersons.length"
								:offset="availableOffset"
								:limit="AVAILABLE_PAGE_SIZE"
								:disabled="false"
								:show="availablePersons.length > AVAILABLE_PAGE_SIZE"
								@previous="availablePageIndex = Math.max(0, availablePageIndex - 1)"
								@next="
									availablePageIndex = Math.min(availableTotalPages - 1, availablePageIndex + 1)
								"
							/>
						</div>

						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
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
</template>

<script setup lang="ts">
import type { Person, PersonGroup } from "~/types/personnel"
import Pagination from "~/components/common/Pagination.vue"

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
	editingGroup: PersonGroup | null
	form: { name: string }
	isSubmitting: boolean
	errorMessage: string | null
	canEditMembers: boolean
	allPersons: Person[]
	isLoadingAllPersons: boolean
	allPersonsErrorText: string | null
	groupMembers: Person[]
	isLoadingGroupMembers: boolean
	groupMembersErrorText: string | null
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	submit: [{ memberPersonIds: number[] }]
}>()

const members = ref<Person[]>([])
const keptMemberIds = ref<number[]>([])
const membersPageIndex = ref(0)
const MEMBERS_PAGE_SIZE = 20
const availablePageIndex = ref(0)
const AVAILABLE_PAGE_SIZE = 20
const selectedAddIds = ref<number[]>([])

const resetMemberUiState = () => {
	selectedAddIds.value = []
	availablePageIndex.value = 0
	members.value = []
	membersPageIndex.value = 0
	keptMemberIds.value = []
}

const normalizeIdList = (value: unknown): number[] => {
	if (!Array.isArray(value)) return []
	return value
		.map((x) => Number(x))
		.filter((x) => Number.isFinite(x))
		.map((x) => Math.trunc(x))
}

const pagedMembers = computed(() => {
	const start = membersPageIndex.value * MEMBERS_PAGE_SIZE
	return members.value.slice(start, start + MEMBERS_PAGE_SIZE)
})
const membersTotalPages = computed(() =>
	Math.max(1, Math.ceil(members.value.length / MEMBERS_PAGE_SIZE))
)
const membersOffset = computed(() => membersPageIndex.value * MEMBERS_PAGE_SIZE)

const availablePersons = computed(() => {
	const existing = new Set(members.value.map((m) => m.id))
	return props.allPersons.filter((p) => !existing.has(p.id))
})
const pagedAvailablePersons = computed(() => {
	const start = availablePageIndex.value * AVAILABLE_PAGE_SIZE
	return availablePersons.value.slice(start, start + AVAILABLE_PAGE_SIZE)
})
const availableTotalPages = computed(() => {
	return Math.max(1, Math.ceil(availablePersons.value.length / AVAILABLE_PAGE_SIZE))
})
const availableOffset = computed(() => availablePageIndex.value * AVAILABLE_PAGE_SIZE)

const handleClose = () => emit("update:modelValue", false)
const handleSubmit = () => {
	const kept = normalizeIdList(keptMemberIds.value)
	const toAdd = normalizeIdList(selectedAddIds.value)
	const desired = props.editingGroup
		? Array.from(new Set([...kept, ...toAdd]))
		: Array.from(new Set(toAdd))
	emit("submit", { memberPersonIds: desired })
}

watch(
	() => props.modelValue,
	(v) => {
		if (!v) return
		resetMemberUiState()
	}
)

watch(
	() => props.groupMembers,
	(next) => {
		// 由父層負責載入，Dialog 只同步顯示/勾選狀態
		const hasGroup = Boolean(props.editingGroup)
		members.value = hasGroup ? (Array.isArray(next) ? next : []) : []
		membersPageIndex.value = 0
		keptMemberIds.value = hasGroup ? members.value.map((m) => m.id) : []
		availablePageIndex.value = 0
		selectedAddIds.value = []
	},
	{ deep: true, immediate: true }
)
</script>
