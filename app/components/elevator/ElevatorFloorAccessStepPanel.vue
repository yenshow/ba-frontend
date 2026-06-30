<template>
	<div class="rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0 space-y-2">
				<h4 class="text-lg font-medium text-white 2xl:text-xl">{{ title }}</h4>
				<p class="text-sm text-white/60 2xl:text-base">{{ description }}</p>
				<p
					v-if="defaultsApplied"
					class="text-xs text-amber-200/90 2xl:text-sm"
					role="status"
				>
					目前顯示人員主檔梯控卡預設樓層；套用後才會寫入此地點授權。
				</p>
			</div>
			<div class="flex min-w-0 shrink-0 items-center gap-2 lg:max-w-sm">
				<SearchInput
					:model-value="candidatesQuery"
					:input-id="searchInputId"
					label="搜尋可進出人員"
					placeholder="搜尋 ID / 姓名"
					aria-label="搜尋可進出人員"
					wrapper-class="min-w-0 flex-1"
					input-wrapper-class="min-w-0 flex-1"
					input-class="!w-full min-w-0"
					:disabled="isApplying"
					:clearable="!isApplying"
					@update:model-value="emit('update:candidatesQuery', $event)"
					@search="emit('search')"
					@clear="emit('search')"
				/>
				<button
					type="button"
					class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
					:disabled="!canSelectAll || !canEditFloors || isApplying"
					@click="emit('toggleSelectAll')"
				>
					{{ isAllExpandedFloorsKept ? "取消" : "全選" }}
				</button>
			</div>
		</div>

		<AsyncPanel
			class="mt-4"
			:loading="isLoading"
			:empty="!isLoading && floors.length === 0"
			empty-title="此地點尚未設定樓層，請先於地點管理設定"
			:min-height-class="listMinHeightClass"
		>
			<template #loading>
				<p class="sr-only">載入樓層授權</p>
				<ContentSkeleton variant="member-list" />
			</template>

			<div
				class="show-scrollbar space-y-3 overflow-y-auto pe-1"
				:class="listScrollClass"
			>
				<section
					v-for="floor in floors"
					:key="floor.index"
					class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
					:class="{ 'bg-white/15': isFloorExpanded(floor.index) }"
				>
					<div
						class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
						role="button"
						tabindex="0"
						:aria-expanded="isFloorExpanded(floor.index)"
						:aria-controls="`elevator-floor-panel-${floor.index}`"
						:aria-label="`${floor.name} 人員授權`"
						@click="emit('toggleFloor', floor.index)"
						@keydown.enter="emit('toggleFloor', floor.index)"
						@keydown.space.prevent="emit('toggleFloor', floor.index)"
					>
						<div class="flex min-w-0 flex-1 items-center gap-4">
							<svg
								class="h-5 w-5 shrink-0 text-white/70 transition-transform"
								:class="{ 'rotate-90': isFloorExpanded(floor.index) }"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
							<div
								class="flex h-16 min-w-[80px] max-w-[12rem] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-3 shadow-lg"
							>
								<h5 class="truncate text-xl font-bold tracking-wider text-white 2xl:text-2xl">
									{{ floor.name }}
								</h5>
							</div>
							<span
								class="inline-block min-w-[4.5rem] rounded-full bg-white/25 px-3 py-1 text-center text-sm font-medium text-white 2xl:text-base"
							>
								{{ selectedCountForFloor(floor.index) }} 人
							</span>
						</div>
					</div>

					<Transition name="expand">
						<div
							v-if="isFloorExpanded(floor.index)"
							:id="`elevator-floor-panel-${floor.index}`"
							class="space-y-3 border-t border-white/10 p-4"
						>
							<div
								v-if="candidateGroups.length === 0"
								class="py-6 text-center text-sm text-white/50"
							>
								尚無可選人員
							</div>
							<div v-else class="space-y-4">
								<section
									v-for="group in candidateGroups"
									:key="`${floor.index}-${group.groupId}`"
								>
									<h6 class="mb-2 text-xs font-medium text-white/55 2xl:text-sm">
										{{ group.groupName }}
										<span class="text-white/40">（{{ group.members.length }}）</span>
									</h6>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<label
											v-for="person in group.members"
											:key="`${floor.index}-${person.id}`"
											class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
										>
											<input
												type="checkbox"
												class="h-4 w-4 shrink-0 accent-cyan-400"
												:checked="isPersonChecked(floor.index, person.id)"
												:disabled="!canEditFloors || isApplying"
												@change="
													emit(
														'togglePerson',
														floor.index,
														person.id,
														($event.target as HTMLInputElement).checked
													)
												"
											/>
											<span
												class="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-white/90 2xl:text-base"
											>
												<span class="min-w-0 truncate">
													<span class="font-mono">{{ person.employee_no }}</span>
													<span class="ms-2">{{ person.full_name || "—" }}</span>
												</span>
												<span
													v-if="!personHasAccessCard(person)"
													class="shrink-0 rounded border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-100 2xl:text-xs"
													title="請於人員主檔「卡片設定」填寫卡號"
												>
													未設定卡號
												</span>
											</span>
										</label>
									</div>
								</section>
							</div>
						</div>
					</Transition>
				</section>
			</div>
		</AsyncPanel>

		<p v-if="errorText" class="form-error-text mt-3" role="alert">
			{{ errorText }}
		</p>

		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditFloors && !isApplying"
				class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
				aria-label="套用樓層權限"
				@click="emit('apply')"
			>
				{{ isApplying ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import type { PersonGroupMemberSection } from "~/utils/personnelUtils"
import { personHasAccessCard } from "~/utils/personnelUtils"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import { LOCATION_MEMBERS_PANEL_MIN_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

withDefaults(
	defineProps<{
		title?: string
		description: string
		searchInputId: string
		candidatesQuery: string
		canSelectAll: boolean
		canEditFloors: boolean
		isApplying: boolean
		isLoading: boolean
		floors: ElevatorFloorAccessSlot[]
		candidateGroups: PersonGroupMemberSection[]
		errorText: string | null
		defaultsApplied: boolean
		isAllExpandedFloorsKept: boolean
		isPersonChecked: (floorIndex: number, personId: number) => boolean
		selectedCountForFloor: (floorIndex: number) => number
		isFloorExpanded: (floorIndex: number) => boolean
		applyLabel?: string
		listMinHeightClass?: string
		listScrollClass?: string
	}>(),
	{
		title: "步驟 1：樓層權限",
		applyLabel: "套用樓層權限",
		listMinHeightClass: LOCATION_MEMBERS_PANEL_MIN_HEIGHT,
		listScrollClass: "max-h-[480px]",
	},
)

const emit = defineEmits<{
	"update:candidatesQuery": [value: string]
	search: []
	toggleSelectAll: []
	toggleFloor: [floorIndex: number]
	togglePerson: [floorIndex: number, personId: number, checked: boolean]
	apply: []
}>()
</script>
