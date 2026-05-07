<template>
	<div class="bg-login-gradient flex min-h-screen items-center justify-center">
		<div class="flex items-center justify-center gap-8">
			<!-- Hero Image/Illustration -->
			<div class="flex h-[800px] items-center">
				<ClientOnly>
					<HeroPicInline
						aria-label="BA System"
						root-class="h-full w-auto"
						:animate="true"
						class="image-blur-load image-blur-load--hero"
						:class="{ 'image-loaded': isHeroLoaded }"
						@load="isHeroLoaded = true"
					/>
				</ClientOnly>
			</div>

			<!-- Right Side - Login Form -->
			<div class="mx-auto w-full max-w-md">
				<!-- Login Card -->
				<div class="glass glass-card rounded-3xl p-8">
					<!-- Welcome Header -->
					<div class="mb-4 text-center">
						<div class="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-white/30">
							<svg
								class="h-20 w-20 text-white"
								fill="currentColor"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<h2 class="text-3xl text-white">歡迎</h2>
					</div>

					<!-- Login Form -->
					<form @submit.prevent="handleLogin" class="space-y-4">
						<!-- Account Input -->
						<div>
							<label class="text-md mb-2 block text-white/80">帳號</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
									<svg class="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
								<input
									v-model="formData.account"
									type="text"
									placeholder="請輸入帳號"
									class="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-12 pr-4 text-white placeholder-white/40 transition-all duration-200 focus:border-[#7DC1CB] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#7DC1CB]/30"
									required
								/>
							</div>
						</div>

						<!-- Password Input -->
						<div>
							<label class="mb-2 block text-sm text-white/80">密碼</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
									<svg class="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
								</div>
								<input
									v-model="formData.password"
									:type="showPassword ? 'text' : 'password'"
									placeholder="請輸入密碼"
									class="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-12 pr-12 text-white placeholder-white/40 transition-all duration-200 focus:border-[#7DC1CB] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#7DC1CB]/30"
									required
								/>
								<button
									type="button"
									@click="showPassword = !showPassword"
									class="absolute inset-y-0 right-0 flex items-center pr-4 text-white/40 transition-colors hover:text-white/80"
								>
									<svg
										v-if="!showPassword"
										class="h-5 w-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										/>
									</svg>
									<svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
										/>
									</svg>
								</button>
							</div>
						</div>

						<!-- Error Message -->
						<div
							v-if="errorMessage"
							class="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200"
						>
							{{ errorMessage }}
						</div>

						<!-- Login Button -->
						<button
							type="submit"
							:disabled="isLoading"
							class="w-full rounded-xl bg-gradient-to-r from-[#7DC1CB] to-[#5AABB5] py-4 font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span v-if="!isLoading" class="flex items-center justify-center space-x-2">
								<span class="text-lg">登入</span>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									/>
								</svg>
							</span>
							<span v-else class="flex items-center justify-center space-x-2">
								<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span class="text-lg">登入中...</span>
							</span>
						</button>
					</form>

					<!-- Divider -->
					<div class="my-8 h-px bg-white/10"></div>

					<!-- Contact Link -->
					<div class="text-center">
						<p class="text-md text-white/60">
							遇到問題？
							<NuxtLink to="/" class="font-bold text-[#ffffffe6] transition-colors hover:text-[#ffffff]">
								聯絡管理員
							</NuxtLink>
						</p>
					</div>
				</div>

				<!-- Version Info -->
				<div class="mt-8 text-center text-white/40">
					<p class="text-xl">BA System v1.6.0</p>
					<p class="text-sm">© 2026 YENSHOW Technology</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import HeroPicInline from "~/components/common/HeroPicInline.vue";

definePageMeta({
	layout: false
});

const { login, isAuthenticated } = useAuth();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { handleError } = useErrorHandler();

// 如果已經登入，自動重定向（等待插件初始化完成）
onMounted(async () => {
	// 等待下一個 tick 確保認證狀態已恢復
	await nextTick();
	if (isAuthenticated.value) {
		const redirectPath = (route.query.redirect as string) || "/";
		router.push(redirectPath);
	}
});

const formData = ref({
	account: "",
	password: ""
});

const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

// 登入頁插圖載入狀態
const isHeroLoaded = ref(false);

const handleLogin = async () => {
	if (!formData.value.account || !formData.value.password) {
		errorMessage.value = "請輸入帳號和密碼";
		return;
	}

	isLoading.value = true;
	errorMessage.value = null;

	try {
		await login({
			username: formData.value.account,
			password: formData.value.password
		});

		toast.success("登入成功");

		// 登入成功後跳轉 - 檢查 redirect query 參數
		const redirectPath = (route.query.redirect as string) || "/";
		await router.push(redirectPath);
	} catch (error) {
		const errorMsg = handleError(error, "登入失敗，請檢查帳號密碼");
		errorMessage.value = errorMsg || "登入失敗，請檢查帳號密碼";
	} finally {
		isLoading.value = false;
	}
};
</script>

<style scoped>
/* 登入頁面背景漸層 */
.bg-login-gradient {
	background: linear-gradient(155deg, #7dc1cb 0%, #006191 100%);
}

/* 按鈕波紋效果 */
button[type="submit"]:active {
	transform: scale(0.95);
}

/* Input focus 時圖示顏色變化 */
.relative:has(input:focus) {
	color: #7dc1cb;
	transition: color 0.2s;
}
</style>
