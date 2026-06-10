<template>
	<div
		class="flex min-h-screen items-center justify-center bg-[linear-gradient(155deg,#7dc1cb_0%,#006191_100%)]"
	>
		<div class="flex items-center justify-center gap-[48px] translate-x-[-24px]">
			<!-- Hero Image/Illustration -->
			<div class="hidden items-center lg:flex lg:h-[840px]">
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
			<div class="mx-auto w-full max-w-[480px]">
				<!-- Login Card -->
				<div class="glass glass-card rounded-3xl px-8 py-16">
					<!-- Welcome Header -->
					<div class="mb-4 text-center">
						<div class="mx-auto mb-8 flex h-36 w-36 items-center justify-center">
							<ClientOnly>
								<HeroPicInline
									aria-label="YSOP"
									src="/YSOP.svg"
									line-group-id="line"
									sweep-id-prefix="ysop-logo-line-sweep"
									root-class="h-full w-full"
									:animate="true"
									class="h-36 w-36"
								/>
							</ClientOnly>
						</div>
						<h2 class="text-3xl text-white">歡迎使用</h2>
					</div>

					<!-- Login Form -->
					<form @submit.prevent="handleLogin" class="space-y-6">
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
							<p v-if="fieldErrors.account" :id="accountErrorId" class="form-error-text mt-1">
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
								class="form-error-text mt-1"
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
							class="form-error-banner"
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
					<div class="my-8 h-px bg-white/20"></div>

					<!-- Contact Info -->
					<div class="mx-auto w-fit text-center">
						<p class="text-base text-white/80">
							需要協助？
							<span
								class="group relative inline-block cursor-default underline decoration-white/40 underline-offset-2 transition-colors hover:text-white hover:decoration-white"
								tabindex="0"
								role="button"
								aria-label="請聯絡我們，滑鼠移入顯示聯絡 QR Code"
							>
								請聯絡我們
								<span
									class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
									aria-hidden="true"
								>
									<NuxtImg
										src="/yenshow_contact.png"
										alt="聯絡表單"
										loading="lazy"
										class="block size-40 max-w-none shrink-0 rounded-lg bg-white p-2 shadow-xl ring-1 ring-white/20"
									/>
								</span>
							</span>
						</p>
					</div>
				</div>

				<!-- Version Info -->
				<div class="text-gray-700 font-bold mt-8 text-center">
					<p class="text-xl">{{ productVersionDisplay }}</p>
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
import { useProductVersionDisplay } from "~/composables/core/useProductVersionDisplay"

definePageMeta({
	layout: false,
})

const productVersionDisplay = useProductVersionDisplay()

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
