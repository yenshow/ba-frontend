<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">地點管理</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="floor && pendingFloor" :key="`floor-${floor.id}`">
									<div class="space-y-3">
										<!-- 樓層基本資訊 -->
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<div class="flex items-center gap-3 border-b border-white/10 pb-3">
												<span class="text-base font-medium 2xl:text-lg">樓層名稱</span>
												<input
													:value="pendingFloor.name"
													type="text"
													required
													class="form-input-small flex-1"
													placeholder="例如：1F、2F"
													@input="updateFloorName(($event.target as HTMLInputElement).value)"
												/>
												<input
													:ref="
														el => {
															if (el) fileInputRef = el as HTMLInputElement;
														}
													"
													type="file"
													accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
													class="hidden"
													@change="handleFloorImageChange"
												/>
												<button
													v-if="pendingFloor.imageUrl"
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click.stop="viewFloorImage(pendingFloor.imageUrl)"
												>
													查看示意圖
												</button>
												<button
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click.stop="triggerFloorImageInput"
												>
													{{ pendingFloor.imageUrl ? "更換" : "上傳" }}示意圖
												</button>
												<button
													v-if="pendingFloor.imageUrl"
													type="button"
													class="p-2 text-rose-400 transition-colors hover:text-rose-300"
													@click.stop="removeFloorImage"
													title="移除圖片"
												>
													<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
											</div>
										</div>

										<!-- 地點列表 -->
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<div class="flex items-center justify-between mb-3">
												<span class="text-base font-medium 2xl:text-lg">地點列表</span>
												<button
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click="addLocation"
												>
													新增地點
												</button>
											</div>

											<!-- 地點項目 -->
											<div
												v-if="!pendingFloor.locations || pendingFloor.locations.length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無地點，請新增地點
											</div>
											<div v-else class="space-y-2">
												<div
													v-for="(location, locationIndex) in pendingFloor.locations"
													:key="location.id || `location-${locationIndex}`"
													class="flex min-w-0 items-end gap-2 rounded border border-white/10 bg-white/5 p-2"
												>
													<label
														class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>地點名稱 *</span>
														<input
															v-model="location.name"
															type="text"
															required
														class="form-input-small"
														placeholder="例如：主控室"
													/>
													</label>
													<label
														class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>描述</span>
														<input
															v-model="location.description"
															type="text"
															class="form-input-small"
															placeholder="地點描述"
														/>
													</label>
													<button
														type="button"
														class="ml-auto flex-shrink-0 p-2 text-rose-400 transition-colors hover:text-rose-300"
														@click="removeLocation(locationIndex)"
														title="刪除地點"
													>
														<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												</div>
											</div>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無樓層資料</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="pr-7 text-base text-rose-300 2xl:pr-8 2xl:text-lg">
						{{ errorMessage }}
					</p>
					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges }"
							:disabled="!hasUnsavedChanges"
							@click="saveChanges"
						>
							儲存變更
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { UnifiedFloor, UnifiedLocation } from "~/types/location";

interface Props {
	modelValue: boolean;
	floor: UnifiedFloor | null;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", floor: UnifiedFloor): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const errorMessage = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingFloor = ref<UnifiedFloor | null>(null);

// 檢查是否有未保存的變更
const hasUnsavedChanges = computed(() => {
	if (!pendingFloor.value || !props.floor) return false;
	// 比較關鍵欄位
	return (
		pendingFloor.value.name !== props.floor.name ||
		pendingFloor.value.imageUrl !== props.floor.imageUrl ||
		JSON.stringify(pendingFloor.value.locations) !== JSON.stringify(props.floor.locations)
	);
});

// 監聽 floor 變化，初始化 pendingFloor
watch(
	() => props.floor,
	newFloor => {
		if (newFloor) {
			pendingFloor.value = JSON.parse(JSON.stringify(newFloor));
		}
	},
	{ immediate: true, deep: true }
);

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		if (!confirm("您有未保存的變更，確定要關閉嗎？未保存的變更將會遺失。")) {
			return;
		}
	}
	emit("update:modelValue", false);
	errorMessage.value = "";
	// 重置 pendingFloor
	if (props.floor) {
		pendingFloor.value = JSON.parse(JSON.stringify(props.floor));
	}
};

const updateFloorName = (newName: string) => {
	if (!pendingFloor.value) return;
	pendingFloor.value.name = newName.trim();
};

const triggerFloorImageInput = () => {
	fileInputRef.value?.click();
};

const handleFloorImageChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (!target.files?.[0] || !pendingFloor.value) return;

	processFloorImageFile(target.files[0]);
	target.value = "";
};

const processFloorImageFile = (file: File) => {
	if (!pendingFloor.value) return;

	const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
	if (!validTypes.includes(file.type)) {
		errorMessage.value = "不支援的檔案格式，請上傳 PNG、JPG、GIF 或 WEBP 格式的圖片";
		return;
	}

	const maxSize = 10 * 1024 * 1024;
	if (file.size > maxSize) {
		errorMessage.value = "檔案大小超過 10MB，請選擇較小的圖片";
		return;
	}

	const reader = new FileReader();
	reader.onload = e => {
		const result = e.target?.result as string;
		if (result && pendingFloor.value) {
			pendingFloor.value.imageUrl = result;
			errorMessage.value = "";
		}
	};
	reader.onerror = () => {
		errorMessage.value = "讀取檔案失敗，請稍後再試";
	};
	reader.readAsDataURL(file);
};

const removeFloorImage = () => {
	if (!pendingFloor.value) return;
	pendingFloor.value.imageUrl = undefined;
};

const viewFloorImage = (imageUrl: string) => {
	if (!imageUrl) return;
	const newWindow = window.open();
	if (newWindow) {
		newWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>樓層示意圖</title>
					<style>
						body {
							margin: 0;
							padding: 20px;
							background: #1a1a1a;
							display: flex;
							justify-content: center;
							align-items: center;
							min-height: 100vh;
						}
						img {
							max-width: 100%;
							max-height: 100vh;
							object-fit: contain;
						}
					</style>
				</head>
				<body>
					<img src="${imageUrl}" alt="樓層示意圖" />
				</body>
			</html>
		`);
	}
};

const addLocation = () => {
	if (!pendingFloor.value) return;
	const newLocation: Omit<UnifiedLocation, "id" | "floorId"> = {
		name: "",
		description: "",
		systems: []
	};
	pendingFloor.value.locations = [...(pendingFloor.value.locations || []), newLocation as UnifiedLocation];
};

const removeLocation = (locationIndex: number) => {
	if (!pendingFloor.value || !confirm("確定要刪除此地點嗎？")) return;
	pendingFloor.value.locations = pendingFloor.value.locations.filter((_, index) => index !== locationIndex);
};


const saveChanges = () => {
	if (!pendingFloor.value || !hasUnsavedChanges.value) return;
	// 過濾掉名稱為空的地點
	const filteredFloor = {
		...pendingFloor.value,
		locations: (pendingFloor.value.locations || []).filter(
			loc => loc.name && loc.name.trim().length > 0
		)
	};
	emit("save", filteredFloor);
	errorMessage.value = "";
	// 更新 pendingFloor 以反映已保存的狀態
	if (props.floor) {
		pendingFloor.value = JSON.parse(JSON.stringify(filteredFloor));
	}
};
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

.btn-primary,
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 1rem;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-primary {
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}

.form-input-small {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition: border-color 0.2s ease, background 0.2s ease;
}

.form-input-small:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-input-small::placeholder {
	color: rgba(255, 255, 255, 0.5);
}
</style>

