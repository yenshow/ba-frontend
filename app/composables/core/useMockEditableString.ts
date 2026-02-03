export type UseMockEditableStringOptions = {
	key: string;
	defaultValue: string;
};

export const useMockEditableString = (options: UseMockEditableStringOptions) => {
	const { key, defaultValue } = options;

	const value = ref<string>(defaultValue);

	const readFromStorage = () => {
		if (!process.client) {
			return;
		}

		try {
			const stored = localStorage.getItem(key);
			if (stored && stored.trim().length > 0) {
				value.value = stored;
			}
		} catch {
			// 忽略 localStorage 讀取失敗
		}
	};

	const save = (nextValue: string) => {
		const normalized = nextValue?.trim() ?? "";

		if (normalized.length === 0) {
			reset();
			return;
		}

		value.value = normalized;

		if (!process.client) {
			return;
		}

		try {
			localStorage.setItem(key, normalized);
		} catch {
			// 忽略 localStorage 寫入失敗
		}
	};

	const reset = () => {
		value.value = defaultValue;

		if (!process.client) {
			return;
		}

		try {
			localStorage.removeItem(key);
		} catch {
			// 忽略 localStorage 刪除失敗
		}
	};

	onMounted(() => {
		readFromStorage();
	});

	watch(
		() => defaultValue,
		nextDefault => {
			if (!nextDefault?.trim?.()) {
				return;
			}

			// defaultValue 變更時，若 storage 沒有值就更新
			if (!process.client) {
				value.value = nextDefault;
				return;
			}

			try {
				const stored = localStorage.getItem(key);
				if (!stored || stored.trim().length === 0) {
					value.value = nextDefault;
				}
			} catch {
				value.value = nextDefault;
			}
		}
	);

	return {
		value,
		save,
		reset
	};
};

