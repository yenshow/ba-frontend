/**
 *   node --experimental-strip-types --test tests/unit/modbusWriteResult.test.mjs
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { assertModbusWriteOk } from "../../app/utils/modbusWriteResult.ts"

test("assertModbusWriteOk: success true 通過", () => {
	assert.doesNotThrow(() => assertModbusWriteOk({ success: true }))
})

test("assertModbusWriteOk: success false 拋錯", () => {
	assert.throws(() => assertModbusWriteOk({ success: false }), /設備寫入失敗/)
})

test("assertModbusWriteOk: 缺欄位／null 拋錯", () => {
	assert.throws(() => assertModbusWriteOk(null), /設備寫入失敗/)
	assert.throws(() => assertModbusWriteOk({}), /設備寫入失敗/)
})
