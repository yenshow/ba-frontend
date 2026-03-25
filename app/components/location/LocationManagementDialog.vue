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
						<div class="flex items-center gap-3">
							<!-- 變更提示 -->
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
							<!-- ✅ 新增刪除按鈕 -->
							<button
								v-if="zone && zone.id"
								type="button"
								class="p-2 text-rose-400 transition-colors hover:text-rose-300"
								@click="handleDeleteZone"
								title="刪除區域"
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
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="zone && pendingZone" :key="`zone-${zone.id}`">
									<div class="space-y-3">
										<!-- 區域基本資訊 -->
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<div class="flex items-center gap-3 border-b border-white/10 pb-3">
												<span class="text-base font-medium 2xl:text-lg">區域名稱</span>
												<input
													:value="pendingZone.name"
													type="text"
													required
													class="form-input-small flex-1"
													placeholder="例如：1F、2F"
													@input="updateZoneName(($event.target as HTMLInputElement).value)"
												/>
												<input
													ref="fileInputRef"
													type="file"
													accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
													class="hidden"
													@change="handleZoneImageChange"
												/>
												<button
													v-if="pendingZone.imageUrl"
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click.stop="viewZoneImage(pendingZone.imageUrl)"
												>
													查看示意圖
												</button>
												<button
													type="button"
													class="btn-secondary text-sm 2xl:text-base"
													@click.stop="triggerZoneImageInput"
												>
													{{ pendingZone.imageUrl ? "更換" : "上傳" }}示意圖
												</button>
												<button
													v-if="pendingZone.imageUrl"
													type="button"
													class="p-2 text-rose-400 transition-colors hover:text-rose-300"
													@click.stop="removeZoneImage"
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
											<div class="mb-3 flex items-center justify-between">
												<span class="text-base font-medium 2xl:text-lg">地點列表</span>
												<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="addLocation">
													新增地點
												</button>
											</div>

											<!-- 地點項目 -->
											<div
												v-if="!pendingZone.locations || pendingZone.locations.length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無地點，請新增地點
											</div>
											<div v-else class="space-y-2">
												<div
													v-for="(location, locationIndex) in pendingZone.locations"
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
														<span>所屬系統</span>
														<div class="form-input-small flex cursor-default items-center text-white/70">
															{{ getLocationSystemsLabel(location) || "無系統" }}
														</div>
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
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
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

	<!-- 確認對話框 -->
	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="
			confirmAction === 'delete'
				? handleConfirmDelete()
				: confirmAction === 'deleteLocation'
					? handleConfirmDeleteLocation()
					: handleConfirmClose()
		"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

interface Props {
	modelValue: boolean;
	zone: UnifiedZone | null;
	/** 可選：提供時刪除地點僅移除此系統 */
	systemType?: SystemType;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", zone: UnifiedZone): void;
	(e: "delete", zoneId: string): void; // ✅ 新增刪除事件
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const errorMessage = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingZone = ref<UnifiedZone | null>(null);

const locationApi = useLocationApi();
const { handleError } = useErrorHandler();

// 檢查是否有未保存的變更
const hasUnsavedChanges = computed(() => {
	if (!pendingZone.value || !props.zone) return false;
	// 比較關鍵欄位
	return (
		pendingZone.value.name !== props.zone.name ||
		pendingZone.value.imageUrl !== props.zone.imageUrl ||
		JSON.stringify(pendingZone.value.locations) !== JSON.stringify(props.zone.locations)
	);
});

// 計算變更的欄位列表
const changedFieldsList = computed(() => {
	if (!pendingZone.value || !props.zone) return [];
	const fields: string[] = [];

	if (pendingZone.value.name !== props.zone.name) {
		fields.push(`區域名稱: ${props.zone.name} → ${pendingZone.value.name}`);
	}
	if (pendingZone.value.imageUrl !== props.zone.imageUrl) {
		fields.push("區域示意圖");
	}
	if (JSON.stringify(pendingZone.value.locations) !== JSON.stringify(props.zone.locations)) {
		fields.push("地點列表");
	}

	return fields;
});

// 變更摘要訊息
const changeSummary = computed(() => {
	const count = changedFieldsList.value.length;
	if (count === 0) return "";
	return `有 ${count} 個欄位已修改`;
});

// 確認對話框
const confirmDialog = useConfirmDialog();
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close");
const pendingDeleteLocationIndex = ref<number | null>(null);

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});

const confirmDialogConfig = computed(() => confirmDialog.config.value);

// 監聽 zone 變化，初始化 pendingZone
watch(
	() => props.zone,
	newZone => {
		if (newZone) {
			pendingZone.value = JSON.parse(JSON.stringify(newZone));
		}
	},
	{ immediate: true, deep: true }
);

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		confirmAction.value = "close";
		confirmDialog.show({
			title: "確認關閉",
			message: "您有未保存的變更，確定要關閉嗎？",
			details: "未保存的變更將會遺失。",
			type: "warning"
		});
		return;
	}
	closeDialog();
};

// 關閉對話框（清除狀態）
const closeDialog = () => {
	emit("update:modelValue", false);
	errorMessage.value = "";
	// 重置 pendingZone
	if (props.zone) {
		pendingZone.value = JSON.parse(JSON.stringify(props.zone));
	}
};

// 確認關閉
const handleConfirmClose = () => {
	closeDialog();
};

const updateZoneName = (newName: string) => {
	if (!pendingZone.value) return;
	pendingZone.value.name = newName.trim();
};

const triggerZoneImageInput = () => {
	fileInputRef.value?.click();
};

const handleZoneImageChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (!target.files?.[0] || !pendingZone.value) return;

	processZoneImageFile(target.files[0]);
	target.value = "";
};

const processZoneImageFile = (file: File) => {
	if (!pendingZone.value) return;

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
		if (result && pendingZone.value) {
			pendingZone.value.imageUrl = result;
			errorMessage.value = "";
		}
	};
	reader.onerror = () => {
		errorMessage.value = "讀取檔案失敗，請稍後再試";
	};
	reader.readAsDataURL(file);
};

const removeZoneImage = () => {
	if (!pendingZone.value) return;
	pendingZone.value.imageUrl = undefined;
};

const viewZoneImage = (imageUrl: string) => {
	if (!imageUrl) return;
	const newWindow = window.open();
	if (newWindow) {
		newWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>區域示意圖</title>
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
					<img src="${imageUrl}" alt="區域示意圖" />
				</body>
			</html>
		`);
	}
};

const addLocation = () => {
	if (!pendingZone.value) return;
	const newLocation: Omit<UnifiedLocation, "id" | "zoneId"> = {
		name: "",
		description: "",
		systems: []
	};
	pendingZone.value.locations = [
		newLocation as UnifiedLocation,
		...(pendingZone.value.locations || [])
	];
};

const removeLocation = (locationIndex: number) => {
	if (!pendingZone.value) return;
	pendingDeleteLocationIndex.value = locationIndex;
	confirmAction.value = "deleteLocation";
	const location = pendingZone.value.locations?.[locationIndex];
	const hasId = Boolean(location && (location as any).id);
	const systemCount = (location as any)?.systems?.length || 0;
	const onlyCurrentSystem = !props.systemType || systemCount <= 1;
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此地點嗎？",
		details: hasId
			? onlyCurrentSystem
				? "此操作將刪除此地點，且無法復原。"
				: "僅從本系統移除此地點，其他系統下的此地點不受影響。"
			: "此地點尚未儲存，將直接從清單移除。",
		type: "danger"
	});
};

// 確認刪除地點
const handleConfirmDeleteLocation = async () => {
	if (!pendingZone.value || pendingDeleteLocationIndex.value === null) return;

	const location = pendingZone.value.locations?.[pendingDeleteLocationIndex.value];
	const locationId = location && (location as any).id ? String((location as any).id) : null;

	if (locationId) {
		try {
			if (props.systemType) {
				const { location: fullLocation } = await locationApi.getLocation(locationId);
				const otherSystems = (fullLocation.systems || []).filter(
					(s: { systemType: string }) => s.systemType !== props.systemType
				);
				if (otherSystems.length === 0) {
					await locationApi.deleteLocation(locationId);
				} else {
					await locationApi.updateLocation(locationId, { systems: otherSystems });
				}
			} else {
				await locationApi.deleteLocation(locationId);
			}
		} catch (error) {
			handleError(error, "刪除地點失敗");
			pendingDeleteLocationIndex.value = null;
			return;
		}
	}

	pendingZone.value.locations = pendingZone.value.locations.filter(
		(_, index) => index !== pendingDeleteLocationIndex.value
	);
	pendingDeleteLocationIndex.value = null;
};

// 刪除區域
const handleDeleteZone = () => {
	if (!props.zone || !props.zone.id) return;

	confirmAction.value = "delete";
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此區域嗎？",
		details: "此操作將刪除該區域的所有地點資料，且無法復原。",
		type: "danger"
	});
};

// 確認刪除區域
const handleConfirmDelete = () => {
	if (props.zone && props.zone.id) {
		emit("delete", props.zone.id);
	}
};

// 系統類型標籤映射
const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	drainage: "衛生排水",
	people_counting: "人流統計",
	vehicle_access: "車輛進出"
};

// 取得地點的所屬系統標籤
const getLocationSystemsLabel = (location: UnifiedLocation): string => {
	if (!location.systems || location.systems.length === 0) {
		return "";
	}
	return location.systems
		.map(system => SYSTEM_TYPE_LABELS[system.systemType] || system.systemType)
		.join("、");
};

const saveChanges = async () => {
	if (!pendingZone.value || !hasUnsavedChanges.value) return;

	// 過濾掉名稱為空或無系統的地點
	const filteredZone = {
		...pendingZone.value,
		locations: (pendingZone.value.locations || []).filter(
			loc => loc.name && loc.name.trim().length > 0 && loc.systems && loc.systems.length > 0
		)
	};
	emit("save", filteredZone);
	errorMessage.value = "";
	// 更新 pendingZone 以反映已保存的狀態
	if (props.zone) {
		pendingZone.value = JSON.parse(JSON.stringify(filteredZone));
	}
};
</script>

<style scoped>
</style>
