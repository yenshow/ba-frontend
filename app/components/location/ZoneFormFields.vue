<template>
	<div class="flex items-center gap-3 border-b border-white/10 pb-3">
		<span class="text-base font-medium text-white/80 2xl:text-lg whitespace-nowrap">區域名稱</span>
		<input
			:value="zone.name"
			type="text"
			required
			class="form-input-small flex-1 min-w-0"
			placeholder="例如：1F、2F"
			@input="updateName(($event.target as HTMLInputElement).value)"
		/>

		<!-- 示意圖上傳（可選） -->
		<template v-if="requireImageUrl">
			<input
				ref="fileInputRef"
				type="file"
				accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
				class="hidden"
				@change="handleImageChange"
			/>
			<div class="flex items-center gap-2 flex-shrink-0">
				<button
					v-if="zone.imageUrl"
					type="button"
					class="btn-secondary text-sm 2xl:text-base whitespace-nowrap"
					@click.stop="viewImage(zone.imageUrl)"
				>
					查看示意圖
				</button>
				<button
					type="button"
					class="btn-secondary text-sm 2xl:text-base whitespace-nowrap"
					@click.stop="triggerImageInput"
				>
					{{ zone.imageUrl ? "更換" : "上傳" }}示意圖
				</button>
				<button
					v-if="zone.imageUrl"
					type="button"
					class="p-2 text-rose-400 transition-colors hover:text-rose-300 flex-shrink-0"
					@click.stop="removeImage"
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
		</template>
	</div>
</template>

<script setup lang="ts">
import type { UnifiedZone } from "~/types/location";
import { useZoneValidation } from "~/composables/systems/useZoneValidation";

interface Props {
	zone: UnifiedZone;
	requireImageUrl?: boolean;
}

interface Emits {
	(e: "update", zone: Partial<UnifiedZone>): void;
}

const props = withDefaults(defineProps<Props>(), {
	requireImageUrl: false
});

const emit = defineEmits<Emits>();

const { validateZoneName, validateZoneImage } = useZoneValidation();

const fileInputRef = ref<HTMLInputElement | null>(null);
const errorMessage = ref("");

// 更新區域名稱
const updateName = (newName: string) => {
	const error = validateZoneName(newName);
	if (error) {
		errorMessage.value = error;
		return;
	}
	errorMessage.value = "";
	emit("update", { name: newName.trim() });
};

// 觸發圖片輸入
const triggerImageInput = () => {
	fileInputRef.value?.click();
};

// 處理圖片變更
const handleImageChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (!target.files?.[0]) return;

	const file = target.files[0];
	const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
	if (!validTypes.includes(file.type)) {
		errorMessage.value = "不支援的檔案格式，請上傳 PNG、JPG、GIF 或 WEBP 格式的圖片";
		return;
	}

	const maxSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxSize) {
		errorMessage.value = "檔案大小超過 10MB，請選擇較小的圖片";
		return;
	}

	const reader = new FileReader();
	reader.onload = e => {
		const result = e.target?.result as string;
		if (result) {
			const error = validateZoneImage(result);
			if (error) {
				errorMessage.value = error;
				return;
			}
			errorMessage.value = "";
			emit("update", { imageUrl: result });
		}
	};
	reader.onerror = () => {
		errorMessage.value = "讀取檔案失敗，請稍後再試";
	};
	reader.readAsDataURL(file);
	target.value = "";
};

// 移除圖片
const removeImage = () => {
	emit("update", { imageUrl: undefined });
};

// 查看圖片
const viewImage = (imageUrl: string) => {
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
</script>