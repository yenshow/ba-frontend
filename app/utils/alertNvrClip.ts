/** 警報 NVR 片段回放：由攝影機連動組出可回放目標 */

export type AlertNvrClipTargetInput = {
	cameraDeviceIds: number[]
	nvrTrackIds: number[]
}

export type AlertNvrClipTarget = {
	nvrId: number
	trackId: number
	label?: string
}

export const buildAlertNvrClipTargets = (
	link: AlertNvrClipTargetInput
): AlertNvrClipTarget[] => {
	const targets: AlertNvrClipTarget[] = []
	for (let i = 0; i < link.cameraDeviceIds.length; i++) {
		const trackId = Number(link.nvrTrackIds[i])
		if (!(trackId > 0)) continue
		const nvrId = link.cameraDeviceIds[i]
		targets.push({
			nvrId,
			trackId,
			label: `NVR #${nvrId} · 通道 ${trackId}`,
		})
	}
	return targets
}
