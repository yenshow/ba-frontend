<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="elevator-card-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					:aria-busy="isSyncing || undefined"
				>
					<header class="flex items-center justify-between gap-3">
						<h3
							id="elevator-card-manage-title"
							class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							卡片管理
						</h3>
						<nav class="flex items-center gap-2" aria-label="卡片管理步驟">
							<button
								v-for="step in [1, 2]"
								:key="step"
								type="button"
								class="rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="manageStep === step ? 'border-cyan-400/60 bg-cyan-500/15' : 'border-white/15'"
								@click="manageStep = step"
							>
								步驟 {{ step }}
							</button>
						</nav>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

					<div v-else-if="manageStep === 1" class="space-y-4">
						<p class="text-sm text-white/60">勾選允許使用此地點電梯的人員。</p>
						<SearchInput
							v-model="membersQuery"
							input-id="elevator-members-search"
							label="搜尋人員"
							placeholder="搜尋 ID / 姓名"
							aria-label="搜尋人員"
							@search="handleSearchMembers"
						/>
						<AsyncPanel
							:loading="isLoadingMembers"
							:empty="!isLoadingMembers && !hasMemberCandidates"
							empty-title="尚無可選人員"
						>
							<div class="max-h-[50vh] space-y-3 overflow-y-auto">
								<div
									v-for="group in memberCandidateGroups"
									:key="group.groupName"
									class="space-y-2"
								>
									<p class="text-sm font-medium text-white/70">{{ group.groupName }}</p>
									<label
										v-for="person in group.persons"
										:key="person.id"
										class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
									>
										<input
											type="checkbox"
											:checked="isMemberKept(person.id)"
											class="h-4 w-4 accent-cyan-400"
											@change="toggleMember(person.id, $event)"
										/>
										<span class="font-mono text-sm text-white/80">{{ person.employee_no }}</span>
										<span class="text-sm text-white">{{ person.full_name || "—" }}</span>
									</label>
								</div>
							</div>
						</AsyncPanel>
						<p v-if="membersError" class="form-error-text">{{ membersError }}</p>
						<p v-if="membersSuccess" class="text-sm text-emerald-300">{{ membersSuccess }}</p>
						<PermissionActionButton
							:allowed="canEditMembers"
							class="btn-primary"
							:disabled="isApplyingMembers"
							@click="handleApplyMembers"
						>
							{{ isApplyingMembers ? "套用中…" : "套用成員" }}
						</PermissionActionButton>
					</div>

					<div v-else class="space-y-4">
						<p class="text-sm text-white/60">
							將人員梯控卡同步至設備，並可檢視設備上現有卡片。
						</p>
						<PermissionActionButton
							:allowed="canCardManage"
							class="btn-primary"
							:disabled="isSyncing"
							@click="handleStartSync"
						>
							{{ isSyncing ? "同步中…" : "同步至設備" }}
						</PermissionActionButton>

						<div v-if="deviceCards.length > 0" class="overflow-x-auto">
							<table class="w-full min-w-[480px] text-left text-sm text-white/90">
								<thead>
									<tr class="border-b border-white/15 text-white/70">
										<th class="py-2 pe-2">卡號</th>
										<th class="py-2 pe-2">姓名</th>
										<th class="py-2 pe-2">操作</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="card in deviceCards"
										:key="card.cardNo"
										class="border-b border-white/10"
									>
										<td class="py-2 pe-2 font-mono">{{ card.cardNo }}</td>
										<td class="py-2 pe-2">{{ card.name || "—" }}</td>
										<td class="py-2 pe-2">
											<button
												type="button"
												class="text-rose-300 hover:text-rose-200 disabled:opacity-50"
												:disabled="!canCardManage"
												@click="handleDeleteCard(card.cardNo)"
											>
												刪除
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<p v-else class="text-sm text-white/50">尚無設備卡片資料</p>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from "vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import { useLocationMembersPicker } from "~/composables/systems/personnel/useLocationMembersPicker"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useElevatorCardSync } from "~/composables/systems/elevator/useElevatorCardSync"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

const props = defineProps<{
	modelValue: boolean
	locationId: number | null
	locationName?: string | null
	deviceId?: number | null
	canEditMembers: boolean
	canCardManage: boolean
	accessSync: ReturnType<typeof useLocationAccessSync>
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	synced: []
	membersUpdated: []
}>()

const manageStep = ref(1)
const elevatorApi = useElevatorApi()
const toast = useToast()
const { handleError } = useErrorHandler()
const { isSyncing, syncLocationCards } = useElevatorCardSync({ toast, handleError })

const deviceCards = ref<Array<{ cardNo: string; name?: string }>>([])

const { prepareLocationDialog } = props.accessSync

const {
	hasMemberCandidates,
	memberCandidateGroups,
	membersQuery,
	isApplyingMembers,
	isLoadingMembers,
	membersError,
	membersSuccess,
	isMemberKept,
	toggleMember,
	handleSearchMembers,
	applyMembers,
} = useLocationMembersPicker({
	locationId: toRef(props, "locationId"),
	accessSync: toRef(props, "accessSync"),
})

const handleClose = () => emit("update:modelValue", false)

const handleApplyMembers = async () => {
	if (!(await applyMembers())) return
	emit("membersUpdated")
}

const loadDeviceCards = async () => {
	if (!props.deviceId) {
		deviceCards.value = []
		return
	}
	try {
		deviceCards.value = await elevatorApi.listDeviceCards(props.deviceId)
	} catch {
		deviceCards.value = []
	}
}

const handleStartSync = async () => {
	if (!props.locationId || !props.canCardManage) return
	try {
		await syncLocationCards(props.locationId)
		await loadDeviceCards()
		emit("synced")
	} catch {
		// handleError 已由 useElevatorCardSync 處理
	}
}

const handleDeleteCard = async (cardNo: string) => {
	if (!props.deviceId || !props.canCardManage) return
	try {
		await elevatorApi.deleteDeviceCard(props.deviceId, cardNo)
		toast.success("已刪除設備卡片")
		await loadDeviceCards()
	} catch (error) {
		handleError(error, "刪除設備卡片失敗")
	}
}

watch(
	() => [props.modelValue, props.locationId, manageStep.value] as const,
	async ([open, locId, step]) => {
		if (!open || locId == null) return
		await prepareLocationDialog(locId)
		if (step === 2) await loadDeviceCards()
	},
)
</script>
