<template>
	<div
		class="flex min-h-screen items-center justify-center bg-[linear-gradient(155deg,#7dc1cb_0%,#006191_100%)]"
	>
		<div class="flex items-center justify-center gap-8">
			<!-- Hero Image/Illustration -->
			<div class="hidden items-center lg:flex lg:h-[800px]">
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
						<div
							class="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-white/30"
						>
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
							<label class="text-md mb-2 block text-white/80" :for="accountInputId">帳號</label>
							<div class="group relative">
								<div
									class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/80 transition-colors group-focus-within:text-[#7DC1CB]"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
								<input
									:id="accountInputId"
									ref="accountInputRef"
									v-model="formData.account"
									type="text"
									autocomplete="username"
									autocapitalize="none"
									spellcheck="false"
									placeholder="請輸入帳號"
									class="w-full rounded-xl border bg-white/10 py-3.5 pl-12 pr-4 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/15 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
									:class="{
										'border-red-400/70 focus:border-red-400 focus:ring-red-400/30':
											!!fieldErrors.account,
										'border-white/20 focus:border-[#7DC1CB] focus:ring-[#7DC1CB]/30':
											!fieldErrors.account,
									}"
									:disabled="isLoading"
									:aria-invalid="fieldErrors.account ? 'true' : 'false'"
									:aria-describedby="fieldErrors.account ? accountErrorId : undefined"
									required
								/>
							</div>
							<p v-if="fieldErrors.account" :id="accountErrorId" class="mt-1 text-sm text-red-200">
								{{ fieldErrors.account }}
							</p>
						</div>

						<!-- Password Input -->
						<div>
							<label class="mb-2 block text-sm text-white/80" :for="passwordInputId">密碼</label>
							<div class="group relative">
								<div
									class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/80 transition-colors group-focus-within:text-[#7DC1CB]"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
								</div>
								<input
									:id="passwordInputId"
									ref="passwordInputRef"
									v-model="formData.password"
									:type="showPassword ? 'text' : 'password'"
									autocomplete="current-password"
									placeholder="請輸入密碼"
									class="w-full rounded-xl border bg-white/10 py-3.5 pl-12 pr-12 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/15 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
									:class="{
										'border-red-400/70 focus:border-red-400 focus:ring-red-400/30':
											!!fieldErrors.password,
										'border-white/20 focus:border-[#7DC1CB] focus:ring-[#7DC1CB]/30':
											!fieldErrors.password,
									}"
									:disabled="isLoading"
									:aria-invalid="fieldErrors.password ? 'true' : 'false'"
									:aria-describedby="fieldErrors.password ? passwordErrorId : undefined"
									required
								/>
								<button
									type="button"
									@click="handleTogglePassword"
									class="absolute inset-y-0 right-0 flex items-center pr-4 text-white/40 transition-colors hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
									:disabled="isLoading"
									:aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
									:aria-pressed="showPassword ? 'true' : 'false'"
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
							<p
								v-if="fieldErrors.password"
								:id="passwordErrorId"
								class="mt-1 text-sm text-red-200"
							>
								{{ fieldErrors.password }}
							</p>
						</div>

						<!-- Error Message -->
						<div
							v-if="errorMessage"
							:id="formErrorId"
							role="alert"
							aria-live="polite"
							class="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200"
						>
							{{ errorMessage }}
						</div>

						<!-- Login Button -->
						<button
							type="submit"
							:disabled="isLoading"
							class="w-full rounded-xl bg-gradient-to-r from-[#7DC1CB] to-[#5AABB5] py-4 font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
					<div class="my-6 h-px bg-white/20"></div>

					<!-- Contact Info -->
					<div class="text-center w-fit mx-auto">
						<p class="text-base mb-2 text-white/70">需要協助？請聯絡我們</p>
						<div class="space-y-1 text-sm text-white/70">
							<div class="flex items-center gap-2">
								<span class="text-white/60">專線│</span>
								<a
									href="tel:0222233355"
									tabindex="0"
									class="font-semibold text-white/90 underline-offset-4 hover:underline"
									aria-label="撥打專線 02-222-333-55"
								>
									02-222-333-55
								</a>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-white/60">Email│</span>
								<a
									href="mailto:jerry@yenshow.com"
									tabindex="0"
									class="font-semibold text-white/90 underline-offset-4 hover:underline"
									aria-label="寄信到 jerry@yenshow.com"
								>
									jerry@yenshow.com
								</a>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-white/60">線上表單│</span>
								<a
									href="https://www.yenshow.com/contact"
									target="_blank"
									rel="noreferrer"
									tabindex="0"
									class="inline-flex w-fit items-center gap-1 font-medium text-white/95 underline decoration-white/40 underline-offset-[3px] transition-colors hover:text-white hover:decoration-white"
									aria-label="開啟線上聯絡表單（另開新視窗）"
								>
									前往填寫
									<svg
										class="h-3.5 w-3.5 shrink-0 opacity-80"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
								</a>
							</div>
						</div>
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
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import HeroPicInline from "~/components/common/HeroPicInline.vue"

definePageMeta({
	layout: false,
})

const { login, isAuthenticated } = useAuth()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { handleError } = useErrorHandler()

const accountInputId = "login-account"
const passwordInputId = "login-password"
const accountErrorId = "login-account-error"
const passwordErrorId = "login-password-error"
const formErrorId = "login-form-error"

const accountInputRef = ref<HTMLInputElement | null>(null)
const passwordInputRef = ref<HTMLInputElement | null>(null)

// 如果已經登入，自動重定向（等待插件初始化完成）
onMounted(async () => {
	// 等待下一個 tick 確保認證狀態已恢復
	await nextTick()
	if (isAuthenticated.value) {
		const redirectPath = sanitizeRedirectPath(route.query.redirect)
		router.replace(redirectPath)
	}
})

const formData = ref({
	account: "",
	password: "",
})

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<{ account: string | null; password: string | null }>({
	account: null,
	password: null,
})

// 登入頁插圖載入狀態
const isHeroLoaded = ref(false)

const sanitizeRedirectPath = (raw: unknown) => {
	if (typeof raw !== "string") return "/"
	const trimmed = raw.trim()
	if (!trimmed.startsWith("/")) return "/"
	if (trimmed.startsWith("//")) return "/"
	return trimmed
}

const handleTogglePassword = () => {
	if (isLoading.value) return
	showPassword.value = !showPassword.value
}

const validateForm = () => {
	fieldErrors.value.account = null
	fieldErrors.value.password = null

	const normalizedAccount = formData.value.account.trim()
	if (!normalizedAccount) fieldErrors.value.account = "請輸入帳號"
	if (!formData.value.password) fieldErrors.value.password = "請輸入密碼"

	formData.value.account = normalizedAccount

	if (fieldErrors.value.account) {
		accountInputRef.value?.focus()
		return false
	}
	if (fieldErrors.value.password) {
		passwordInputRef.value?.focus()
		return false
	}

	return true
}

const handleLogin = async () => {
	if (isLoading.value) return

	errorMessage.value = null
	if (!validateForm()) {
		errorMessage.value = "請先完成必填欄位"
		return
	}

	isLoading.value = true

	try {
		await login({
			username: formData.value.account,
			password: formData.value.password,
		})

		toast.success("登入成功")

		// 登入成功後跳轉 - 檢查 redirect query 參數
		const redirectPath = sanitizeRedirectPath(route.query.redirect)
		await router.push(redirectPath)
	} catch (error) {
		const errorMsg = handleError(error, "登入失敗，請檢查帳號密碼")
		errorMessage.value = errorMsg || "登入失敗，請檢查帳號密碼"
	} finally {
		isLoading.value = false
	}
}
</script>
