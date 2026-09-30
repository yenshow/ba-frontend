<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] p-4 backdrop-blur-[10px]"
		>
			<div
				class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl p-6 text-white 2xl:p-8"
				role="dialog"
				aria-label="完整報表"
			>
				<header class="flex items-center justify-between">
					<h3 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">完整報表</h3>
					<button
						type="button"
						class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white"
						aria-label="關閉"
						@click="emit('update:modelValue', false)"
					>
						&times;
					</button>
				</header>
				<p v-if="errorMessage" class="form-error-text-lg" role="alert">{{ errorMessage }}</p>
				<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
					<div class="show-scrollbar min-h-0 overflow-y-auto">
						<button
							v-for="item in sessions"
							:key="item.id"
							type="button"
							class="mb-2 w-full rounded-xl border border-white/30 px-3 py-2 text-left hover:bg-white/10"
							@click="handleOpen(item.id)"
						>
							<div class="font-semibold">
								{{ item.sessionDate }} {{ item.zoneName }} {{ item.locationName }}
							</div>
							<div class="text-sm text-white/70">
								{{ item.ruleName }}　應到 {{ item.expectedCount }}　實到 {{ item.presentCount }}　未到
								{{ item.absentCount }}
							</div>
						</button>
						<p v-if="sessions.length === 0" class="text-sm text-white/60">尚無歷史場次</p>
					</div>
					<div v-if="detail" class="show-scrollbar min-h-0 overflow-y-auto text-sm">
						<p class="mb-2 font-semibold">
							{{ detail.ruleName }}（唯讀）應到 {{ detail.expectedCount }}／實到
							{{ detail.presentCount }}／未到 {{ detail.absentCount }}
						</p>
						<ul class="space-y-1">
							<li v-for="row in detail.attendance" :key="row.personId">
								{{ row.groupName }}　{{ row.fullName || row.employeeNo }}　{{ statusLabel(row.status) }}
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { useRollCallApi } from "~/composables/systems/rollCall/useRollCallApi"
import type { RollCallHistoryItem, RollCallSessionDetail } from "~/types/rollCall"

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>()

const api = useRollCallApi()
const sessions = ref<RollCallHistoryItem[]>([])
const detail = ref<RollCallSessionDetail | null>(null)
const errorMessage = ref("")

const statusLabel = (status: string) => {
	if (status === "present") return "已簽到"
	if (status === "absent") return "未到"
	return "尚未簽到"
}

const load = async () => {
	errorMessage.value = ""
	detail.value = null
	const res = await api.getHistory(100, 0)
	sessions.value = res.sessions || []
}

const handleOpen = async (id: number) => {
	try {
		const res = await api.getSession(id)
		detail.value = res.session
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : "載入場次失敗"
	}
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		void load().catch((error) => {
			errorMessage.value = error instanceof Error ? error.message : "載入失敗"
		})
	},
)
</script>
