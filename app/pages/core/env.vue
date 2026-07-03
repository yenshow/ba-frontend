<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">環境設定</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理平台備份排程與門禁資料匯出設定。</p>
			</div>
		</header>

		<div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 2xl:gap-8">
			<BackupScheduleSection class="h-full" />

			<section
				class="flex h-full flex-col rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
			>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
					<div class="flex flex-wrap items-center gap-4 2xl:gap-6">
						<h2 class="text-lg font-semibold text-white 2xl:text-xl">資料匯出</h2>
						<PageTabs
							v-model="activeTab"
							:tabs="EXPORT_TABS"
							:panels="false"
							aria-label="資料匯出方式"
							id-prefix="data-export-tab"
						/>
					</div>
					<button
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
						:disabled="actionDisabled"
						@click="handleAction"
					>
						{{ actionLabel }}
					</button>
				</div>

				<ExternalDatabaseSyncSection ref="dbSectionRef" v-show="activeTab === 'database'" />
				<RecordExportRulesSection ref="exportSectionRef" v-show="activeTab === 'export'" />
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import BackupScheduleSection from "~/components/env/BackupScheduleSection.vue"
import ExternalDatabaseSyncSection from "~/components/env/ExternalDatabaseSyncSection.vue"
import RecordExportRulesSection from "~/components/env/RecordExportRulesSection.vue"
import PageTabs, { type PageTabItem } from "~/components/common/PageTabs.vue"
import { unref } from "vue"

type ExportTab = "database" | "export"

type ExportSectionInstance = {
	openDialog: () => void
	actionLabel: string | Ref<string>
	actionDisabled: boolean | Ref<boolean>
}

const EXPORT_TABS: PageTabItem<ExportTab>[] = [
	{ id: "database", label: "資料庫對接" },
	{ id: "export", label: "記錄轉存" },
]

const activeTab = ref<ExportTab>("database")

const dbSectionRef = ref<ExportSectionInstance | null>(null)
const exportSectionRef = ref<ExportSectionInstance | null>(null)

const activeSection = computed(() =>
	activeTab.value === "database" ? dbSectionRef.value : exportSectionRef.value
)
const actionLabel = computed(() => unref(activeSection.value?.actionLabel) ?? "")
const actionDisabled = computed(() => unref(activeSection.value?.actionDisabled) ?? true)
const handleAction = () => activeSection.value?.openDialog()

definePageMeta({
	layout: "default",
})
</script>
