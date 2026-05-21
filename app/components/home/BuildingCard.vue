<template>
	<div class="group flex h-full min-h-0 flex-col">
		<!-- 建案主圖：占滿 -->
		<div class="relative flex-1 min-h-0 w-full px-6 py-4 2xl:px-12 2xl:py-6">
			<div class="relative h-full w-full overflow-hidden rounded-3xl">
				<img
					v-if="buildingDisplaySrc"
					:src="buildingDisplaySrc"
					alt="建案主圖"
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<div
					v-else
					class="absolute inset-0 flex items-center justify-center bg-white/5 text-sm text-white/70"
				>
					尚未設定建案主圖
				</div>

				<template v-if="canWrite">
					<button
						type="button"
						class="absolute right-3 top-3 hidden rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition hover:bg-black/50 group-hover:block 2xl:text-base"
						aria-label="編輯建案主圖"
						@click="isBuildingEditOpen = true"
						@keydown.enter="isBuildingEditOpen = true"
						@keydown.space.prevent="isBuildingEditOpen = true"
					>
						編輯
					</button>
				</template>
			</div>
		</div>

		<!-- 建案名稱：固定高度 -->
		<div class="relative w-full px-6 pb-4 2xl:px-12 2xl:pb-6">
			<div class="relative h-[96px] w-full overflow-hidden rounded-2xl 2xl:h-[112px]">
				<img
					v-if="brandDisplaySrc"
					:src="brandDisplaySrc"
					alt="建案名稱"
					class="absolute inset-0 h-full w-full object-contain"
				/>
				<div
					v-else
					class="absolute inset-0 flex items-center justify-center bg-white/5 text-sm text-white/70"
				>
					尚未設定建案名稱圖
				</div>

				<template v-if="canWrite">
					<button
						type="button"
						class="absolute right-3 top-3 hidden rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition hover:bg-black/50 group-hover:block 2xl:text-base"
						aria-label="編輯建案名稱圖"
						@click="isBrandEditOpen = true"
						@keydown.enter="isBrandEditOpen = true"
						@keydown.space.prevent="isBrandEditOpen = true"
					>
						編輯
					</button>
				</template>
			</div>
		</div>

		<template v-if="canWrite">
			<EditMockDialog
				v-model="isBuildingEditOpen"
				title="編輯建案主圖"
				:value="buildingRaw"
				input-mode="image"
				:crop-aspect-ratio="HOME_IMAGE_CROP.centralBuildingMain"
				placeholder="例如：https://... 或上傳圖片"
				preview-alt="建案主圖預覽"
				:hint="IMAGE_UPLOAD_HINT"
				@save="saveBuildingRaw"
				@reset="resetBuildingRaw"
				@upload="uploadBuilding"
			/>

			<EditMockDialog
				v-model="isBrandEditOpen"
				title="編輯建案名稱圖"
				:value="brandRaw"
				input-mode="image"
				:crop-aspect-ratio="HOME_IMAGE_CROP.centralBuildingBrand"
				placeholder="例如：https://... 或上傳圖片"
				preview-alt="建案名稱圖預覽"
				:hint="IMAGE_UPLOAD_HINT"
				@save="saveBrandRaw"
				@reset="resetBrandRaw"
				@upload="uploadBrand"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import EditMockDialog from "~/components/common/EditMockDialog.vue"
import { useAuth } from "~/composables/core/useAuth"
import { IMAGE_UPLOAD_HINT, useAppSettingImage } from "~/composables/core/useAppSettings"
import { HOME_IMAGE_CROP } from "~/utils/imageCropUtils"

const { canWrite } = useAuth()

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
