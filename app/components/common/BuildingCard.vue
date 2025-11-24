<template>
	<div class="flex flex-col items-center justify-center h-full min-h-0">
		<!-- Building image -->
		<div class="mx-6 xl:mx-8 2xl:mx-12 my-2 xl:my-3 2xl:my-4 overflow-hidden relative">
			<NuxtImg
				src="/layout/modern-business-building.jpg"
				alt="建築物圖片"
				class="image-blur-load w-full h-full rounded-3xl object-contain"
				:class="{ 'image-loaded': isBuildingLoaded }"
				width="full"
				height="full"
				@load="isBuildingLoaded = true"
			/>
		</div>

		<!-- Building Info Overlay at Bottom -->
		<div class="translate-x-[6%] w-full relative">
			<NuxtImg
				src="/layout/building-name.png"
				alt="建築名稱"
				class="image-blur-load w-full h-auto object-contain max-h-[80px] xl:max-h-[96px] 2xl:max-h-[112px]"
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
	transform: scale(1.05);
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
	transform: scale(1);
}
</style>
