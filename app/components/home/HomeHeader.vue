<template>
	<div class="grid grid-cols-3">
		<!-- 左側：品牌標誌 -->
		<div class="group col-span-1 flex items-center justify-center">
			<div class="relative flex items-center justify-center">
				<img
					src="/layout/golden.png"
					alt="遠昇 LOGO"
					class="h-[var(--brand-logo-h)] object-contain"
					:style="brandLogoStyle"
				/>

				<PermissionActionButton
					:allowed="canWrite"
					aria-label="編輯品牌標誌高度"
					class="absolute -right-2 -top-2 rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition enabled:hover:bg-black/50 2xl:text-base"
					@click="isBrandLogoHeightEditOpen = true"
				>
					編輯
				</PermissionActionButton>
			</div>

			<EditMockDialog
				v-model="isBrandLogoHeightEditOpen"
				title="編輯品牌標誌高度"
				:value="brandLogoHeightRaw"
				input-mode="range"
				placeholder="48 - 96（px）"
				:range-label="'高度'"
				:range-min="BRAND_LOGO_HEIGHT_MIN"
				:range-max="BRAND_LOGO_HEIGHT_MAX"
				:range-step="1"
				range-unit="px"
				:range-preview-src="brandLogoPreviewSrc"
				@save="handleSaveBrandLogoHeight"
				@reset="resetBrandLogoHeight"
			/>
		</div>

		<!-- 中間：專案圖片 -->
		<div class="group col-span-1 flex items-center justify-center">
			<div class="relative flex h-28 items-center justify-center 2xl:h-36">
				<img
					v-if="projectImageSrc"
					:src="projectImageSrc"
					alt="專案圖片"
					class="h-28 object-contain 2xl:h-36"
				/>
				<div
					v-else
					class="rounded-lg border-2 border-white/20 bg-white/5 px-6 py-3 text-center text-sm text-white/80 2xl:text-base"
				>
					請在設定中設定專案圖片
				</div>

				<PermissionActionButton
					:allowed="canWrite"
					aria-label="編輯專案圖片"
					class="absolute -right-2 -top-2 rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition enabled:hover:bg-black/50 2xl:text-base"
					@click="isProjectImageEditOpen = true"
				>
					編輯
				</PermissionActionButton>
			</div>

			<EditMockDialog
				v-model="isProjectImageEditOpen"
				title="編輯專案圖片"
				:value="projectImageSrcRaw"
				input-mode="image"
				:crop-aspect-ratio="HOME_IMAGE_CROP.constructionProjectHeader"
				placeholder="例如：https://... 或上傳圖片"
				preview-alt="專案圖片預覽"
				:hint="IMAGE_UPLOAD_HINT"
				@save="saveProjectImageSrc"
				@reset="resetProjectImageSrc"
				@upload="handleUploadProjectImage"
			/>
		</div>

		<!-- 右側：日期時間 -->
		<ClientOnly>
			<div class="col-span-1 flex flex-col items-center justify-center text-white">
				<div class="ms-[12px] text-[36px] font-semibold tracking-[12px] 2xl:text-[48px]">
					{{ formattedDate.date }}
				</div>
				<div class="ms-[6px] text-[21px] tracking-[6px] 2xl:text-[28px]">
					{{ formattedDate.weekday }} {{ formattedDate.period }} {{ formattedDate.time }}
				</div>
			</div>
			<template #fallback>
				<div class="col-span-1 flex flex-col items-center justify-center text-white">
					<div class="ms-[12px] text-[36px] font-semibold tracking-[12px] 2xl:text-[48px]">--</div>
					<div class="ms-[6px] text-[21px] tracking-[6px] 2xl:text-[28px]">--</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import EditMockDialog from "~/components/common/EditMockDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useAppSettings, IMAGE_UPLOAD_HINT } from "~/composables/core/useAppSettings"
import { HOME_IMAGE_CROP } from "~/utils/imageCropUtils"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { createSafeFileName } from "~/utils/fileUtils"
import { formatClockDisplay } from "~/utils/dateUtils"
import { useHomeRbac } from "~/composables/core/useAccessGate"

const BRAND_LOGO_HEIGHT_MIN = 48
const BRAND_LOGO_HEIGHT_MAX = 192
const BRAND_LOGO_HEIGHT_DEFAULT = 80

const clampBrandLogoHeight = (value: number) =>
	Math.min(BRAND_LOGO_HEIGHT_MAX, Math.max(BRAND_LOGO_HEIGHT_MIN, value))

const {
	value: brandLogoHeightRaw,
	save: saveBrandLogoHeightRaw,
	reset: resetBrandLogoHeight,
} = useAppSettings({
	key: "home_header_brand_logo_height",
	defaultValue: String(BRAND_LOGO_HEIGHT_DEFAULT),
})

const {
	value: projectImageSrcRaw,
	save: saveProjectImageSrc,
	reset: resetProjectImageSrc,
	uploadFile: uploadProjectImage,
} = useAppSettings({
	key: "home_header_project_image",
	defaultValue: "",
})

const { canWrite } = useHomeRbac()

const isBrandLogoHeightEditOpen = ref(false)
const brandLogoPreviewBuster = ref<number>(Date.now())

watch(isBrandLogoHeightEditOpen, (isOpen) => {
	if (!isOpen) return
	brandLogoPreviewBuster.value = Date.now()
})

const brandLogoHeight = computed(() => {
	const parsed = Number.parseInt(String(brandLogoHeightRaw.value ?? ""), 10)
	if (!Number.isFinite(parsed)) {
		return BRAND_LOGO_HEIGHT_DEFAULT
	}
	return clampBrandLogoHeight(parsed)
})

const brandLogoStyle = computed(() => ({
	"--brand-logo-h": `${brandLogoHeight.value}px`,
}))

const brandLogoPreviewSrc = computed(() => `/layout/golden.png?t=${brandLogoPreviewBuster.value}`)

const handleSaveBrandLogoHeight = async (nextValue: string) => {
	const parsed = Number.parseInt(String(nextValue ?? "").trim(), 10)
	if (!Number.isFinite(parsed)) {
		await resetBrandLogoHeight()
		isBrandLogoHeightEditOpen.value = false
		return
	}

	const clamped = clampBrandLogoHeight(parsed)
	await saveBrandLogoHeightRaw(String(clamped))
	isBrandLogoHeightEditOpen.value = false
}

const { useDisplaySrc } = useImageCenter()
const projectImageSrc = useDisplaySrc(() => projectImageSrcRaw.value ?? "")
const isProjectImageEditOpen = ref(false)

const handleUploadProjectImage = async (file: File) => {
	try {
		const safeFile = createSafeFileName("project-header", file, "png")
		await uploadProjectImage(safeFile)
		isProjectImageEditOpen.value = false
	} catch (error) {
		console.error("Upload failed:", error)
	}
}

const currentDateTime = ref(new Date())
const formattedDate = computed(() => formatClockDisplay(currentDateTime.value))

let timeInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	currentDateTime.value = new Date()
	timeInterval = setInterval(() => {
		currentDateTime.value = new Date()
	}, 1000)
})

onBeforeUnmount(() => {
	if (timeInterval) {
		clearInterval(timeInterval)
		timeInterval = null
	}
})
</script>
