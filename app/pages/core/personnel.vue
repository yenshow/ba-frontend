<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<header class="me-4 flex flex-col gap-1 2xl:gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理人員資料、人員群組、與門禁權限</p>
			</header>

			<div class="me-auto space-x-2 rounded-xl border border-white/20 bg-white/5 p-1">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					@click="activeTab = tab.id"
					:class="[
						'rounded-lg px-3 py-1.5 text-base transition-colors 2xl:text-lg',
						activeTab === tab.id ? 'bg-cyan-500 text-white' : 'text-white/80 hover:bg-white/10'
					]"
					:aria-label="tab.label"
				>
					{{ tab.label }}
				</button>
			</div>
		</div>

		<PersonnelGroupsTab
			v-show="activeTab === 'groups'"
			:can-edit="canEdit"
			:table-header-class="tableHeaderClass"
			:table-cell-class="tableCellClass"
			:is-active="activeTab === 'groups'"
		/>

		<PersonnelPersonsTab
			v-show="activeTab === 'persons'"
			:can-edit="canEdit"
			:person-status-labels="personStatusLabels"
			:table-header-class="tableHeaderClass"
			:table-cell-class="tableCellClass"
			:get-person-status-badge-class="getPersonStatusBadgeClass"
			:persons-tab="personsTab"
		/>

		<PersonnelSyncTab
			v-show="activeTab === 'sync'"
			:can-edit="canEdit"
			:table-header-class="tableHeaderClass"
			:table-cell-class="tableCellClass"
			:sync-tab="syncTab"
		/>
	</div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import {
	usePersonnelApi,
	type PersonnelApi
} from "~/composables/systems/personnel/usePersonnelApi";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { useAccessControlApi } from "~/composables/systems/accessControl/useAccessControlApi";
import { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab";
import { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab";
import PersonnelGroupsTab from "~/components/personnel/page/PersonnelGroupsTab.vue";
import PersonnelPersonsTab from "~/components/personnel/page/PersonnelPersonsTab.vue";
import PersonnelSyncTab from "~/components/personnel/page/PersonnelSyncTab.vue";

definePageMeta({ layout: "default" });

const personnelApi: PersonnelApi = usePersonnelApi();
const deviceApi = useDeviceApi();
const accessControlApi = useAccessControlApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const { isAdmin, isOperator } = useAuth();
const canEdit = computed(() => Boolean(isAdmin.value || isOperator.value));

const activeTab = ref<"persons" | "groups" | "sync">("persons");
const tabs: { id: "persons" | "groups" | "sync"; label: string }[] = [
	{ id: "persons", label: "人員列表" },
	{ id: "groups", label: "人員群組" },
	{ id: "sync", label: "設備同步" }
];

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";

const personStatusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	deleted: "已刪除"
};

const getPersonStatusBadgeClass = (status: string) => {
	const classes: Record<string, string> = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		deleted: "bg-gray-500/20 text-gray-200"
	};
	return classes[status] || classes.inactive;
};

const personsTab = usePersonnelPersonsTab({
	personnelApi,
	deviceApi,
	accessControlApi,
	toast,
	handleApiError
});
const syncTab = usePersonnelSyncTab({ personnelApi, toast, handleApiError, canEdit });

watch(
	activeTab,
	tab => {
		if (tab === "persons") void personsTab.loadPersons();
		else if (tab === "sync") void syncTab.loadSyncableLocations();
	},
	{ immediate: true }
);
</script>
