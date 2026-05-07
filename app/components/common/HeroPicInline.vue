<template>
	<div :class="wrapperClass">
		<!-- 以 v-html 注入 svg（來源為本機 public 靜態檔） -->
		<div v-if="svgMarkup" ref="containerEl" class="h-full" v-html="svgMarkup" />
	</div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
	(e: "load"): void;
	(e: "error"): void;
}>();

type Props = {
	ariaLabel?: string;
	rootClass?: string;
	/** 開關整體動畫（預設開啟） */
	animate?: boolean;
	/** 來源 svg（預設 public/heroPic.svg） */
	src?: string;
};

const props = withDefaults(defineProps<Props>(), {
	ariaLabel: "首頁主視覺插圖",
	rootClass: "",
	animate: true,
	src: "/heroPic.svg"
});

const { ariaLabel, rootClass, animate, src } = toRefs(props);

const svgMarkup = ref<string | null>(null);
const containerEl = ref<HTMLElement | null>(null);

const wrapperClass = computed(() => {
	const animateClass = animate.value ? "is-animate" : "";

	return ["hero-pic-inline", animateClass, rootClass.value].filter(Boolean).join(" ");
});

const normalizeSvgRoot = () => {
	const container = containerEl.value;
	if (!container) return;

	const svg = container.querySelector("svg");
	if (!svg) return;

	// a11y
	svg.setAttribute("role", "img");
	svg.setAttribute("aria-label", ariaLabel.value);
	svg.setAttribute("focusable", "false");

	// 讓外部可以用 class 控制整體（例如尺寸/顏色/濾鏡）
	if (rootClass.value) svg.setAttribute("class", rootClass.value);

	// 避免原始 width/height 造成不易響應式（保留 viewBox）
	svg.removeAttribute("width");
	svg.removeAttribute("height");

	setupLineSweep(svg);
};

const setupLineSweep = (svg: SVGSVGElement) => {
	const lineGroup = svg.querySelector<SVGGElement>("#line");
	if (!lineGroup) return;

	// 解析 viewBox（用來算 sweep 移動距離）
	const viewBox = svg.getAttribute("viewBox")?.trim() ?? "";
	const [minX, minY, vbWidth, vbHeight] = viewBox.split(/\s+/).map(v => Number(v));
	if (![minX, minY, vbWidth, vbHeight].every(n => Number.isFinite(n))) return;

	const defs =
		svg.querySelector("defs") ??
		(() => {
			const newDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
			svg.insertBefore(newDefs, svg.firstChild);
			return newDefs;
		})();

	const maskId = "hero-line-sweep-mask";
	const gradientId = "hero-line-sweep-gradient";
	const sweepRectId = "hero-line-sweep-rect";
	const sweepGroupId = "line_sweep";

	// 避免重複注入（同頁多次 mount / watch 時）
	if (svg.querySelector(`#${sweepGroupId}`) || svg.querySelector(`#${maskId}`)) return;

	const sweepWidth = Math.max(140, Math.round(vbWidth * 0.18));
	const travel = Math.round(vbWidth + sweepWidth * 2);

	svg.style.setProperty("--hero-line-sweep-travel", `${travel}px`);

	// gradient（中間最亮、左右淡出）
	const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
	gradient.setAttribute("id", gradientId);
	gradient.setAttribute("x1", "0");
	gradient.setAttribute("y1", "0");
	gradient.setAttribute("x2", "1");
	gradient.setAttribute("y2", "0");

	const stop0 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
	stop0.setAttribute("offset", "0%");
	stop0.setAttribute("stop-color", "white");
	stop0.setAttribute("stop-opacity", "0");

	const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
	stop1.setAttribute("offset", "50%");
	stop1.setAttribute("stop-color", "white");
	stop1.setAttribute("stop-opacity", "1");

	const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
	stop2.setAttribute("offset", "100%");
	stop2.setAttribute("stop-color", "white");
	stop2.setAttribute("stop-opacity", "0");

	gradient.append(stop0, stop1, stop2);
	defs.appendChild(gradient);

	// mask
	const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
	mask.setAttribute("id", maskId);
	mask.setAttribute("maskUnits", "userSpaceOnUse");
	mask.setAttribute("x", String(minX));
	mask.setAttribute("y", String(minY));
	mask.setAttribute("width", String(vbWidth));
	mask.setAttribute("height", String(vbHeight));

	const maskBase = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	maskBase.setAttribute("x", String(minX));
	maskBase.setAttribute("y", String(minY));
	maskBase.setAttribute("width", String(vbWidth));
	maskBase.setAttribute("height", String(vbHeight));
	maskBase.setAttribute("fill", "black");

	const sweepRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	sweepRect.setAttribute("id", sweepRectId);
	sweepRect.setAttribute("x", String(minX - sweepWidth));
	sweepRect.setAttribute("y", String(minY));
	sweepRect.setAttribute("width", String(sweepWidth));
	sweepRect.setAttribute("height", String(vbHeight));
	sweepRect.setAttribute("fill", `url(#${gradientId})`);

	mask.append(maskBase, sweepRect);
	defs.appendChild(mask);

	// 疊一層「高亮複本」讓掃光更明顯、也更不像 ground
	const sweepGroup = lineGroup.cloneNode(true) as SVGGElement;
	sweepGroup.setAttribute("id", sweepGroupId);
	sweepGroup.setAttribute("mask", `url(#${maskId})`);
	sweepGroup.setAttribute("opacity", "0.95");
	lineGroup.insertAdjacentElement("afterend", sweepGroup);
};

onMounted(async () => {
	try {
		const response = await fetch(src.value, {
			cache: "no-cache",
			credentials: "same-origin"
		});
		if (!response.ok) return;

		const text = await response.text();
		svgMarkup.value = text;

		await nextTick();
		normalizeSvgRoot();
		emit("load");
	} catch {
		// 靜態檔抓不到就不顯示（避免 login 頁卡住）
		emit("error");
	}
});

watch([ariaLabel, rootClass], async () => {
	if (!svgMarkup.value) return;
	await nextTick();
	normalizeSvgRoot();
});
</script>

<style scoped>
/* 預設讓 SVG 在容器中可縮放 */
.hero-pic-inline :deep(svg) {
	display: block;
	width: auto;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
	/* 全部動畫的主節奏（讓 line/ground/beam/ball/文字時間對齊） */
	--hero-heroic-cycle: 4.8s;
}

/* 動畫基礎：讓 transform 以自身 bounding box 為基準 */
.hero-pic-inline.is-animate :deep(#white_light_01),
.hero-pic-inline.is-animate :deep(#white_light_02),
.hero-pic-inline.is-animate :deep(#blue_light_01),
.hero-pic-inline.is-animate :deep(#blue_light_02),
.hero-pic-inline.is-animate :deep(#ball),
.hero-pic-inline.is-animate :deep(#card),
.hero-pic-inline.is-animate :deep(#beam),
.hero-pic-inline.is-animate :deep(#ground),
.hero-pic-inline.is-animate :deep(#line),
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
	animation: heroFloat var(--hero-heroic-cycle) ease-in-out infinite;
}

/* 5) card 微小浮動 */
.hero-pic-inline.is-animate :deep(#card) {
	animation: heroCardFloat 5s ease-in-out infinite;
}

/* beam：發光脈衝 */
.hero-pic-inline.is-animate :deep(#beam) {
	animation: heroBeamGlow var(--hero-heroic-cycle) ease-in-out infinite;
}

/* ground：光波傳遞（用水平位移的光暈近似掃過） */
.hero-pic-inline.is-animate :deep(#ground) {
	animation: heroWaveTransmit var(--hero-heroic-cycle) ease-in-out infinite;
	mix-blend-mode: screen;
}

/* line：底層只做輕微呼吸，避免跟 ground 太像（主效果交給 sweep） */
.hero-pic-inline.is-animate :deep(#line) {
	animation: heroLineBreath var(--hero-heroic-cycle) ease-in-out infinite;
	opacity: 0.65;
}

/* line_sweep：掃光高亮層（mask 從左掃到右） */
.hero-pic-inline.is-animate :deep(#line_sweep) {
	mix-blend-mode: screen;
	filter: brightness(1.35) drop-shadow(0 0 14px rgba(154, 252, 255, 0.45));
	pointer-events: none;
}

.hero-pic-inline.is-animate :deep(#hero-line-sweep-rect) {
	animation: heroLineSweepX var(--hero-heroic-cycle) linear infinite;
	will-change: transform;
}

/* 6) Yenshow 各字母波浪浮動 */
.hero-pic-inline.is-animate :deep(#icon) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
}

.hero-pic-inline.is-animate :deep(#y) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.15s;
}
.hero-pic-inline.is-animate :deep(#e) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.3s;
}
.hero-pic-inline.is-animate :deep(#n) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.45s;
}
.hero-pic-inline.is-animate :deep(#s) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.6s;
}
.hero-pic-inline.is-animate :deep(#h) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.75s;
}
.hero-pic-inline.is-animate :deep(#o) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
	animation-delay: 0.9s;
}
.hero-pic-inline.is-animate :deep(#w) {
	animation: heroLetterFloat var(--hero-heroic-cycle) ease-in-out infinite;
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

@keyframes heroLineBreath {
	0% {
		opacity: 0.55;
		filter: brightness(1);
	}
	50% {
		opacity: 0.85;
		filter: brightness(1.12);
	}
	100% {
		opacity: 0.55;
		filter: brightness(1);
	}
}

@keyframes heroLineSweepX {
	0% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(var(--hero-line-sweep-travel, 1060px));
	}
}

@keyframes heroLetterFloat {
	0%,
	100% {
		transform: translateY(0);
	}
	25% {
		transform: translateY(-8px);
	}
	50% {
		transform: translateY(0);
	}
	75% {
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
	.hero-pic-inline.is-animate :deep(#ground),
	.hero-pic-inline.is-animate :deep(#line),
	.hero-pic-inline.is-animate :deep(#hero-line-sweep-rect),
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
