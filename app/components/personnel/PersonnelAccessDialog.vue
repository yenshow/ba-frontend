<template>
	<Teleport to="body">
		<Transition name="personnel-dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
			>
				<div
					class="personnel-dialog-panel show-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							門禁權限 — {{ person?.employee_no }} {{ person?.full_name || "" }}
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
					<p class="text-sm text-white/70">
						此處為「可進出之地點」（可多選），不是門禁設備列表。門禁設備請在「設備管理」新增；地點需在「人流統計」中建立並綁定入口/出口設備後，才會出現在下方。
					</p>
					<div v-if="isLoading" class="py-8 text-center text-white/70">載入中...</div>
					<div v-else class="space-y-2">
						<label
							v-for="loc in locations"
							:key="loc.id"
							class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
							:class="{
								'border-cyan-400/50 bg-cyan-500/20': selectedLocationIds.includes(loc.id),
							}"
						>
							<input
								v-model="localSelectedIds"
								type="checkbox"
								:value="loc.id"
								class="h-4 w-4 accent-cyan-400"
							/>
							<span class="text-sm text-white/90 2xl:text-base"
								>{{ loc.zone_name }} — {{ loc.name }}</span
							>
						</label>
						<div
							v-if="locations.length === 0"
							class="rounded border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200/90"
						>
							<p class="font-medium">尚無可同步地點</p>
							<p class="mt-2 text-white/80">請依序完成：</p>
							<ol class="mt-1 list-inside list-decimal space-y-1 text-white/70">
								<li>在「設備管理」新增門禁設備（您已有設備則可略過）</li>
								<li>至「人流統計」→ 點「地點管理」→ 建立區域與地點</li>
								<li>在各地點中選擇「門禁設備（本系統）」並綁定入口／出口設備</li>
							</ol>
							<p class="mt-2 text-white/70">
								完成綁定後，此地點會出現在上方列表，即可為人員設定可進出之地點。
							</p>
						</div>
					</div>
					<footer class="mt-2 flex gap-3 2xl:gap-4">
						<button type="button" class="personnel-btn-secondary" @click="handleClose">取消</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="personnel-btn-primary"
							:disabled="isSaving || !person"
							@click="handleSave"
						>
							{{ isSaving ? "儲存中..." : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { Person, SyncableLocation } from "~/types/personnel"

const props = defineProps<{
	modelValue: boolean
	person: Person | null
	locations: SyncableLocation[]
	selectedLocationIds: number[]
	isLoading: boolean
	isSaving: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	"update:selectedLocationIds": [ids: number[]]
	save: []
}>()

const localSelectedIds = computed({
	get: () => props.selectedLocationIds,
	set: (ids: number[]) => emit("update:selectedLocationIds", ids),
})

const handleClose = () => emit("update:modelValue", false)
const handleSave = () => emit("save")
</script>
