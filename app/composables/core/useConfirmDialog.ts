import { ref } from "vue";

export interface ConfirmDialogConfig {
	title: string;
	message: string;
	details?: string;
	type: "warning" | "danger" | "info";
	confirmText?: string;
	cancelText?: string;
}

/** `showDialog` 可直接用於 ConfirmDialog 的 `v-model`；`config` 可直接綁定 title／message 等 props。 */
export function useConfirmDialog() {
	const showDialog = ref(false);
	const config = ref<ConfirmDialogConfig>({
		title: "確認",
		message: "",
		details: "",
		type: "warning"
	});

	const show = (newConfig: ConfirmDialogConfig) => {
		config.value = {
			confirmText: "確定",
			cancelText: "取消",
			...newConfig
		};
		showDialog.value = true;
	};

	const hide = () => {
		showDialog.value = false;
	};

	return {
		showDialog,
		config,
		show,
		hide
	};
}

