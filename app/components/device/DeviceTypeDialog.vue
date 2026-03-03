<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl pl-7 pr-0 pt-7 pb-7 2xl:max-w-3xl 2xl:gap-6 2xl:pl-8 2xl:pr-0 2xl:pt-8 2xl:pb-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							設備類型管理
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="deviceTypes.length > 0" :key="`types-${deviceTypes.length}`">
									<div class="space-y-3">
										<div
											v-for="type in deviceTypes"
											:key="type.id"
											class="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-4 transition-colors hover:bg-white/15"
										>
											<div class="flex-1">
												<div class="flex items-center gap-3">
													<h4 class="text-base font-medium text-white 2xl:text-lg">{{ type.name }}</h4>
													<span
														class="rounded bg-white/20 px-2 py-1 text-xs text-white/80 2xl:text-sm"
														>{{ type.code }}</span
													>
												</div>
												<p v-if="type.description" class="mt-1 text-sm text-white/60 2xl:text-base">
													{{ type.description }}
												</p>
											</div>
											<div class="flex gap-2 2xl:gap-3">
												<button
													type="button"
													class="btn-list-edit"
													@click="editDeviceType(type)"
												>
													編輯
												</button>
												<button
													type="button"
													class="btn-list-delete"
													@click="confirmDelete(type)"
												>
													刪除
												</button>
											</div>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無設備類型</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增類型」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="text-sm text-rose-300 pr-7 2xl:text-base 2xl:pr-8">{{ errorMessage }}</p>
					<footer class="flex items-center gap-3 border-t border-white/20 pt-4 pr-7 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-primary" @click="showForm = true">新增類型</button>
					</footer>
				</div>

				<Transition name="dialog-fade">
					<div
						v-if="showForm"
						class="fixed inset-0 z-[2001] flex items-center justify-center bg-[rgba(5,24,40,0.9)] backdrop-blur-[10px]"
					>
						<div
							class="dialog-panel-bg flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl pl-7 pr-0 pt-7 pb-7 2xl:max-w-lg 2xl:gap-6 2xl:pl-8 2xl:pr-0 2xl:pt-8 2xl:pb-8"
						>
							<header class="flex items-center justify-between pr-7 2xl:pr-8">
								<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
									{{ editingType ? "編輯設備類型" : "新增設備類型" }}
								</h3>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
									aria-label="關閉表單"
									@click="closeForm"
								>
									&times;
								</button>
							</header>

							<form
								@submit.prevent="handleSubmit"
								class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
							>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>類型名稱 *</span>
										<input
											v-model="formData.name"
											type="text"
											required
											class="form-input"
											placeholder="例如：Modbus 控制器"
										/>
									</label>
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
										<span>類型代碼 *</span>
										<input
											v-model="formData.code"
											type="text"
											required
											:disabled="!!editingType"
											class="form-input"
											placeholder="例如：modbus"
										/>
										<p v-if="editingType" class="mt-1 text-xs text-white/60">
											類型代碼無法修改
										</p>
									</label>
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
										<span>描述</span>
										<textarea
											v-model="formData.description"
											rows="3"
											class="form-input"
											placeholder="設備類型的詳細描述（選填）"
										></textarea>
									</label>

								<p v-if="errorMessage" class="text-sm text-rose-300 2xl:text-base">
									{{ errorMessage }}
								</p>
							</form>

							<footer class="flex items-center gap-3 pr-7 2xl:gap-4 2xl:pr-8">
								<button
									type="button"
									class="btn-secondary"
									@click="closeForm"
									:disabled="isSubmitting"
								>
									取消
								</button>
								<div class="flex-1"></div>
								<button type="button" class="btn-primary" :disabled="isSubmitting" @click="handleSubmit">
									{{ isSubmitting ? "處理中..." : editingType ? "更新" : "建立" }}
								</button>
							</footer>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>

	<!-- 確認對話框 -->
	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="handleConfirmDelete"
	/>
</template>

<script setup lang="ts">
import type { DeviceType } from "~/types/device";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useToast } from "~/composables/core/useToast";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";

const props = defineProps<{
	modelValue: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	close: [];
	refresh: [];
}>();

const deviceApi = useDeviceApi();
const toast = useToast();

const deviceTypes = ref<DeviceType[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const showForm = ref(false);
const editingType = ref<DeviceType | null>(null);
const isSubmitting = ref(false);

const formData = ref({ name: "", code: "", description: "" });

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};

const handleError = (error: unknown, defaultMsg: string) => {
	const errorMsg = error instanceof Error ? error.message : defaultMsg;
	errorMessage.value = errorMsg;
	toast.error(errorMsg);
};

const loadDeviceTypes = async (force = false) => {
	isLoading.value = true;
	errorMessage.value = null;
	try {
		deviceTypes.value = await deviceApi.getDeviceTypes(force);
	} catch (error) {
		handleError(error, "載入設備類型失敗");
	} finally {
		isLoading.value = false;
	}
};

const editDeviceType = (type: DeviceType) => {
	editingType.value = type;
	formData.value = { name: type.name, code: type.code, description: type.description || "" };
	showForm.value = true;
};

// 確認對話框
const confirmDialog = useConfirmDialog();
const pendingDeleteType = ref<DeviceType | null>(null);

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});

const confirmDialogConfig = computed(() => confirmDialog.config.value);

const confirmDelete = (type: DeviceType) => {
	pendingDeleteType.value = type;
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除設備類型 "${type.name}" 嗎？`,
		details: "注意：如果仍有設備使用此類型，將無法刪除。",
		type: "danger"
	});
};

const refreshListAndNotify = async () => {
	await loadDeviceTypes(true);
	emit("refresh");
};

const handleConfirmDelete = async () => {
	if (!pendingDeleteType.value) return;

	try {
		await deviceApi.deleteDeviceType(pendingDeleteType.value.id);
		toast.success(`設備類型 "${pendingDeleteType.value.name}" 已刪除`);
		await refreshListAndNotify();
		pendingDeleteType.value = null;
	} catch (error) {
		handleError(error, "刪除設備類型失敗");
	}
};

const closeForm = () => {
	showForm.value = false;
	editingType.value = null;
	formData.value = { name: "", code: "", description: "" };
	errorMessage.value = null;
};

const handleSubmit = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingType.value) {
			await deviceApi.updateDeviceType(editingType.value.id, {
				name: formData.value.name,
				description: formData.value.description || undefined
			});
			toast.success("設備類型更新成功");
		} else {
			await deviceApi.createDeviceType({
				name: formData.value.name,
				code: formData.value.code,
				description: formData.value.description || undefined
			});
			toast.success("設備類型建立成功");
		}
		closeForm();
		await refreshListAndNotify();
	} catch (error) {
		handleError(error, "操作失敗");
	} finally {
		isSubmitting.value = false;
	}
};

watch(
	() => props.modelValue,
	newVal => newVal && loadDeviceTypes()
);
</script>

<style scoped>
.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}

.form-input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.form-input::placeholder {
	color: rgba(255, 255, 255, 0.5);
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}

.btn-list-edit,
.btn-list-delete {
	border-radius: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-list-edit {
	background: rgba(59, 130, 246, 0.8);
	color: white;
}

.btn-list-edit:hover {
	background: rgba(96, 165, 250, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-list-delete {
	background: rgba(239, 68, 68, 0.8);
	color: white;
}

.btn-list-delete:hover {
	background: rgba(248, 113, 113, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

@media (min-width: 1536px) {
	.btn-list-edit,
	.btn-list-delete {
		padding: 0.625rem 1.25rem;
		font-size: 1rem;
	}
}

</style>
