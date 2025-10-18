# Astrolabe - Storage Examples

> **Data structure examples and schema documentation**
>
> For technical architecture, see [architecture.md](architecture.md)
> For feature inventory, see [features-list.md](features-list.md)

---

## Snippet Schema Example 
```json

{
  id: 1760200058.123123, // Date.now() + random numbers
  name: "2025-10-13_14-23-45", // auto-populated 
  created: "2025-10-13T14:23:45.123Z",
  modified: "2025-10-13T14:25:30.456Z",
  
  spec: {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": {"values": [...]},
    "mark": "bar",
    "encoding": {
      "x": {"field": "category", "type": "nominal"},
      "y": {"field": "value", "type": "quantitative"}
    }
  },
  
  draftSpec: {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": {"values": [...]},
    "mark": "bar",
    "encoding": {
      "x": {"field": "category", "type": "nominal"},
      "y": {"field": "value", "type": "quantitative"},
      "color": {"field": "category", "type": "nominal"} // draft addition
    }
  },
  
  comment: "SELECT category, SUM(value) FROM sales GROUP BY category",
  tags: [],
  datasetRefs: [],
  meta: {}
}
```


Dataset example: 

```json
{
  // Core identity
  id: 1760200058.123123, // Date.now() + random numbers
  name: "sales_2024_q1", // editable
  
  // Timestamps
  created: 1760200058, // timestamp
  modified: 1760304958 //timestamp,
  
  // Data (stored as-is, format-agnostic)
  data: [
    {"category": "A", "value": 100},
    {"category": "B", "value": 200}
  ],
  format: "json", // "json" | "csv" | "tsv" (for future import/export)
  
  // Computed on save
  rowCount: 2,
  columnCount: 2,
  size: 78, // bytes: JSON.stringify(data).length
  columns: ["category", "value"], // inferred from first row
  
  // Metadata
  comment: "",
  tags: [],
  
  // Extensibility
  meta: {}
}

```

Settings example: 

```json


{
  // UI State
  panelWidths: [25, 25, 50], // % for [list, editor, preview]
  panelVisibility: [true, true, true],
  
  // App behavior (empty for MVP, but structure exists)
  autoSaveDelay: 1000,
  
  // Extensibility
  meta: {}
}
```
