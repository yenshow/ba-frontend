<template>
	<div class="border-b border-white/10 pb-3">
		<div class="flex items-center gap-3">
		<span class="whitespace-nowrap text-base font-medium text-white/80 2xl:text-lg">區域名稱</span>
		<input
			v-model="localName"
			type="text"
			required
			class="form-input-small min-w-0 flex-1 text-sm 2xl:text-base"
			placeholder="例如：1F、2F"
			:readonly="readOnly"
			@input="handleNameInput"
		/>

		<!-- 示意圖上傳（可選） -->
		<template v-if="requireImageUrl">
			<input
				ref="fileInputRef"
				type="file"
				:accept="ZONE_IMAGE_ACCEPT_ATTR"
				class="hidden"
				@change="handleZoneImageChange"
			/>
			<div class="flex items-center gap-2 flex-shrink-0">
				<button
					v-if="zone.imageUrl"
					type="button"
					class="btn-secondary text-sm 2xl:text-base whitespace-nowrap"
					@click.stop="openPreviewWindow(zone.imageUrl, '區域示意圖')"
				>
					查看示意圖
				</button>
				<template v-if="!readOnly">
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
				</template>
			</div>
		</template>
		</div>
		<p v-if="errorMessage" class="form-error-text-inline">{{ errorMessage }}</p>
	</div>
</template>

<script setup lang="ts">
import type { UnifiedZone } from "~/types/location";
import { useZoneValidation } from "~/composables/location/validation/useBaseValidation";
import { ZONE_IMAGE_ACCEPT_ATTR } from "~/composables/location/validation/useBaseValidation";
import { useZoneImageUpload } from "~/composables/location/ui/useZoneImage";
import { useImageCenter } from "~/composables/core/useImageCenter";

interface Props {
	zone: UnifiedZone;
	requireImageUrl?: boolean;
	readOnly?: boolean;
}

interface Emits {
	(e: "update", zone: Partial<UnifiedZone>): void;
}

const props = withDefaults(defineProps<Props>(), {
	requireImageUrl: false,
	readOnly: false,
});

const emit = defineEmits<Emits>();

const { openPreviewWindow } = useImageCenter();

const { validateZoneName } = useZoneValidation();
const errorMessage = ref("");
const localName = ref(props.zone.name ?? "");

watch(
	() => props.zone.name,
	(name) => {
		localName.value = name ?? "";
	}
);

const { fileInputRef, triggerImageInput, handleZoneImageChange } = useZoneImageUpload({
	onImageReady: (imageUrl) => {
		errorMessage.value = "";
		emit("update", { imageUrl });
	},
	onError: (message) => {
		errorMessage.value = message;
	}
});

// 更新區域名稱（允許編輯中暫時為空，僅顯示提示、不阻擋輸入）
const handleNameInput = () => {
	if (props.readOnly) return;
	errorMessage.value = validateZoneName(localName.value) ?? "";
	emit("update", { name: localName.value.trim() });
};

// 移除圖片
const removeImage = () => {
	emit("update", { imageUrl: undefined });
};

</script>