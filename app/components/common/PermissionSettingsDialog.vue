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
									{{ CATEGORY_LABELS[cat] || cat }}
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
import { useUserApi } from "~/composables/systems/useUserApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

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

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);
const definitions = ref<PermissionDefinition[]>([]);
const settings = ref<UserPermissionSettings | null>(null);
const localGranted = ref<Record<number, boolean>>({});

const CATEGORY_LABELS: Record<string, string> = {
	system: "可使用的系統",
	resource: "資源權限",
	configuration: "組態權限",
	operation: "操作權限"
};

const categoryOrder = computed(() =>
	definitions.value.some(d => d.category === "system")
		? ["system"]
		: ["resource", "configuration", "operation"]
);

const definitionsByCategory = computed(() => {
	const order = categoryOrder.value;
	const map = new Map<string, PermissionDefinition[]>();
	for (const d of definitions.value) {
		const cat = d.category || "operation";
		if (!order.includes(cat)) continue;
		if (!map.has(cat)) map.set(cat, []);
		map.get(cat)!.push(d);
	}
	for (const cat of order) {
		map.get(cat)?.sort((a, b) => a.sort_order - b.sort_order);
	}
	return map;
});

const load = async () => {
	if (!props.userId || !props.open) return;
	isLoading.value = true;
	errorMessage.value = null;
	try {
		const [defRes, settingsRes] = await Promise.all([
			userApi.getPermissionDefinitions(false),
			userApi.getUserPermissions(props.userId)
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
