<template>
	<div class="min-h-screen flex items-center justify-center bg-login-gradient">
		<!-- Main Container -->
		<div class="container">
			<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-12 items-center">
				<!-- Left Side - Hero Illustration -->
				<div class="col-span-1 xl:col-span-2 hidden lg:flex flex-col justify-center items-center space-y-8 -translate-y-16">
					<!-- Hero Image/Illustration -->
					<NuxtImg
						src="/login_heroPic.png"
						alt="BA System"
						class="image-blur-load w-full h-full object-contain"
						:class="{ 'image-loaded': isHeroLoaded }"
						width="800"
						height="600"
						sizes="lg:800px"
						loading="eager"
						@load="isHeroLoaded = true"
					/>
				</div>

				<!-- Right Side - Login Form -->
				<div class="mx-auto w-full max-w-md">
					<!-- Login Card -->
					<div class="glass glass-card rounded-3xl p-8">
						<!-- Welcome Header -->
						<div class="text-center mb-4">
							<div class="w-24 h-24 mx-auto mb-2 rounded-full bg-white/30 flex items-center justify-center">
								<svg class="w-20 h-20 text-white" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
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
								<label class="block text-white/80 text-md mb-2">帳號</label>
								<div class="relative">
									<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
										<svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
										class="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#7DC1CB] focus:ring-2 focus:ring-[#7DC1CB]/30 focus:bg-white/15 transition-all duration-200"
										required
									/>
								</div>
							</div>

							<!-- Password Input -->
							<div>
								<label class="block text-white/80 text-sm mb-2">密碼</label>
								<div class="relative">
									<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
										<svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
										class="w-full pl-12 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#7DC1CB] focus:ring-2 focus:ring-[#7DC1CB]/30 focus:bg-white/15 transition-all duration-200"
										required
									/>
									<button
										type="button"
										@click="showPassword = !showPassword"
										class="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/80 transition-colors"
									>
										<svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

							<!-- Forgot Password -->
							<div class="flex justify-end">
								<NuxtLink to="/forgot-password" class="text-sm text-white/60 hover:text-[#7DC1CB] transition-colors"> 忘記密碼？ </NuxtLink>
							</div>

							<!-- Login Button -->
							<button
								type="submit"
								:disabled="isLoading"
								class="w-full py-4 bg-gradient-to-r from-[#7DC1CB] to-[#5AABB5] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
							>
								<span v-if="!isLoading" class="flex items-center justify-center space-x-2">
									<span class="text-lg">登入</span>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
										/>
									</svg>
								</span>
								<span v-else class="flex items-center justify-center space-x-2">
									<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
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
						<div class="my-8 flex items-center">
							<div class="flex-1 h-px bg-white/10"></div>
							<span class="px-4 text-white/40 text-md">或</span>
							<div class="flex-1 h-px bg-white/10"></div>
						</div>

						<!-- Contact Link -->
						<div class="text-center">
							<p class="text-white/60 text-md">
								遇到問題？
								<NuxtLink to="/" class="text-[#ffffffe6] hover:text-[#ffffff] font-bold transition-colors"> 聯絡管理員 </NuxtLink>
							</p>
						</div>
					</div>

					<!-- Version Info -->
					<div class="text-center mt-8 text-white/40">
						<p class="text-xl">BA System v1.2.0</p>
						<p class="text-sm">© 2025 YENSHOW Technology</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: false,
	middleware: [] // Add auth middleware if needed
});

const formData = ref({
	account: "",
	password: ""
});

const showPassword = ref(false);
const isLoading = ref(false);

// 登入頁插圖載入狀態
const isHeroLoaded = ref(false);

const handleLogin = async () => {
	isLoading.value = true;

	try {
		// TODO: 實作登入邏輯
		// const response = await $fetch('/api/auth/login', {
		//   method: 'POST',
		//   body: formData.value
		// })

		// 模擬 API 請求
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// 登入成功後跳轉
		navigateTo("/");
	} catch (error) {
		console.error("登入失敗:", error);
		// TODO: 顯示錯誤訊息
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

/* 圖片模糊載入效果 */
.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out,
		transform 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
	transform: scale(1.05);
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
	transform: scale(1);
}
</style>
