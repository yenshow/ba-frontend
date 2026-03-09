<template>
	<div class="group relative bg-red-600 py-2">
		<template v-if="isOperator">
			<button
				type="button"
				class="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-lg bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition hover:bg-black/50 group-hover:block 2xl:text-base"
				aria-label="編輯跑馬燈文字"
				@click="isEditOpen = true"
				@keydown.enter="isEditOpen = true"
				@keydown.space.prevent="isEditOpen = true"
			>
				編輯
			</button>
		</template>

		<div class="marquee-wrapper">
			<div class="marquee-content" :style="animationStyle">
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈文字" }}
				</span>
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈文字" }}
				</span>
				<span class="marquee-item">
					{{ bannerMessage || "請新增跑馬燈文字" }}
				</span>
			</div>
		</div>

		<template v-if="isOperator">
			<EditMockDialog
				v-model="isEditOpen"
				title="編輯跑馬燈文字"
				:value="bannerMessage"
				input-mode="text"
				placeholder="請輸入跑馬燈文字"
				hint="💡 建議輸入 20-30 字，以確保跑馬燈效果流暢。"
				@save="saveBannerMessage"
				@reset="resetBannerMessage"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import EditMockDialog from "~/components/common/EditMockDialog.vue";
import { useAppSettings } from "~/composables/core/useAppSettings";
import { useAuth } from "~/composables/core/useAuth";

interface Props {
	message?: string;
}

const props = defineProps<Props>();
const { isOperator } = useAuth();

const {
	value: bannerMessage,
	save: saveBannerMessage,
	reset: resetBannerMessage
} = useAppSettings({
	key: "safety_banner_message",
	defaultValue: props.message ?? ""
});

const isEditOpen = ref(false);

const animationStyle = {
	animation: "marquee-scroll 30s linear infinite",
	WebkitAnimation: "marquee-scroll 30s linear infinite"
};
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
