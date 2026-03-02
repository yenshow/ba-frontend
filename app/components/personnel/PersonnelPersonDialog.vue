<template>
	<Teleport to="body">
		<Transition name="personnel-dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
			>
				<div
					class="personnel-dialog-panel show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							{{ editingPerson ? "編輯人員" : "新增人員" }}
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
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>工號 *</span>
							<input
								v-model="form.employeeNo"
								type="text"
								required
								class="personnel-form-input"
								:readonly="!!editingPerson"
							/>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>姓名</span>
							<input v-model="form.fullName" type="text" class="personnel-form-input" />
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>群組</span>
							<select v-model="form.personGroupId" class="personnel-form-input personnel-form-select">
								<option :value="null">未指定</option>
								<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
							</select>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>大頭照</span>
							<div class="flex flex-wrap items-center gap-3">
								<div
									class="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 2xl:h-24 2xl:w-24"
								>
									<img
										v-if="facePreviewUrl"
										:src="facePreviewUrl"
										alt="大頭照預覽"
										class="h-full w-full object-cover"
									/>
									<div
										v-else
										class="flex h-full w-full items-center justify-center text-2xl text-white/40"
										aria-hidden="true"
									>
										?
									</div>
								</div>
								<div class="flex flex-col gap-1">
									<input
										ref="faceFileInputRef"
										type="file"
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
										class="hidden"
										aria-label="選擇大頭照"
										@change="handleFaceFileChange"
									/>
									<button
										type="button"
										class="rounded-lg bg-white/20 px-3 py-2 text-sm text-white hover:bg-white/30"
										@click="triggerFaceFileSelect"
									>
										上傳圖片
									</button>
									<button
										v-if="hasFacePreview"
										type="button"
										class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20"
										@click="handleClearFace"
									>
										清除
									</button>
								</div>
							</div>
						</label>
						<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base">
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									v-model="form.status"
									type="checkbox"
									value="active"
									true-value="active"
									false-value="inactive"
									class="peer sr-only"
									aria-label="狀態：已啟用或已停用"
								/>
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									form.status === "active" ? "已啟用" : "已停用"
								}}</span>
							</label>
						</label>
						<p v-if="errorMessage" class="text-sm text-rose-300">{{ errorMessage }}</p>
						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="personnel-btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="personnel-btn-primary" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : editingPerson ? "更新" : "建立" }}
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

const props = defineProps<{
	modelValue: boolean
	editingPerson: Person | null
	form: {
		employeeNo: string
		fullName: string
		personGroupId: number | null
		status: "active" | "inactive"
		faceUrl: string
	}
	groups: PersonGroup[]
	facePreviewUrl: string | null
	hasFacePreview: boolean
	isSubmitting: boolean
	errorMessage: string | null
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	submit: []
	"face-file-change": [file: File]
	"clear-face": []
}>()

const faceFileInputRef = ref<HTMLInputElement | null>(null)

const handleClose = () => emit("update:modelValue", false)
const handleSubmit = () => emit("submit")
const triggerFaceFileSelect = () => faceFileInputRef.value?.click()

const handleFaceFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	const file = input.files?.[0]
	if (file) emit("face-file-change", file)
	input.value = ""
}

const handleClearFace = () => emit("clear-face")

watch(
	() => props.modelValue,
	(v) => {
		if (!v && faceFileInputRef.value) faceFileInputRef.value.value = ""
	}
)
</script>
