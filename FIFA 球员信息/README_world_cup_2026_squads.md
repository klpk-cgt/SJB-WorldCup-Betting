# 2026 世界杯 48 队球员数据包

## 文件

- `world_cup_2026_official_squads_base.json`
  - 已从 FIFA 官方名单 PDF 解析。
  - 48 支球队，每队 26 人，共 1,248 人。
  - 包含原文姓名、位置、出生日期、截至 2026-06-11 的年龄、俱乐部、身高。
  - 为保证准确性，尚未核实的中文译名和身价保持 `null`，没有猜测填写。

- `build_world_cup_2026_full_json.py`
  - 联网运行后，从中文维基百科补充中文名及中文俱乐部名。
  - 从公开的 Transfermarkt 衍生数据集补充欧元身价。
  - 以出生日期和姓名相似度联合匹配。
  - 每队按身价从高到低排序，未知值排末尾。
  - 生成正式 JSON 和未匹配校验报告。

## 运行

```bash
python -m pip install pandas requests pdfplumber beautifulsoup4 lxml rapidfuzz opencc-python-reimplemented
python build_world_cup_2026_full_json.py
```

输出：

```text
world_cup_2026_squads_market_value.json
world_cup_2026_squads_validation.json
```

## 数据口径

- 名单、位置、出生日期、俱乐部：FIFA 官方世界杯名单 PDF。
- 年龄基准日：2026-06-11。
- 中文译名：中文维基百科赛事名单页，转换为简体。
- 身价：dcaribou/transfermarkt-datasets 公开数据快照。
- 身价单位：欧元整数。
- 排序：`market_value_eur` 降序，未知值置后。
- 身价是第三方估值，不是实际转会费。

## 验证规则

脚本会强制检查：

- 球队数必须为 48。
- 每队必须为 26 人。
- 总球员数必须为 1,248。
- 中文名优先按同队出生日期匹配，球衣号仅作次级回退。
- 身价按出生日期缩小候选，再以姓名相似度判定。
- 低置信或多义匹配不写入结果，而是进入校验报告。
