<template>
	<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<slot name="toolbar" />

		<p
			v-if="defaultsApplied"
			class="mt-3 text-xs text-amber-200/90 2xl:text-sm"
			role="status"
		>
			目前顯示人員主檔梯控卡預設樓層；套用後才會寫入此地點授權。
		</p>

		<div class="mt-4 grid min-h-0 grid-cols-12 items-stretch gap-4 2xl:gap-5">
			<ElevatorFloorBrowseList
				:floors="floors"
				:selected-floor-index="selectedFloorIndex"
				:selected-count-for-floor="selectedCountForFloor"
				:loading="isLoading"
				:error="errorText"
				:can-edit="canEditFloors"
				:is-saving-floor-name="isSavingFloorName"
				:panel-height-class="panelHeightClass"
				@select-floor="emit('selectFloor', $event)"
				@update-floor-name="(floorIndex, name) => emit('updateFloorName', floorIndex, name)"
			/>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-8"
				:class="panelHeightClass"
			>
				<div
					class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
				>
					<div class="flex items-center gap-2 border-b border-white/10 p-3">
						<SearchInput
							:model-value="candidatesQuery"
							:input-id="searchInputId"
							label="搜尋人員"
							placeholder="搜尋 ID / 姓名"
							aria-label="搜尋人員"
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
							class="btn-secondary shrink-0 whitespace-nowrap text-sm 2xl:text-base"
							:disabled="
								!hasFilteredCandidates || !canEditFloors || isApplying || selectedFloorIndex == null
							"
							@click="emit('toggleSelectAll')"
						>
							{{ isAllSelectedFloorKept ? "取消" : "全選" }}
						</button>
					</div>

					<AsyncPanel
						class="min-h-0 flex-1"
						panel-size="dense"
						:loading="isLoading"
						:empty="!isLoading && (selectedFloorIndex == null || filteredCandidates.length === 0)"
						empty-title="此樓層尚無可選人員"
						min-height-class="min-h-0"
					>
						<template #loading>
							<p class="sr-only">載入人員清單</p>
							<ContentSkeleton variant="member-list" />
						</template>
						<div
							class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3 pe-1"
						>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<div
									v-for="person in filteredCandidates"
									:key="person.id"
									class="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
									:class="{
										'ring-1 ring-cyan-400/35':
											selectedFloorIndex != null && isPersonChecked(selectedFloorIndex, person.id),
									}"
								>
									<label class="flex cursor-pointer items-center gap-2.5">
										<input
											type="checkbox"
											class="h-[1.125rem] w-[1.125rem] shrink-0 accent-cyan-400 2xl:h-5 2xl:w-5"
											:checked="
												selectedFloorIndex != null && isPersonChecked(selectedFloorIndex, person.id)
											"
											:disabled="!canEditFloors || isApplying || selectedFloorIndex == null"
											@change="
												emit(
													'togglePerson',
													selectedFloorIndex!,
													person.id,
													($event.target as HTMLInputElement).checked,
												)
											"
										/>
										<span class="min-w-0 flex-1 truncate text-base text-white/90 2xl:text-lg">
											<span class="font-mono">{{ person.employee_no }}</span>
											<span class="ms-2">{{ person.full_name || "—" }}</span>
										</span>
										<div class="shrink-0">
											<slot name="person-indicators" :person="person" />
										</div>
									</label>
								</div>
							</div>
						</div>
					</AsyncPanel>
				</div>
			</section>
		</div>

		<p v-if="errorText" class="form-error-text mt-3" role="alert">
			{{ errorText }}
		</p>

		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditFloors"
				:disabled="isApplying"
				class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
				aria-label="套用權限"
				@click="emit('apply')"
			>
				{{ isApplying ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Person } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import ElevatorFloorBrowseList from "~/components/elevator/ElevatorFloorBrowseList.vue"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		selectedFloorIndex: number | null
		candidatesQuery: string
		searchInputId: string
		filteredCandidates: Person[]
		hasFilteredCandidates: boolean
		canEditFloors: boolean
		isApplying: boolean
		isSavingFloorName?: boolean
		isLoading: boolean
		errorText: string | null
		defaultsApplied?: boolean
		isAllSelectedFloorKept: boolean
		isPersonChecked: (floorIndex: number, personId: number) => boolean
		selectedCountForFloor: (floorIndex: number) => number
		applyLabel?: string
		panelHeightClass?: string
	}>(),
	{
		applyLabel: "套用權限",
		isSavingFloorName: false,
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const emit = defineEmits<{
	"update:candidatesQuery": [value: string]
	search: []
	selectFloor: [floorIndex: number]
	toggleSelectAll: []
	togglePerson: [floorIndex: number, personId: number, checked: boolean]
	updateFloorName: [floorIndex: number, name: string]
	apply: []
}>()
</script>
