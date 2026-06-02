<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<div
			v-if="empty"
			class="mt-16 flex min-h-[560px] flex-1 w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center 2xl:min-h-[720px]"
		>
			<slot name="empty">
				<div>
					<svg
						class="mx-auto mb-4 h-16 w-16 text-white/60"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						/>
					</svg>
					<p class="text-xl font-medium text-white/90 xl:text-2xl 2xl:text-3xl">{{ emptyTitle }}</p>
					<p v-if="emptyDescription" class="mt-2 text-sm text-white/70 xl:text-base">
						{{ emptyDescription }}
					</p>
				</div>
			</slot>
		</div>
		<div
			v-else
			class="mt-16 flex min-h-0 flex-1 flex-col"
			:class="[enlarged && 'mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]', contentClass]"
		>
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		empty?: boolean
		enlarged?: boolean
		contentClass?: string
		emptyTitle?: string
		emptyDescription?: string
	}>(),
	{
		empty: false,
		enlarged: false,
		contentClass: "",
		emptyTitle: "尚無地點資料",
		emptyDescription: "請在「地點管理」中新增地點",
	},
)
</script>
