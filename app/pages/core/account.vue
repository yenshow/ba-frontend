<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="space-y-2 2xl:space-y-4">
			<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">帳號設定</h1>
			<p class="text-base text-white/80 2xl:text-xl">檢視帳號資訊與變更登入密碼</p>
		</header>

		<div class="grid gap-6 lg:grid-cols-2 lg:items-stretch 2xl:gap-8">
			<section
				class="flex flex-col rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
			>
				<h2 class="mb-4 text-lg font-semibold text-white 2xl:mb-6 2xl:text-xl">帳號資訊</h2>
				<div class="flex flex-col gap-4 2xl:gap-6">
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>用戶名</span>
						<input
							:value="user?.username ?? ''"
							type="text"
							readonly
							class="form-input form-input-readonly"
							aria-readonly="true"
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>角色</span>
						<input
							:value="roleLabel"
							type="text"
							readonly
							class="form-input form-input-readonly"
							aria-readonly="true"
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>狀態</span>
						<input
							:value="statusLabel"
							type="text"
							readonly
							class="form-input form-input-readonly"
							aria-readonly="true"
						/>
					</label>
				</div>
			</section>

			<section
				class="flex flex-col rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
			>
				<h2 class="mb-2 text-lg font-semibold text-white 2xl:text-xl">變更密碼</h2>
				<p class="mb-4 text-sm text-white/60 2xl:mb-6 2xl:text-base">
					變更成功後將自動登出，請使用新密碼重新登入。
				</p>

				<form class="flex flex-1 flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>舊密碼</span>
						<input
							v-model="form.oldPassword"
							type="text"
							required
							autocomplete="off"
							spellcheck="false"
							class="form-input"
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>新密碼</span>
						<input
							v-model="form.newPassword"
							type="text"
							required
							minlength="6"
							autocomplete="off"
							spellcheck="false"
							class="form-input"
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>確認新密碼</span>
						<input
							v-model="form.confirmPassword"
							type="text"
							required
							minlength="6"
							autocomplete="off"
							spellcheck="false"
							class="form-input"
						/>
					</label>

					<p v-if="errorMessage" class="form-error-text">
						{{ errorMessage }}
					</p>

					<div class="mt-auto flex gap-3 pt-2">
						<button type="submit" class="btn-primary" :disabled="isSubmitting">
							{{ isSubmitting ? "處理中..." : "更新密碼" }}
						</button>
					</div>
				</form>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useAccountSettings } from "~/composables/systems/users/useAccountSettings"

definePageMeta({
	layout: "default",
})

const { user, roleLabel, statusLabel, form, isSubmitting, errorMessage, handleSubmit } =
	useAccountSettings()
</script>
