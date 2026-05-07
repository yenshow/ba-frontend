<template>
	<div :class="wrapperClass">
		<!-- 以 v-html 注入 svg（來源為本機 public 靜態檔） -->
		<div v-if="svgMarkup" ref="containerEl" class="h-full" v-html="svgMarkup" />
	</div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
	(e: "load"): void
	(e: "error"): void
}>()

type Props = {
	ariaLabel?: string
	rootClass?: string
	/** 開關整體動畫（預設開啟） */
	animate?: boolean
	/** 來源 svg（預設 public/heroPic.svg） */
	src?: string
}

const props = withDefaults(defineProps<Props>(), {
	ariaLabel: "首頁主視覺插圖",
	rootClass: "",
	animate: true,
	src: "/heroPic.svg",
})

const { ariaLabel, rootClass, animate, src } = toRefs(props)

const svgMarkup = ref<string | null>(null)
const containerEl = ref<HTMLElement | null>(null)

const wrapperClass = computed(() => {
	const animateClass = animate.value ? "is-animate" : ""

	return ["hero-pic-inline", animateClass, rootClass.value].filter(Boolean).join(" ")
})

const normalizeSvgRoot = () => {
	const container = containerEl.value
	if (!container) return

	const svg = container.querySelector("svg")
	if (!svg) return

	// a11y
	svg.setAttribute("role", "img")
	svg.setAttribute("aria-label", ariaLabel.value)
	svg.setAttribute("focusable", "false")

	// 讓外部可以用 class 控制整體（例如尺寸/顏色/濾鏡）
	if (rootClass.value) svg.setAttribute("class", rootClass.value)

	// 避免原始 width/height 造成不易響應式（保留 viewBox）
	svg.removeAttribute("width")
	svg.removeAttribute("height")
}

onMounted(async () => {
	try {
		const response = await fetch(src.value, {
			cache: "no-cache",
			credentials: "same-origin",
		})
		if (!response.ok) return

		const text = await response.text()
		svgMarkup.value = text

		await nextTick()
		normalizeSvgRoot()
		emit("load")
	} catch {
		// 靜態檔抓不到就不顯示（避免 login 頁卡住）
		emit("error")
	}
})

watch([ariaLabel, rootClass], async () => {
	if (!svgMarkup.value) return
	await nextTick()
	normalizeSvgRoot()
})
</script>

<style scoped>
/* 預設讓 SVG 在容器中可縮放 */
.hero-pic-inline :deep(svg) {
	display: block;
	width: auto;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
}

/* 動畫基礎：讓 transform 以自身 bounding box 為基準 */
.hero-pic-inline.is-animate :deep(#white_light_01),
.hero-pic-inline.is-animate :deep(#white_light_02),
.hero-pic-inline.is-animate :deep(#blue_light_01),
.hero-pic-inline.is-animate :deep(#blue_light_02),
.hero-pic-inline.is-animate :deep(#ball),
.hero-pic-inline.is-animate :deep(#card),
.hero-pic-inline.is-animate :deep(#beam),
.hero-pic-inline.is-animate :deep(#others),
.hero-pic-inline.is-animate :deep(#w),
.hero-pic-inline.is-animate :deep(#o),
.hero-pic-inline.is-animate :deep(#h),
.hero-pic-inline.is-animate :deep(#s),
.hero-pic-inline.is-animate :deep(#n),
.hero-pic-inline.is-animate :deep(#e),
.hero-pic-inline.is-animate :deep(#y),
.hero-pic-inline.is-animate :deep(#icon) {
	transform-box: fill-box;
	transform-origin: center;
	will-change: transform, opacity, filter;
}

/* 1) white_light_01 / white_light_02 交互閃爍 */
.hero-pic-inline.is-animate :deep(#white_light_01) {
	/* animation: heroBlink 2s ease-in-out infinite; */
	opacity: 0;
}
.hero-pic-inline.is-animate :deep(#white_light_02) {
	animation: heroBlink 2s ease-in-out infinite;
	animation-delay: 0.8s;
	/* opacity: 0; */
}

/* 2) blue_light_01 / blue_light_02 左右移動 */
.hero-pic-inline.is-animate :deep(#blue_light_01) {
	animation: heroBlueSlide 3.4s ease-in-out infinite;
}
.hero-pic-inline.is-animate :deep(#blue_light_02) {
	animation: heroBlueSlide 3.4s ease-in-out infinite;
	animation-delay: 1.7s;
}

/* 3) ball 上下浮動 */
.hero-pic-inline.is-animate :deep(#ball) {
	animation: heroFloat 4s ease-in-out infinite;
}

/* 5) card 微小浮動 */
.hero-pic-inline.is-animate :deep(#card) {
	animation: heroCardFloat 5s ease-in-out infinite;
}

/* beam：發光脈衝 */
.hero-pic-inline.is-animate :deep(#beam) {
	animation: heroBeamGlow 4s ease-in-out infinite;
}

/* others：光波傳遞（用水平位移的光暈近似掃過） */
.hero-pic-inline.is-animate :deep(#others) {
	animation: heroWaveTransmit 3.2s ease-in-out infinite;
	mix-blend-mode: screen;
}

/* 6) Yenshow 各字母波浪浮動 */
.hero-pic-inline.is-animate :deep(#icon) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
}

.hero-pic-inline.is-animate :deep(#y) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.15s;
}
.hero-pic-inline.is-animate :deep(#e) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.3s;
}
.hero-pic-inline.is-animate :deep(#n) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.45s;
}
.hero-pic-inline.is-animate :deep(#s) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.6s;
}
.hero-pic-inline.is-animate :deep(#h) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.75s;
}
.hero-pic-inline.is-animate :deep(#o) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 0.9s;
}
.hero-pic-inline.is-animate :deep(#w) {
	animation: heroLetterFloat 2.6s ease-in-out infinite;
	animation-delay: 1.05s;
}

@keyframes heroBlink {
	0%,
	100% {
		opacity: 0.5;
		filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
	}
	50% {
		opacity: 1;
		filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.55));
	}
}

@keyframes heroBlueSlide {
	0%,
	100% {
		transform: translateY(-3px);
		opacity: 0.85;
	}
	50% {
		transform: translateY(3px);
		opacity: 1;
	}
}

@keyframes heroFloat {
	0%,
	100% {
		transform: translateY(0);
		scale: 1;
	}
	50% {
		transform: translateY(-30px);
		scale: 1.1;
		transform-origin: center;
	}
}

@keyframes heroCardFloat {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-10px) scale(1.1);
		transform-origin: center;
	}
}

@keyframes heroBeamGlow {
	0%,
	100% {
		opacity: 0.35;
		filter: brightness(1) drop-shadow(0 0 0 rgba(154, 252, 255, 0));
	}
	35% {
		opacity: 0.9;
		filter: brightness(1.25) drop-shadow(0 0 14px rgba(154, 252, 255, 0.55));
	}
	55% {
		opacity: 0.55;
		filter: brightness(1.1) drop-shadow(0 0 8px rgba(154, 252, 255, 0.25));
	}
}

@keyframes heroWaveTransmit {
	0% {
		opacity: 0.7;
		filter: brightness(1) drop-shadow(-22px 0 0 rgba(154, 252, 255, 0));
	}
	25% {
		opacity: 0.9;
		filter: brightness(1.1) drop-shadow(-10px 0 10px rgba(154, 252, 255, 0.22));
	}
	50% {
		opacity: 1;
		filter: brightness(1.25) drop-shadow(0 0 16px rgba(154, 252, 255, 0.5));
	}
	75% {
		opacity: 0.9;
		filter: brightness(1.1) drop-shadow(10px 0 10px rgba(154, 252, 255, 0.22));
	}
	100% {
		opacity: 0.7;
		filter: brightness(1) drop-shadow(22px 0 0 rgba(154, 252, 255, 0));
	}
}

@keyframes heroLetterFloat {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-8px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.hero-pic-inline.is-animate :deep(#white_light_01),
	.hero-pic-inline.is-animate :deep(#white_light_02),
	.hero-pic-inline.is-animate :deep(#blue_light_01),
	.hero-pic-inline.is-animate :deep(#blue_light_02),
	.hero-pic-inline.is-animate :deep(#ball),
	.hero-pic-inline.is-animate :deep(#card),
	.hero-pic-inline.is-animate :deep(#beam),
	.hero-pic-inline.is-animate :deep(#others),
	.hero-pic-inline.is-animate :deep(#w),
	.hero-pic-inline.is-animate :deep(#o),
	.hero-pic-inline.is-animate :deep(#h),
	.hero-pic-inline.is-animate :deep(#s),
	.hero-pic-inline.is-animate :deep(#n),
	.hero-pic-inline.is-animate :deep(#e),
	.hero-pic-inline.is-animate :deep(#y),
	.hero-pic-inline.is-animate :deep(#icon) {
		animation: none !important;
	}
}
</style>
