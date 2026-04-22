<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="open"
				class="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					role="dialog"
					aria-labelledby="permission-dialog-title"
					aria-modal="true"
				>
					<header class="flex items-center justify-between">
						<h2
							id="permission-dialog-title"
							class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl"
						>
							使用權限 － {{ targetUsername }}
						</h2>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div v-if="isLoading" class="py-8 text-center text-white/70">載入中...</div>
					<div v-else-if="errorMessage" class="rounded-xl bg-rose-500/20 px-4 py-3 text-rose-200">
						{{ errorMessage }}
					</div>
					<template v-else>
						<div class="space-y-6">
							<section
								v-for="cat in categoryOrder"
								:key="cat"
								class="rounded-xl border border-white/20 bg-white/5 p-4"
							>
								<h3 class="mb-3 text-base font-medium uppercase tracking-wider text-white/80">
									{{ getCategoryLabel(cat) }}
								</h3>
								<div class="space-y-2">
									<label
										v-for="def in definitionsByCategory.get(cat) ?? []"
										:key="def.id"
										class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
									>
										<input
											v-model="localGranted[def.id]"
											type="checkbox"
											class="h-5 w-5 rounded border-white/30 bg-white/10"
										/>
										<span class="text-base text-white">{{ def.name || def.code }}</span>
									</label>
								</div>
							</section>
						</div>

						<footer class="mt-4 flex items-center justify-between gap-3">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<button type="button" class="btn-primary" :disabled="isSaving" @click="handleSave">
								{{ isSaving ? "儲存中..." : "儲存" }}
							</button>
						</footer>
					</template>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { PermissionDefinition, UserPermissionSettings } from "~/types/user";
import { useUserApi } from "~/composables/systems/users/useUserApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import { MODULE_CATEGORY_LABELS, MODULE_CATEGORY_ORDER } from "~/constants/moduleCategories";

const props = defineProps<{
	open: boolean;
	userId: number;
	targetUsername: string;
}>();

const emit = defineEmits<{
	(e: "close"): void;
	(e: "saved"): void;
}>();

const userApi = useUserApi();
const { handleError } = useErrorHandler();
const moduleRegistry = useModuleRegistry();

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);
const definitions = ref<PermissionDefinition[]>([]);
const settings = ref<UserPermissionSettings | null>(null);
const localGranted = ref<Record<number, boolean>>({});

const systemPermissionCategoryByCode = computed(() => {
	const map = new Map<string, string>();
	const modules = moduleRegistry.registry.value?.modules ?? [];
	for (const m of modules) {
		if (!m.permissionCode) continue;
		if (!m.category) continue;
		map.set(m.permissionCode, m.category);
	}
	return map;
});

const allowedPermissionCodes = computed(() => {
	const s = new Set<string>();
	const modules = moduleRegistry.registry.value?.modules ?? [];
	for (const m of modules) {
		if (!m.permissionCode) continue;
		s.add(m.permissionCode);
	}
	return s;
});

const definitionsByCategory = computed(() => {
	const map = new Map<string, PermissionDefinition[]>();
	const systemCategoryMap = systemPermissionCategoryByCode.value;
	const allowedCodes = allowedPermissionCodes.value;

	for (const d of definitions.value) {
		// 僅顯示「registry 有宣告 permissionCode」的系統權限，避免顯示不存在的頁面/殘留權限碼
		if (!allowedCodes.has(d.code)) continue;
		const categoryKey = systemCategoryMap.get(d.code) ?? "system";
		if (!map.has(categoryKey)) map.set(categoryKey, []);
		map.get(categoryKey)!.push(d);
	}

	for (const [, defs] of map) {
		defs.sort(
			(a, b) => a.sort_order - b.sort_order || (a.name || a.code).localeCompare(b.name || b.code)
		);
	}

	return map;
});

const categoryOrder = computed(() => {
	const keys = new Set(definitionsByCategory.value.keys());
	const order: string[] = [];
	for (const key of MODULE_CATEGORY_ORDER) {
		if (keys.has(key)) order.push(key);
	}
	if (keys.has("system")) order.push("system");
	return order;
});

const getCategoryLabel = (cat: string) => {
	if (cat in MODULE_CATEGORY_LABELS)
		return MODULE_CATEGORY_LABELS[cat as keyof typeof MODULE_CATEGORY_LABELS];
	if (cat === "system") return "未歸類";
	return cat;
};

const load = async () => {
	if (!props.userId || !props.open) return;
	isLoading.value = true;
	errorMessage.value = null;
	try {
		await moduleRegistry.ensureLoaded();
		const [defRes, settingsRes] = await Promise.all([
			userApi.getPermissionDefinitions(false),
			userApi.getUserPermissions(props.userId),
		]);
		definitions.value = defRes.definitions;
		settings.value = settingsRes;
		const granted: Record<number, boolean> = {};
		for (const d of defRes.definitions) {
			granted[d.id] = settingsRes.effectiveCodes.includes(d.code);
		}
		localGranted.value = granted;
	} catch (error) {
		errorMessage.value = handleError(error, "載入權限設定失敗") || "載入失敗";
	} finally {
		isLoading.value = false;
	}
};

const handleClose = () => {
	emit("close");
};

const handleSave = async () => {
	if (!props.userId || !settings.value) return;
	isSaving.value = true;
	errorMessage.value = null;
	try {
		const roleDefaults = settings.value.roleDefaultsByPermId;
		const overrides: { permission_id: number; granted: boolean }[] = [];
		for (const [permIdStr, granted] of Object.entries(localGranted.value)) {
			const permId = Number(permIdStr);
			const roleDefault = roleDefaults[permId];
			if (roleDefault !== granted) {
				overrides.push({ permission_id: permId, granted });
			}
		}
		await userApi.updateUserPermissions(props.userId, overrides);
		emit("saved");
		handleClose();
	} catch (error) {
		errorMessage.value = handleError(error, "儲存權限失敗") || "儲存失敗";
	} finally {
		isSaving.value = false;
	}
};

watch(
	() => [props.open, props.userId] as const,
	([open, userId]) => {
		if (open && userId) load();
	},
	{ immediate: true }
);
</script>
