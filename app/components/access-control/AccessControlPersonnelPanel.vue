<template>
	<div v-if="deviceId" class="mb-4 rounded border border-white/10 bg-white/5 p-3">
		<div class="mb-2 flex items-center justify-between">
			<h4 class="text-sm font-medium text-white 2xl:text-base">{{ title }}</h4>
			<button
				type="button"
				class="btn-secondary text-xs 2xl:text-sm"
				@click="showAddPersonDialog = true"
			>
				新增人員
			</button>
		</div>

		<div v-if="isLoading" class="py-2 text-center text-xs text-white/50">載入中...</div>
		<div v-else class="space-y-2">
			<div class="show-scrollbar max-h-40 overflow-y-auto">
				<div
					v-for="p in personnelList"
					:key="p.employeeNo"
					class="flex items-center justify-between rounded border border-white/10 px-2 py-1.5 text-xs 2xl:text-sm"
				>
					<span class="text-white/90">{{ p.employeeNo }} - {{ p.name || "-" }}</span>
					<div class="flex gap-1">
						<button
							type="button"
							class="rounded px-2 py-0.5 text-cyan-300 hover:bg-white/10"
							@click="handleUploadFace(p.employeeNo!)"
						>
							人臉
						</button>
						<button
							type="button"
							class="rounded px-2 py-0.5 text-rose-300 hover:bg-white/10"
							@click="handleDelete(p.employeeNo!)"
						>
							刪除
						</button>
					</div>
				</div>

				<p v-if="personnelList.length === 0" class="py-2 text-white/50">尚無人員</p>
			</div>
		</div>

		<AccessControlAddPersonDialog
			v-model="showAddPersonDialog"
			:device-id="deviceId"
			:role-label="roleLabel"
			@created="refresh"
		/>
	</div>
</template>

<script setup lang="ts">
import { useAccessControlApi, type AccessControlUserInfo } from "~/composables/systems/useAccessControlApi";
import AccessControlAddPersonDialog from "~/components/access-control/AccessControlAddPersonDialog.vue";

interface Props {
	title: string;
	roleLabel: string;
	deviceId?: number;
}

interface Emits {
	(e: "update:list", list: AccessControlUserInfo[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const accessControlApi = useAccessControlApi();

const personnelList = ref<AccessControlUserInfo[]>([]);
const isLoading = ref(false);
const showAddPersonDialog = ref(false);

const refresh = async () => {
	if (!props.deviceId) {
		personnelList.value = [];
		emit("update:list", []);
		return;
	}
	isLoading.value = true;
	try {
		const res = await accessControlApi.searchUserInfo(props.deviceId, { maxResults: 200 });
		personnelList.value = (res.list || []).filter((p) => !!p.employeeNo);
		emit("update:list", personnelList.value);
	} catch {
		personnelList.value = [];
		emit("update:list", []);
	} finally {
		isLoading.value = false;
	}
};

watch(
	() => props.deviceId,
	() => void refresh(),
	{ immediate: true }
);

const handleDelete = async (employeeNo: string) => {
	if (!props.deviceId) return;
	if (!window.confirm(`確定要刪除此人員（${employeeNo}）？`)) return;
	await accessControlApi.deleteUserInfo(props.deviceId, { employeeNo });
	await refresh();
};

const handleUploadFace = (employeeNo: string) => {
	if (!props.deviceId) return;
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;
		await accessControlApi.uploadFace(props.deviceId!, employeeNo, file);
		window.alert("上傳成功");
	};
	input.click();
};
</script>

