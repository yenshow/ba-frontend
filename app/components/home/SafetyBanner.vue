<template>
	<div class="group relative bg-red-600 py-2">
		<PermissionActionButton
			:allowed="canWrite"
			aria-label="編輯跑馬燈訊息"
			class="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition enabled:hover:bg-black/50 2xl:text-base"
			@click="isEditOpen = true"
		>
			編輯
		</PermissionActionButton>

		<div class="marquee-wrapper">
			<div class="marquee-content" :style="animationStyle">
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈訊息" }}
				</span>
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈訊息" }}
				</span>
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈訊息" }}
				</span>
			</div>
		</div>

		<EditMockDialog
			v-model="isEditOpen"
			title="編輯跑馬燈訊息"
			:value="bannerMessage"
			input-mode="text"
			placeholder="請輸入跑馬燈訊息"
			hint="※ 建議輸入 20-30 字，以確保跑馬燈播放流暢"
			@save="saveBannerMessage"
			@reset="resetBannerMessage"
		/>
	</div>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import EditMockDialog from "~/components/common/EditMockDialog.vue"
import { useAppSettings } from "~/composables/core/useAppSettings"
import { useHomeRbac } from "~/composables/core/useAccessGate"

const { canWrite } = useHomeRbac();

const {
	value: bannerMessage,
	save: saveBannerMessage,
	reset: resetBannerMessage,
} = useAppSettings({
	key: "safety_banner_message",
	defaultValue: "",
});

const isEditOpen = ref(false)

const animationStyle = {
	animation: "marquee-scroll 30s linear infinite",
	WebkitAnimation: "marquee-scroll 30s linear infinite",
}
</script>

<style>
@keyframes marquee-scroll {
	0% {
		transform: translate3d(0, 0, 0);
	}
	100% {
		transform: translate3d(-33.333%, 0, 0);
	}
}
</style>

<style scoped>
.marquee-wrapper {
	width: 100%;
	overflow: hidden;
	position: relative;
}

.marquee-content {
	display: flex;
	white-space: nowrap;
	width: max-content;
}

.marquee-item {
	padding: 0 1rem;
	font-size: 36px;
	font-weight: 600;
	color: white;
	white-space: nowrap;
	flex-shrink: 0;
}

@media (min-width: 1536px) {
	.marquee-item {
		font-size: 64px;
	}
}
</style>
