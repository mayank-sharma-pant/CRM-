# Financial Ledgers – Role-Based Access (API-Driven)

This document describes how **strict role-based access** for the Financial Ledgers module is enforced. Permissions are defined and enforced **only on the backend**; the frontend has **no role checks** and relies entirely on API responses.

---

## 1. Sidebar logic

- **Source of list:** The sidebar does **not** hardcode the list of financial ledgers. It calls `GET /api/ledgers/` and builds the "Financial Ledgers" section **only** from the response.
- **Visibility:** A ledger appears in the sidebar **only** if the API includes it in the authorized list (i.e. the user has `can_view` for that ledger). If the API returns an empty list (e.g. Platform Admin), the "Financial Ledgers" section is not shown at all.
- **No role-based list:** The frontend does not use role to decide which ledger links to show. It does not compare `user.role` to "sales", "manager", etc. for ledger visibility.
- **Error handling:** If `GET /api/ledgers/` fails, the sidebar shows an error message and a **Retry** button. It does not show a fallback list of ledgers.

---

## 2. Ledger page rendering logic

- **Route:** Ledger pages live under `/financial-ledgers/[ledgerName]` (e.g. `/financial-ledgers/stock-register`). The page fetches `GET /api/ledgers/{slug}` with the slug derived from the URL (kebab-case → snake_case).
- **Response shape:** The API returns `{ ledger, ledger_name, can_view, can_edit, columns, rows }`.
- **If `can_view === false`:** The page renders an **Access Denied** screen (no ledger table). The user is not shown the ledger content.
- **If API fails:** The page shows an **error state** with a **Retry** button and a "Go back" button. There is **no** fallback to mock data.
- **If `can_view === true`:** The page renders the shared `FinancialLedgerGrid` (or equivalent table), passing `canEdit={data.can_edit}` so that Add Row, inline editing, and delete are enabled only when the API says `can_edit === true`.

---

## 3. View-only vs editable behavior

- **From API:** Each ledger response includes `can_view` and `can_edit`. The frontend does not derive these from role.
- **View-only (`can_edit === false`):**
  - "Add Row" is **hidden**.
  - Inline cell editing is **disabled** (cells are not clickable for edit).
  - The "Actions" column (e.g. delete button) is **hidden**.
- **Editable (`can_edit === true`):**
  - "Add Row" is shown.
  - Cells are clickable for inline edit (where supported).
  - Delete control is shown per row.
- **Backend enforcement:** Even if the frontend were bypassed, `POST /api/ledgers/{slug}`, `PUT /api/ledgers/{slug}/{id}`, and `DELETE /api/ledgers/{slug}/{id}` all check that the current user has **edit** permission for that ledger; otherwise they return **403**.

---

## 4. No role checks in frontend

- The frontend **does not**:
  - Check `user.role === 'sales'`, `user.role === 'manager'`, etc. to decide ledger visibility or editability.
  - Hardcode which ledgers are visible for which role.
  - Infer `can_view` or `can_edit` from the role string.
- The frontend **only**:
  - Calls `GET /api/ledgers/` and uses the returned list to build the sidebar.
  - Calls `GET /api/ledgers/{slug}` and uses the returned `can_view` and `can_edit` to decide whether to show the page and whether to enable add/edit/delete.

---

## 5. Access matrix enforcement (backend)

The backend (`backend/app/routers/ledgers.py`) is the single source of truth:

| Role (concept)        | Backend role / condition              | Stock Register | Payments Made | … | All others |
|----------------------|----------------------------------------|----------------|----------------|---|------------|
| Sales Executive      | `sales`                                | View only      | Not visible   | … | Per matrix |
| Team Lead            | `team_lead`                            | View only      | Not visible   | … | Per matrix |
| Manager              | `manager`                              | View only      | View only     | … | View only  |
| Purchase             | `purchase`                             | Edit           | Edit          | … | View/Edit per matrix |
| Company Admin        | `admin` + `company_id` set             | Edit           | Edit          | … | Edit all   |
| MD                   | `md`                                   | View only      | View only     | … | View only  |
| Platform Admin       | `admin` + `company_id` NULL            | **No access**  | **No access** | … | No access  |

- **Platform Admin:** `get_authorized_ledgers` returns `[]`, so no financial ledgers appear in the sidebar. Any direct request to `GET /api/ledgers/{slug}` for a ledger is forbidden (no permission).
- **Company Admin:** Treated as full edit on all ledgers when `user.role == "admin"` and `user.company_id is not None`.
- **Write operations:** Every `POST`, `PUT`, and `DELETE` on ledger entries checks that the user has **edit** permission for that ledger slug; otherwise the backend returns **403**. The frontend is not trusted for write authorization.

---

## Route structure (reference)

- `/financial-ledgers` – index/landing.
- `/financial-ledgers/stock-register`, `/financial-ledgers/payments-made`, … – one route per ledger; slug in URL is kebab-case; API uses snake_case (e.g. `stock_register`).

All these pages use the same shared table component and the same permission fields from the API (`can_view`, `can_edit`).
