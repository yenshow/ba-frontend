<script setup lang="ts">
import type { EnergyAlertDisplayItem } from "~/types/energy"
import EnergyAlertList from "~/components/energy/EnergyAlertList.vue"

const ALERT_LOG_PATH = "/core/alert-log?source=energy"

const props = defineProps<{
	modelValue: boolean
	alerts: EnergyAlertDisplayItem[]
	totalIncidents?: number
	totalInsights?: number
}>()

const emit = defineEmits<{ "update:modelValue": [boolean] }>()

const titleId = "energy-alerts-dialog-title"

const handleClose = () => {
	emit("update:modelValue", false)
}

const totalCount = computed(
	() => (props.totalIncidents ?? 0) + (props.totalInsights ?? 0)
)
</script>

<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@click.self="handleClose"
				@keydown.esc="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl p-6 2xl:max-w-3xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-4">
						<div>
							<h3
								:id="titleId"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								告警通知
							</h3>
							<p class="mt-1 text-sm text-white/55 2xl:text-base">
								共 {{ totalCount }} 筆
								<span v-if="(totalIncidents ?? 0) > 0" class="text-white/40">
									· 需處置 {{ totalIncidents }} 筆
								</span>
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto">
						<EnergyAlertList :alerts="alerts" />
					</div>

					<footer
						v-if="(totalIncidents ?? 0) > 0"
						class="flex items-center justify-between gap-3 border-t border-white/20 pt-4 text-sm 2xl:text-base"
					>
						<p class="text-white/50">需處置項目可於警示紀錄忽視或待恢復結案</p>
						<NuxtLink
							:to="ALERT_LOG_PATH"
							class="shrink-0 text-white/70 transition-colors hover:text-white"
							@click="handleClose"
						>
							前往警示紀錄 >
						</NuxtLink>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
