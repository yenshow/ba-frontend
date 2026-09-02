<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2500] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex w-full max-w-md flex-col gap-4 rounded-3xl p-6 2xl:max-w-lg 2xl:gap-6 2xl:p-8"
					role="dialog"
					aria-modal="true"
					aria-labelledby="card-qr-dialog-title"
				>
					<header class="flex items-center justify-between">
						<h3 id="card-qr-dialog-title" class="text-lg font-semibold text-white 2xl:text-xl">
							二維碼
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="space-y-4 text-sm text-white/80 2xl:text-base">
						<p class="text-white/90">{{ personLabel }}</p>

						<PersonnelFormItemTabs
							v-if="cards.length > 1"
							v-model:active-index="activeCardIndex"
							:count="cards.length"
							:max="cards.length"
							aria-label="卡號"
						/>

						<div v-if="activeCard" class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
							<div class="flex flex-wrap gap-x-6 gap-y-2">
								<div>
									<p class="text-white/55">卡號</p>
									<p class="font-mono text-white">{{ activeCard.cardNo }}</p>
								</div>
								<div>
									<p class="text-white/55">卡片屬性</p>
									<p class="text-white">{{ personCardSourceLabel(activeCard.source) }}</p>
								</div>
							</div>

							<div
								class="flex min-h-[252px] flex-col items-center justify-center gap-3 pt-2 2xl:min-h-[292px]"
							>
								<p v-if="isGenerating" class="text-white/60">產生中...</p>
								<p v-else-if="errorMessage" class="form-error-text-inline" role="alert">
									{{ errorMessage }}
								</p>
								<div v-else-if="qrDataUrl" class="rounded-xl bg-white p-4">
									<img
										:src="qrDataUrl"
										:alt="`卡號 ${activeCard.cardNo} 的二維碼`"
										class="h-[220px] w-[220px] 2xl:h-[260px] 2xl:w-[260px]"
									/>
								</div>
							</div>
						</div>
					</div>

					<footer class="flex justify-end border-t border-white/20 pt-4">
						<button
							type="button"
							class="rounded-xl bg-rose-500/90 px-6 py-2.5 text-sm text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-8 2xl:py-3 2xl:text-base"
							:disabled="!qrDataUrl || isGenerating"
							aria-label="下載 QR 碼"
							@click="handleDownload"
						>
							下載 QR 碼
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import PersonnelFormItemTabs from "~/components/personnel/PersonnelFormItemTabs.vue"
import type { PersonCardFormItem } from "~/utils/cardFormUtils"
import {
	buildCardQrDataUrl,
	buildCardQrFileName,
	downloadCardQrImage,
	personCardSourceLabel,
} from "~/utils/cardQrUtils"
import { formatPersonLabel } from "~/utils/personnelUtils"

const props = defineProps<{
	modelValue: boolean
	employeeNo: string
	fullName?: string | null
	cards: PersonCardFormItem[]
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const activeCardIndex = ref(0)
const qrDataUrl = ref<string | null>(null)
const isGenerating = ref(false)
const errorMessage = ref<string | null>(null)

const personLabel = computed(() => formatPersonLabel(props.employeeNo, props.fullName))
const activeCard = computed(() => props.cards[activeCardIndex.value] ?? null)

const handleClose = () => emit("update:modelValue", false)

const regenerateQr = async () => {
	const card = activeCard.value
	qrDataUrl.value = null
	errorMessage.value = null
	if (!card?.cardNo.trim()) {
		errorMessage.value = "無有效卡號"
		return
	}
	isGenerating.value = true
	try {
		qrDataUrl.value = await buildCardQrDataUrl(card.cardNo)
	} catch {
		errorMessage.value = "產生二維碼失敗"
	} finally {
		isGenerating.value = false
	}
}

watch(
	() => [props.modelValue, activeCardIndex.value] as const,
	([open], oldValue) => {
		if (!open) {
			activeCardIndex.value = 0
			qrDataUrl.value = null
			errorMessage.value = null
			return
		}
		if (!oldValue?.[0]) activeCardIndex.value = 0
		regenerateQr()
	},
	{ immediate: true },
)

const handleDownload = () => {
	const card = activeCard.value
	if (!card || !qrDataUrl.value) return
	const cardIndex = props.cards.length > 1 ? activeCardIndex.value + 1 : undefined
	downloadCardQrImage(qrDataUrl.value, buildCardQrFileName(props.employeeNo, card.cardNo, cardIndex))
}
</script>
