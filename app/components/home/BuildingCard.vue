<template>
	<div class="flex h-full min-h-0 flex-col items-center justify-center">
		<!-- Building image -->
		<div class="relative mx-6 my-2 overflow-hidden 2xl:mx-12 2xl:my-4">
			<NuxtImg
				src="/layout/modern-business-building.jpg"
				alt="建築物圖片"
				class="image-blur-load h-full w-full rounded-3xl object-contain"
				:class="{ 'image-loaded': isBuildingLoaded }"
				width="full"
				height="full"
				@load="isBuildingLoaded = true"
			/>
		</div>

		<!-- Building Info Overlay at Bottom -->
		<div class="relative w-full translate-x-[6%]">
			<NuxtImg
				src="/layout/building-name.png"
				alt="建築名稱"
				class="image-blur-load h-auto max-h-[96px] w-full object-contain 2xl:max-h-[112px]"
				:class="{ 'image-loaded': isNameLoaded }"
				width="full"
				height="112"
				@load="isNameLoaded = true"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
const isBuildingLoaded = ref(false);
const isNameLoaded = ref(false);
</script>

<style scoped>
.image-blur-load {
	transition:
		filter 0.5s ease-in-out,
		opacity 0.5s ease-in-out;
	filter: blur(20px);
	opacity: 0.7;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}
</style>
