import type { CategoryModbusConfig } from "~/types/lighting";
import type { DrainageStatusPointDef } from "~/types/location";

export type DrainageEquipmentKind = "pump" | "tank";
export type DrainageViewCategory = "pumping" | "sewage" | "drainage";

/**
 * 後端 GET /drainage/status 單筆設備快照
 */
export interface DrainageStatusItem {
	zoneId: string;
	zoneName: string;
	locationId: string;
	locationName: string;
	systemId: string;
	equipmentKind: DrainageEquipmentKind | string;
	viewCategory: DrainageViewCategory | string;
	uiStatus: "normal" | "warning" | "alarm" | "offline" | "unknown";
	raw?: Record<string, boolean | undefined>;
	error?: string;
}

export interface DrainageLocation {
	id?: string;
	systemId?: string;
	name: string;
	location?: { x: number; y: number };
	description?: string;
	deviceId?: number;
	modbus?: CategoryModbusConfig;
	equipmentKind?: DrainageEquipmentKind;
	viewCategory?: DrainageViewCategory;
	statusPoints?: Record<string, DrainageStatusPointDef>;
}

export interface DrainageZone {
	id?: string;
	name: string;
	imageUrl?: string;
	locations: DrainageLocation[];
	description?: string;
}
