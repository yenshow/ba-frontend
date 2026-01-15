<template>
	<div class="w-full bg-red-600 py-2">
		<div class="marquee-wrapper">
			<div class="marquee-content" :style="animationStyle">
				<span class="marquee-item">
					{{ message }}
				</span>
				<span class="marquee-item">
					{{ message }}
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	message?: string;
}

const props = withDefaults(defineProps<Props>(), {
	message: "施工中，請勿擅自闖入。場內嚴禁酒精性飲料。工作人員請留意自身安全，保持工作環境整潔。"
});

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
		transform: translate3d(-50%, 0, 0);
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
	width: fit-content;
}

.marquee-item {
	padding: 0 1rem;
	font-size: 24px;
	font-weight: 600;
	color: white;
	white-space: nowrap;
	flex-shrink: 0;
}

@media (min-width: 1536px) {
	.marquee-item {
		font-size: 36px;
	}
}
</style>
