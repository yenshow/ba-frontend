<template>
	<div class="page-shell">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<header class="me-4 flex flex-col gap-1 2xl:gap-2">
				<h1 class="page-title">人員管理</h1>
				<p class="page-subtitle">管理人員資料與人員群組</p>
			</header>
		</div>

		<PersonnelManageTab
			:can-manage-groups="canManageGroups"
			:can-create-group="canCreateGroup"
			:can-update-group="canUpdateGroup"
			:can-delete-group="canDeleteGroup"
			:can-create-person="canCreatePerson"
			:can-update-person="canUpdatePerson"
			:can-delete-person="canDeletePerson"
			:person-status-labels="personStatusLabels"
			:get-person-status-badge-class="getPersonStatusBadgeClass"
			:persons-tab="personsTab"
		/>
	</div>
</template>

<script setup lang="ts">
import { usePersonnelRbac } from "~/composables/core/useAccessGate";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import {
	usePersonnelApi,
	type PersonnelApi
} from "~/composables/systems/personnel/usePersonnelApi";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { useAccessControlApi } from "~/composables/systems/accessControl/useAccessControlApi";
import { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab";
import { PERSON_STATUS_LABELS, getPersonStatusBadgeClass } from "~/utils/personnelUtils";
import PersonnelManageTab from "~/components/personnel/PersonnelManageTab.vue";

definePageMeta({ layout: "auxiliary" });

const personnelApi: PersonnelApi = usePersonnelApi();
const deviceApi = useDeviceApi();
const accessControlApi = useAccessControlApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const {
	canManageGroups,
	canCreateGroup,
	canUpdateGroup,
	canDeleteGroup,
	canCreatePerson,
	canUpdatePerson,
	canDeletePerson
} = usePersonnelRbac();

const personStatusLabels = PERSON_STATUS_LABELS;

const personsTab = usePersonnelPersonsTab({
	personnelApi,
	deviceApi,
	accessControlApi,
	toast,
	handleApiError
});

onMounted(() => {
	void personsTab.loadPersons();
});
</script>
