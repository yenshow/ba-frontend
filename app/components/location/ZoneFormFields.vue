<template>
	<div class="border-b border-white/10 pb-3">
		<div class="flex items-center gap-3">
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
					:accept="ZONE_IMAGE_ACCEPT_ATTR"
					class="hidden"
					@change="handleZoneImageChange"
				/>
				<div class="flex items-center gap-2 flex-shrink-0">
					<button
						v-if="zone.imageUrl"
						type="button"
						class="btn-secondary text-sm 2xl:text-base whitespace-nowrap"
						@click.stop="openZoneSchematicPreview(zone.imageUrl)"
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
		<p v-if="errorMessage" class="mt-2 text-sm text-rose-300 2xl:text-base">{{ errorMessage }}</p>
	</div>
</template>

<script setup lang="ts">
import type { UnifiedZone } from "~/types/location";
import { ZONE_IMAGE_ACCEPT_ATTR } from "~/constants/zoneImage";
import { useZoneValidation } from "~/composables/location/validation/useZoneValidation";
import { useZoneImageUpload } from "~/composables/location/ui/useZoneImageUpload";
import { openZoneSchematicPreview } from "~/composables/location/ui/useZoneImagePreview";

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

const { validateZoneName } = useZoneValidation();
const errorMessage = ref("");

const { fileInputRef, triggerImageInput, handleZoneImageChange } = useZoneImageUpload({
	onImageReady: (imageUrl) => {
		errorMessage.value = ""
		emit("update", { imageUrl })
	},
	onError: (message) => {
		errorMessage.value = message
	}
})

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

// 移除圖片
const removeImage = () => {
	emit("update", { imageUrl: undefined });
};
</script>