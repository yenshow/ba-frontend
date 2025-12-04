# 後端設備類型管理實作指南

## 概述

實作 Modbus 設備類型管理功能，初期提供完整的 CRUD API，後續改為從 JSON 文件讀取。

## 資料庫結構

### 設備類型表 (device_types)

```sql
CREATE TABLE device_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '設備類型名稱',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '設備類型代碼',
    description TEXT COMMENT '設備類型描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 預設設備類型資料

```sql
INSERT INTO device_types (name, code, description) VALUES
('DDC 控制器', 'ddc_controller', '直接數位控制系統控制器'),
('感測器', 'sensor', '各種環境感測器'),
('執行器', 'actuator', '控制執行器'),
('閘道器', 'gateway', 'Modbus 閘道器設備');
```

## API 路由設計

### 1. 取得所有設備類型

```
GET /api/modbus/device-types
```

**回應：**
```json
{
  "device_types": [
    {
      "id": 1,
      "name": "DDC 控制器",
      "code": "ddc_controller",
      "description": "直接數位控制系統控制器",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. 取得單一設備類型

```
GET /api/modbus/device-types/:id
```

### 3. 建立設備類型（管理員）

```
POST /api/modbus/device-types
Content-Type: application/json

{
  "name": "新設備類型",
  "code": "new_device_type",
  "description": "設備類型描述"
}
```

### 4. 更新設備類型（管理員）

```
PUT /api/modbus/device-types/:id
Content-Type: application/json

{
  "name": "更新後的設備類型",
  "code": "updated_device_type",
  "description": "更新後的描述"
}
```

### 5. 刪除設備類型（管理員）

```
DELETE /api/modbus/device-types/:id
```

## 後端實作範例（Node.js/Express）

### 1. 路由檔案：`routes/modbus/deviceTypes.js`

```javascript
const express = require('express');
const router = express.Router();
const deviceTypeController = require('../../controllers/modbus/deviceTypeController');
const { authenticate, isAdmin } = require('../../middleware/auth');

// 取得所有設備類型（公開）
router.get('/', deviceTypeController.getAllDeviceTypes);

// 取得單一設備類型（公開）
router.get('/:id', deviceTypeController.getDeviceTypeById);

// 建立設備類型（需要管理員權限）
router.post('/', authenticate, isAdmin, deviceTypeController.createDeviceType);

// 更新設備類型（需要管理員權限）
router.put('/:id', authenticate, isAdmin, deviceTypeController.updateDeviceType);

// 刪除設備類型（需要管理員權限）
router.delete('/:id', authenticate, isAdmin, deviceTypeController.deleteDeviceType);

module.exports = router;
```

### 2. 控制器檔案：`controllers/modbus/deviceTypeController.js`

```javascript
const db = require('../../config/database');
const fs = require('fs').promises;
const path = require('path');

// 設備類型 JSON 文件路徑
const DEVICE_TYPES_JSON_PATH = path.join(__dirname, '../../data/device-types.json');

// 從 JSON 文件讀取設備類型（未來使用）
async function loadDeviceTypesFromJSON() {
  try {
    const data = await fs.readFile(DEVICE_TYPES_JSON_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('讀取設備類型 JSON 失敗:', error);
    return [];
  }
}

// 取得所有設備類型
exports.getAllDeviceTypes = async (req, res) => {
  try {
    // 未來可以改為從 JSON 讀取
    // const deviceTypes = await loadDeviceTypesFromJSON();
    
    // 目前從資料庫讀取
    const [rows] = await db.query('SELECT * FROM device_types ORDER BY id');
    
    res.json({
      device_types: rows
    });
  } catch (error) {
    console.error('取得設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '取得設備類型失敗',
      details: error.message
    });
  }
};

// 取得單一設備類型
exports.getDeviceTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    res.json({
      device_type: rows[0]
    });
  } catch (error) {
    console.error('取得設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '取得設備類型失敗',
      details: error.message
    });
  }
};

// 建立設備類型
exports.createDeviceType = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    // 驗證必填欄位
    if (!name || !code) {
      return res.status(400).json({
        error: true,
        message: '設備類型名稱和代碼為必填欄位'
      });
    }
    
    // 檢查代碼是否已存在
    const [existing] = await db.query('SELECT id FROM device_types WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({
        error: true,
        message: '設備類型代碼已存在'
      });
    }
    
    // 插入資料
    const [result] = await db.query(
      'INSERT INTO device_types (name, code, description) VALUES (?, ?, ?)',
      [name, code, description || null]
    );
    
    // 取得新建立的設備類型
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      message: '設備類型建立成功',
      device_type: rows[0]
    });
  } catch (error) {
    console.error('建立設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '建立設備類型失敗',
      details: error.message
    });
  }
};

// 更新設備類型
exports.updateDeviceType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    // 檢查設備類型是否存在
    const [existing] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    // 如果更新代碼，檢查是否與其他設備類型衝突
    if (code && code !== existing[0].code) {
      const [duplicate] = await db.query('SELECT id FROM device_types WHERE code = ? AND id != ?', [code, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({
          error: true,
          message: '設備類型代碼已存在'
        });
      }
    }
    
    // 更新資料
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: '沒有提供要更新的欄位'
      });
    }
    
    updateValues.push(id);
    await db.query(
      `UPDATE device_types SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // 取得更新後的設備類型
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    
    res.json({
      message: '設備類型更新成功',
      device_type: rows[0]
    });
  } catch (error) {
    console.error('更新設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '更新設備類型失敗',
      details: error.message
    });
  }
};

// 刪除設備類型
exports.deleteDeviceType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查設備類型是否存在
    const [existing] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    // 檢查是否有設備使用此類型
    const [devices] = await db.query('SELECT id FROM modbus_devices WHERE type_id = ? LIMIT 1', [id]);
    if (devices.length > 0) {
      return res.status(400).json({
        error: true,
        message: '無法刪除：仍有設備使用此類型'
      });
    }
    
    // 刪除設備類型
    await db.query('DELETE FROM device_types WHERE id = ?', [id]);
    
    res.json({
      message: '設備類型刪除成功'
    });
  } catch (error) {
    console.error('刪除設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '刪除設備類型失敗',
      details: error.message
    });
  }
};
```

### 3. 在主路由中註冊：`routes/modbus/index.js`

```javascript
const express = require('express');
const router = express.Router();
const deviceTypesRouter = require('./deviceTypes');
const devicesRouter = require('./devices');

router.use('/device-types', deviceTypesRouter);
router.use('/devices', devicesRouter);

module.exports = router;
```

## 未來改為 JSON 讀取的實作

### 1. 建立 JSON 文件：`data/device-types.json`

```json
[
  {
    "id": 1,
    "name": "DDC 控制器",
    "code": "ddc_controller",
    "description": "直接數位控制系統控制器"
  },
  {
    "id": 2,
    "name": "感測器",
    "code": "sensor",
    "description": "各種環境感測器"
  },
  {
    "id": 3,
    "name": "執行器",
    "code": "actuator",
    "description": "控制執行器"
  },
  {
    "id": 4,
    "name": "閘道器",
    "code": "gateway",
    "description": "Modbus 閘道器設備"
  }
]
```

### 2. 修改控制器以支援 JSON 讀取

在 `deviceTypeController.js` 中添加：

```javascript
// 設定是否使用 JSON 模式（可透過環境變數控制）
const USE_JSON_MODE = process.env.DEVICE_TYPES_JSON_MODE === 'true';

// 修改 getAllDeviceTypes
exports.getAllDeviceTypes = async (req, res) => {
  try {
    if (USE_JSON_MODE) {
      // 從 JSON 讀取
      const deviceTypes = await loadDeviceTypesFromJSON();
      return res.json({ device_types: deviceTypes });
    }
    
    // 從資料庫讀取
    const [rows] = await db.query('SELECT * FROM device_types ORDER BY id');
    res.json({ device_types: rows });
  } catch (error) {
    // ... 錯誤處理
  }
};
```

## 更新設備建立 API

在建立設備時，需要驗證 `type_id` 是否存在：

```javascript
// 在 createDevice 中
const { name, type_id, host, port, unitId, description } = req.body;

// 驗證設備類型是否存在
const [deviceType] = await db.query('SELECT id, code FROM device_types WHERE id = ?', [type_id]);
if (deviceType.length === 0) {
  return res.status(400).json({
    error: true,
    message: '設備類型不存在'
  });
}

// 使用設備類型的 code 作為 device_type
const device_type = deviceType[0].code;

// 建立設備
await db.query(
  'INSERT INTO modbus_devices (name, type_id, device_type, host, port, unit_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [name, type_id, device_type, host, port, unitId, description || null]
);
```

## 環境變數設定

在 `.env` 中添加：

```env
# 設備類型管理模式：true = JSON 模式，false = 資料庫模式
DEVICE_TYPES_JSON_MODE=false
```

## 測試 API

### 使用 curl 測試

```bash
# 取得所有設備類型
curl http://localhost:4000/api/modbus/device-types

# 建立設備類型（需要管理員 token）
curl -X POST http://localhost:4000/api/modbus/device-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "測試設備類型",
    "code": "test_device",
    "description": "測試描述"
  }'
```

## 遷移到 JSON 模式的步驟

1. 匯出現有資料庫資料為 JSON
2. 建立 `data/device-types.json` 文件
3. 設定環境變數 `DEVICE_TYPES_JSON_MODE=true`
4. 重啟後端服務
5. 測試 API 是否正常運作

## 注意事項

1. **資料一致性**：使用 JSON 模式時，需要手動維護 JSON 文件
2. **備份**：定期備份 JSON 文件
3. **版本控制**：將 JSON 文件納入版本控制
4. **權限控制**：JSON 模式下，建立/更新/刪除 API 可以返回提示訊息，告知需要手動更新 JSON 文件

