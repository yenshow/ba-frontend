<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(5,24,40,0.85)] backdrop-blur-[10px]"
			>
				<div
					class="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-[rgba(9,106,133,0.95)] to-[rgba(20,64,92,0.98)] p-6 text-white shadow-2xl"
				>
					<header class="mb-4 flex items-center justify-between">
						<h3 class="text-base font-semibold tracking-[3px] 2xl:text-lg">
							新增人員（{{ roleLabel }}）
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.5rem] leading-none text-white/90 hover:opacity-80"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<form class="space-y-3" @submit.prevent="handleSubmit">
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>員工編號 (employeeNo) *</span>
							<input
								v-model="employeeNo"
								type="text"
								required
								class="form-input-small"
								placeholder="例如：123456"
							/>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>姓名</span>
							<input v-model="name" type="text" class="form-input-small" placeholder="例如：測試人員" />
						</label>

						<p v-if="errorMessage" class="text-sm text-rose-300">{{ errorMessage }}</p>

						<div class="flex items-center gap-3 pt-2">
							<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="handleClose">
								取消
							</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary text-sm 2xl:text-base" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : "建立" }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useAccessControlApi } from "~/composables/systems/useAccessControlApi";

interface Props {
	modelValue: boolean;
	deviceId?: number;
	roleLabel: string;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "created"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const accessControlApi = useAccessControlApi();

const employeeNo = ref("");
const name = ref("");
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

watch(
	() => props.modelValue,
	(isOpen) => {
		if (!isOpen) return;
		employeeNo.value = "";
		name.value = "";
		errorMessage.value = null;
		isSubmitting.value = false;
	},
	{ immediate: true }
);

const handleClose = () => {
	emit("update:modelValue", false);
};

const handleSubmit = async () => {
	if (isSubmitting.value) return;
	errorMessage.value = null;

	if (!props.deviceId) {
		errorMessage.value = "請先選擇設備";
		return;
	}
	const emp = employeeNo.value.trim();
	if (!emp) {
		errorMessage.value = "請輸入員工編號";
		return;
	}

	isSubmitting.value = true;
	try {
		await accessControlApi.updateUserInfo(props.deviceId, {
			employeeNo: emp,
			name: name.value.trim() || undefined,
		});
		emit("created");
		emit("update:modelValue", false);
	} catch (e) {
		errorMessage.value = e instanceof Error ? e.message : String(e);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

