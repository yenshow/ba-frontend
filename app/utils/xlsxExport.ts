/**
 * 最小 OOXML xlsx 寫入（無外部依賴）：雙工作表完整報表
 * 人流／車輛／時段簽到與後端備份版面對齊
 */

export type XlsxTableSection = {
	title: string
	headers: string[]
	/** 只輸出 headers 對應欄；多餘欄位（如 key／hasOnSite）會忽略 */
	rows: Array<Record<string, unknown>>
}

type XlsxSheetSpec = {
	name: string
	sections: XlsxTableSection[]
	includeSectionTitles?: boolean
}

const escapeXml = (value: unknown): string =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")

const sanitizeSheetName = (name: string): string => {
	const raw = String(name || "明細").trim() || "明細"
	return raw.replace(/[\\/*?:[\]]/g, "_").slice(0, 31)
}

const colName = (index1: number): string => {
	let n = index1
	let s = ""
	while (n > 0) {
		const m = (n - 1) % 26
		s = String.fromCharCode(65 + m) + s
		n = Math.floor((n - 1) / 26)
	}
	return s
}

const CRC_TABLE = (() => {
	const table = new Uint32Array(256)
	for (let i = 0; i < 256; i += 1) {
		let c = i
		for (let k = 0; k < 8; k += 1) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}
		table[i] = c >>> 0
	}
	return table
})()

const crc32 = (data: Uint8Array): number => {
	let c = 0xffffffff
	for (let i = 0; i < data.length; i += 1) {
		c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
	}
	return (c ^ 0xffffffff) >>> 0
}

const u16 = (n: number): Uint8Array => {
	const b = new Uint8Array(2)
	b[0] = n & 0xff
	b[1] = (n >>> 8) & 0xff
	return b
}

const u32 = (n: number): Uint8Array => {
	const b = new Uint8Array(4)
	b[0] = n & 0xff
	b[1] = (n >>> 8) & 0xff
	b[2] = (n >>> 16) & 0xff
	b[3] = (n >>> 24) & 0xff
	return b
}

const concatBytes = (parts: Uint8Array[]): Uint8Array => {
	const total = parts.reduce((sum, p) => sum + p.length, 0)
	const out = new Uint8Array(total)
	let offset = 0
	for (const p of parts) {
		out.set(p, offset)
		offset += p.length
	}
	return out
}

const textEncoder = new TextEncoder()

const cellXml = (col: number, row: number, value: unknown): string =>
	`<c r="${colName(col)}${row}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`

const buildSheetXml = (
	sections: XlsxTableSection[],
	includeSectionTitles: boolean,
): string => {
	const rowsXml: string[] = []
	let r = 1
	sections.forEach((section, si) => {
		if (si > 0) r += 1
		if (includeSectionTitles && section.title) {
			rowsXml.push(`<row r="${r}">${cellXml(1, r, section.title)}</row>`)
			r += 1
		}
		rowsXml.push(
			`<row r="${r}">${section.headers.map((h, i) => cellXml(i + 1, r, h)).join("")}</row>`,
		)
		r += 1
		for (const row of section.rows) {
			rowsXml.push(
				`<row r="${r}">${section.headers.map((h, i) => cellXml(i + 1, r, row[h] ?? "")).join("")}</row>`,
			)
			r += 1
		}
	})
	return (
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
		`<sheetData>${rowsXml.join("")}</sheetData>` +
		`</worksheet>`
	)
}

const buildZipStore = (files: { name: string; data: Uint8Array }[]): Uint8Array => {
	const localParts: Uint8Array[] = []
	const centralParts: Uint8Array[] = []
	let offset = 0

	for (const file of files) {
		const nameBytes = textEncoder.encode(file.name)
		const data = file.data
		const crc = crc32(data)
		const gpFlag = 0x0800
		const localHeader = concatBytes([
			u32(0x04034b50),
			u16(20),
			u16(gpFlag),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(nameBytes.length),
			u16(0),
			nameBytes,
			data,
		])
		localParts.push(localHeader)
		centralParts.push(
			concatBytes([
				u32(0x02014b50),
				u16(20),
				u16(20),
				u16(gpFlag),
				u16(0),
				u16(0),
				u16(0),
				u32(crc),
				u32(data.length),
				u32(data.length),
				u16(nameBytes.length),
				u16(0),
				u16(0),
				u16(0),
				u16(0),
				u32(0),
				u32(offset),
				nameBytes,
			]),
		)
		offset += localHeader.length
	}

	const centralDir = concatBytes(centralParts)
	return concatBytes([
		...localParts,
		centralDir,
		concatBytes([
			u32(0x06054b50),
			u16(0),
			u16(0),
			u16(files.length),
			u16(files.length),
			u32(centralDir.length),
			u32(offset),
			u16(0),
		]),
	])
}

const buildXlsxBlob = (sheets: XlsxSheetSpec[]): Blob => {
	const safeSheets = sheets.map((s, i) => ({
		name: sanitizeSheetName(s.name || `Sheet${i + 1}`),
		sections: s.sections,
		includeSectionTitles: s.includeSectionTitles !== false,
	}))

	const sheetFiles = safeSheets.map((sheet, i) => ({
		name: `xl/worksheets/sheet${i + 1}.xml`,
		data: textEncoder.encode(buildSheetXml(sheet.sections, sheet.includeSectionTitles)),
	}))

	const workbookXml =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
		`xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
		`<sheets>` +
		safeSheets
			.map(
				(s, i) =>
					`<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
			)
			.join("") +
		`</sheets></workbook>`

	const workbookRels =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		safeSheets
			.map(
				(_, i) =>
					`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
			)
			.join("") +
		`</Relationships>`

	const contentTypes =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
		`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
		`<Default Extension="xml" ContentType="application/xml"/>` +
		`<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
		safeSheets
			.map(
				(_, i) =>
					`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
			)
			.join("") +
		`</Types>`

	const rootRels =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
		`</Relationships>`

	const zip = buildZipStore([
		{ name: "[Content_Types].xml", data: textEncoder.encode(contentTypes) },
		{ name: "_rels/.rels", data: textEncoder.encode(rootRels) },
		{ name: "xl/workbook.xml", data: textEncoder.encode(workbookXml) },
		{ name: "xl/_rels/workbook.xml.rels", data: textEncoder.encode(workbookRels) },
		...sheetFiles,
	])

	return new Blob([zip], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	})
}

/** 完整報表雙工作表：統計（進出＋群組）／明細 */
export const downloadReportWorkbook = (
	statsSections: XlsxTableSection[],
	detailSection: XlsxTableSection,
	filename: string,
): void => {
	const blob = buildXlsxBlob([
		{ name: "統計", sections: statsSections, includeSectionTitles: true },
		{
			name: detailSection.title || "明細",
			sections: [detailSection],
			includeSectionTitles: false,
		},
	])
	const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = name
	link.setAttribute("aria-label", "下載 Excel")
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
