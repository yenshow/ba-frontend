<template>
	<Transition name="expand">
		<div v-if="expanded" class="border-t border-white/10 p-4">
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="btn-secondary text-xs 2xl:text-sm me-auto"
					:disabled="candidates.length === 0 || isApplying"
					:aria-label="isAllPageKept ? '取消全選（目前列表）' : '全選（目前列表）'"
					@click="handleToggleSelectAllOnPage"
				>
					{{ isAllPageKept ? "取消全選" : "全選" }}
				</button>
				<span class="text-xs text-white/60 2xl:text-sm">已選 {{ keptCount }} 人</span>
			</div>

			<div v-if="isLoadingCandidates" class="py-6 text-center text-sm text-white/60">載入人員中…</div>
			<p v-else-if="candidatesErrorText" class="text-sm text-rose-300" role="alert">
				{{ candidatesErrorText }}
			</p>
			<div
				v-else
				class="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
			>
				<label
					v-for="p in candidates"
					:key="`${childId}-${p.id}`"
					class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
				>
					<span class="flex min-w-0 items-center gap-2">
						<input
							:checked="isMemberKept(p.id)"
							type="checkbox"
							class="h-4 w-4 accent-cyan-400"
							:disabled="isApplying"
							:aria-label="`子群組 ${childName}：${p.employee_no} ${p.full_name || ''}`"
							@change="handleToggleMember(p.id, $event)"
						/>
						<span class="min-w-0 truncate text-sm text-white/90">
							<span class="font-mono">{{ p.employee_no }}</span>
							<span class="ms-2">{{ p.full_name || "—" }}</span>
						</span>
					</span>
					<span
						v-if="overlapLabel(p.id)"
						class="max-w-[9rem] truncate rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-100/90"
						:title="overlapLabel(p.id) || undefined"
					>
						{{ overlapLabel(p.id) }}
					</span>
					<span
						v-else-if="otherLabel(p)"
						class="max-w-[8rem] truncate rounded bg-white/10 px-2 py-0.5 text-xs text-white/60"
						:title="otherLabel(p) || undefined"
					>
						{{ otherLabel(p) }}
					</span>
				</label>
				<div
					v-if="!isLoadingCandidates && candidates.length === 0 && candidatesQuery.trim().length > 0"
					class="col-span-full py-6 text-center text-white/50"
				>
					無符合搜尋結果
				</div>
				<div
					v-else-if="!isLoadingCandidates && candidates.length === 0"
					class="col-span-full py-6 text-center text-white/50"
				>
					尚無人員
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import type { Person } from "~/types/personnel"

const props = defineProps<{
	childId: number
	childName: string
	expanded: boolean
	keptCount: number
	candidates: Person[]
	candidatesQuery: string
	isLoadingCandidates: boolean
	candidatesErrorText: string | null
	isApplying: boolean
	isMemberKept: (personId: number) => boolean
	isAllPageKept: boolean
	overlapLabel: (personId: number) => string | null
	otherLabel: (p: Person) => string | null
	onToggleMember: (personId: number, e: Event) => void
	onToggleSelectAllOnPage: () => void
}>()

const handleToggleMember = (personId: number, e: Event) => props.onToggleMember(personId, e)
const handleToggleSelectAllOnPage = () => props.onToggleSelectAllOnPage()
</script>
