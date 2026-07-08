<template>
	<div class="group flex h-full min-h-0 flex-col">
		<!-- 建物主視：可捲動 -->
		<div class="relative flex-1 min-h-0 w-full px-6 py-4 2xl:px-12 2xl:py-6">
			<div class="group relative h-full w-full overflow-hidden rounded-3xl">
				<img
					v-if="buildingDisplaySrc"
					:src="buildingDisplaySrc"
					alt="建物主視"
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<div
					v-else
					class="absolute inset-0 flex items-center justify-center bg-white/5 text-sm text-white/70"
				>
					尚未設定建物主視
				</div>

				<PermissionActionButton
					:allowed="canWrite"
					aria-label="編輯建物主視"
					class="absolute right-3 top-3 rounded-full bg-black/30 px-3 py-1 text-sm text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/50 2xl:text-base"
					@click="isBuildingEditOpen = true"
				>
					編輯
				</PermissionActionButton>
			</div>
		</div>

		<!-- 建物品牌：固定高度 -->
		<div class="relative w-full px-6 pb-4 2xl:px-12 2xl:pb-6">
			<div class="group relative h-[96px] w-full overflow-hidden rounded-2xl 2xl:h-[112px]">
				<img
					v-if="brandDisplaySrc"
					:src="brandDisplaySrc"
					alt="建物品牌"
					class="absolute inset-0 h-full w-full object-contain"
				/>
				<div
					v-else
					class="absolute inset-0 flex items-center justify-center bg-white/5 text-sm text-white/70"
				>
					尚未設定建物品牌圖
				</div>

				<PermissionActionButton
					:allowed="canWrite"
					aria-label="編輯建物品牌圖"
					class="absolute right-3 top-3 rounded-full bg-black/30 px-3 py-1 text-sm text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/50 2xl:text-base"
					@click="isBrandEditOpen = true"
				>
					編輯
				</PermissionActionButton>
			</div>
		</div>

		<EditMockDialog
			v-model="isBuildingEditOpen"
			title="編輯建物主視"
			:value="buildingRaw"
			input-mode="image"
			:crop-aspect-ratio="HOME_IMAGE_CROP.centralBuildingMain"
			placeholder="例如：https://... 或上傳圖片"
			preview-alt="建物主視預覽"
			:hint="IMAGE_UPLOAD_HINT"
			@save="saveBuildingRaw"
			@reset="resetBuildingRaw"
			@upload="uploadBuilding"
		/>

		<EditMockDialog
			v-model="isBrandEditOpen"
			title="編輯建物品牌圖"
			:value="brandRaw"
			input-mode="image"
			:crop-aspect-ratio="HOME_IMAGE_CROP.centralBuildingBrand"
			placeholder="例如：https://... 或上傳圖片"
			preview-alt="建物品牌圖預覽"
			:hint="IMAGE_UPLOAD_HINT"
			@save="saveBrandRaw"
			@reset="resetBrandRaw"
			@upload="uploadBrand"
		/>
	</div>
</template>

<script setup lang="ts">
import EditMockDialog from "~/components/common/EditMockDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useHomeRbac } from "~/composables/core/useAccessGate"
import { IMAGE_UPLOAD_HINT, useAppSettingImage } from "~/composables/core/useAppSettings"
import { HOME_IMAGE_CROP } from "~/utils/imageCropUtils"

const { canWrite } = useHomeRbac()

const {
	raw: buildingRaw,
	displaySrc: buildingDisplaySrc,
	save: saveBuildingRaw,
	reset: resetBuildingRaw,
	isEditOpen: isBuildingEditOpen,
	handleUpload: uploadBuilding,
} = useAppSettingImage({
	key: "home_building_card_image",
	uploadPrefix: "home-building",
	defaultExt: "jpg",
	defaultValue: "",
})

const {
	raw: brandRaw,
	displaySrc: brandDisplaySrc,
	save: saveBrandRaw,
	reset: resetBrandRaw,
	isEditOpen: isBrandEditOpen,
	handleUpload: uploadBrand,
} = useAppSettingImage({
	key: "home_building_card_brand_image",
	uploadPrefix: "home-building-brand",
	defaultExt: "png",
	defaultValue: "",
})
</script>
