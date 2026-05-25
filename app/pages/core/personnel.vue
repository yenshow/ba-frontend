<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<header class="me-4 flex flex-col gap-1 2xl:gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理人員資料、人員群組、與門禁權限</p>
			</header>

			<PageTabs
				v-model="activeTab"
				:tabs="tabs"
				:panels="false"
				list-class="me-auto"
				aria-label="人員管理分頁"
				id-prefix="personnel-tab"
			/>
		</div>

		<PageTabs
			v-model="activeTab"
			:tabs="tabs"
			:list="false"
			aria-label="人員管理分頁"
			id-prefix="personnel-tab"
		>
			<template #manage>
				<PersonnelManageTab
					:can-edit="canEdit"
					:person-status-labels="personStatusLabels"
					:table-header-class="tableHeaderClass"
					:table-cell-class="tableCellClass"
					:get-person-status-badge-class="getPersonStatusBadgeClass"
					:persons-tab="personsTab"
				/>
			</template>

			<template #sync>
				<PersonnelSyncTab
					:can-edit="canEdit"
					:table-header-class="tableHeaderClass"
					:table-cell-class="tableCellClass"
					:sync-tab="syncTab"
				/>
			</template>
		</PageTabs>
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
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab";
import { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab";
import { PERSON_STATUS_LABELS, getPersonStatusBadgeClass } from "~/utils/personnelUtils";
import PageTabs from "~/components/common/PageTabs.vue";
import PersonnelManageTab from "~/components/personnel/PersonnelManageTab.vue";
import PersonnelSyncTab from "~/components/personnel/PersonnelSyncTab.vue";

definePageMeta({ layout: "auxiliary" });

const personnelApi: PersonnelApi = usePersonnelApi();
const deviceApi = useDeviceApi();
const accessControlApi = useAccessControlApi();
const locationApi = useLocationApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const { canWrite } = useAuth();
const canEdit = canWrite;

const activeTab = ref<"manage" | "sync">("manage");
const tabs: { id: "manage" | "sync"; label: string }[] = [
	{ id: "manage", label: "人員列表" },
	{ id: "sync", label: "門禁權限" }
];

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";

const personStatusLabels = PERSON_STATUS_LABELS;

const personsTab = usePersonnelPersonsTab({
	personnelApi,
	deviceApi,
	accessControlApi,
	toast,
	handleApiError
});
const syncTab = usePersonnelSyncTab({ personnelApi, locationApi, toast, handleApiError, canEdit });

watch(
	activeTab,
	tab => {
		if (tab === "manage") void personsTab.loadPersons();
		else if (tab === "sync") void syncTab.loadSyncableLocations();
	},
	{ immediate: true }
);
</script>
