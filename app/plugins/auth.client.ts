/** 客戶端：恢復登入狀態並載入授權（供鎖頭與路由守衛使用） */
import { useAuth } from "~/composables/core/useAuth";
import { useLicense } from "~/composables/core/useLicense";

export default defineNuxtPlugin(async () => {
	await useAuth().init();
	await useLicense().fetchLicense({ force: true });
});
