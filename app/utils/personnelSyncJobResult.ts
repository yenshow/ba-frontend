/**
 * 人員同步 Job 完成判定（單點／全點共用契約）。
 * 後端可回 status=completed 且 error 有值、result 為空 —— 不得視為成功。
 */
export const assertPersonnelSyncJobOk = (job: {
	error?: { message?: string } | string | null
}): void => {
	const message = typeof job.error === "string" ? job.error : job.error?.message
	if (message) throw new Error(message)
}
