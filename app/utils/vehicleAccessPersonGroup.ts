/**
 * ISAPI 車輛人員群組：成員列與人流門禁單位人員對齊（頭像、進出時間、在場）
 */
import type { Person } from "~/types/personnel";
import type { VehicleDataLog, VehicleGroupMemberItem } from "~/types/vehicleAccess";
import {
	buildGroupMemberPresenceFromLogs,
	normalizePlate,
	releasedLogs
} from "~/utils/vehicleAccessPassageStats";

const normalizePersonPhotoUrl = (faceUrl: string | null | undefined): string | undefined => {
	const trimmed = faceUrl != null ? String(faceUrl).trim() : "";
	if (!trimmed) return undefined;
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const collectPlates = (person: Person): string[] =>
	(person.license_plates ?? [])
		.map(p => p.plate_number?.trim())
		.filter(Boolean) as string[];

const isPersonPresent = (person: Person, validLogs: VehicleDataLog[]): boolean => {
	const plates = collectPlates(person);
	if (!plates.length) return false;
	return plates.some(plate => buildGroupMemberPresenceFromLogs(plate, validLogs).isPresent);
};

/** 多車牌合併：任一車牌在場即視為在場；時間取最近一筆進場所屬車牌 */
export const buildPersonGroupMemberItem = (
	person: Person,
	validLogs: VehicleDataLog[]
): VehicleGroupMemberItem => {
	const name = person.full_name?.trim() || person.employee_no || "—";
	const photoUrl = normalizePersonPhotoUrl(person.face_url);
	const plates = collectPlates(person);
	const isPresent = isPersonPresent(person, validLogs);

	if (!plates.length) {
		return { id: person.id, name, owner_name: name, plate_license: "—", photoUrl, isPresent: false };
	}

	const plateNorms = new Set(plates.map(normalizePlate));
	const sorted = releasedLogs(validLogs)
		.filter(log => plateNorms.has(normalizePlate(log.license_plate)))
		.sort(
			(a, b) =>
				new Date(a.trigger_time ?? 0).getTime() - new Date(b.trigger_time ?? 0).getTime()
		);

	const lastEntry = [...sorted].reverse().find(log => log.lane_type === 1);
	if (!lastEntry?.trigger_time) {
		return {
			id: person.id,
			name,
			owner_name: name,
			plate_license: plates.join("、"),
			photoUrl,
			isPresent
		};
	}

	const presence = buildGroupMemberPresenceFromLogs(
		lastEntry.license_plate ?? plates[0] ?? "",
		validLogs
	);

	return {
		id: person.id,
		name,
		owner_name: name,
		plate_license: plates.join("、"),
		photoUrl,
		lastEntryDate: presence.lastEntryDate,
		entryTime: presence.entryTime,
		exitTime: presence.exitTime,
		isPresent
	};
};

export const buildPersonGroupMemberItems = (
	members: Person[],
	validLogs: VehicleDataLog[]
): VehicleGroupMemberItem[] => members.map(p => buildPersonGroupMemberItem(p, validLogs));
