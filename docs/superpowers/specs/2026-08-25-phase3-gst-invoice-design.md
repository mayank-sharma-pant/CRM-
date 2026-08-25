# Phase 3.7 — GST-compliant invoice (design)

Leads-to-invoice India GST v0. No PDF library. Snapshot GSTIN + CGST/SGST or IGST on create.

- Seller GSTIN: existing `company_settings.gst_number`. State = first two digits of GSTIN.
- Buyer GSTIN: `clients.gstin`. Same state → CGST+SGST (half each); else IGST.
- No seller GSTIN → legacy lump `tax` (existing 18% test unchanged); cgst/sgst/igst = 0.
- Optional line `hsn`. Invoice stores `seller_gstin`, `buyer_gstin`, `place_of_supply`, `tax_mode`.
- Invalid GSTIN (if provided) → 400. Empty allowed.
