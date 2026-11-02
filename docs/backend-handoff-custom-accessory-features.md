# Optional accessory and feature fields

The frontend now lets users select, add and remove the existing `battery_required`, `battery_consumption` and `cosmetic_features` controls under Accessories & features. These controls start hidden for empty products. Saved values remain visible, including `battery_required: false`. Removal sends null through the existing product PATCH contract; unrelated details are preserved. No schema change is needed for these supported fields.

If users also need completely new field names such as Warranty or Charging Type, please confirm and implement a persisted custom name/value collection. There is no agreed custom-field API contract in the frontend whitelist or locally inspected catalog schema. The frontend does not send arbitrary property names or store custom entries inside unrelated fields.

Proposed contract for agreement:

```json
{
  "custom_features": [
    { "name": "Warranty", "value": "12 months" },
    { "name": "Charging Type", "value": "USB-C" }
  ]
}
```

Support product POST, PATCH, detail and list responses for both simple and variable products. Omitted means preserve; an empty array means clear. Validate trimmed non-empty names/values, duplicate names and agreed size limits. Persist and reload the entries, and include them in customer-facing product data where required. Existing battery, power and cosmetic fields must remain compatible.

This is a proposed extension, not a claim that this request field is accepted or deployed. No backend files, database records or live products were modified for the frontend optional-field change.
