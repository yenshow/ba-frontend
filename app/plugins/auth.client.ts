/** 客戶端認證初始化：恢復登入狀態並驗證 token */
import { useAuth } from "~/composables/core/useAuth";

export default defineNuxtPlugin(async () => {
	await useAuth().init();
});
