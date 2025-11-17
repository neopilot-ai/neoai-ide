# NeoAI IDE - Actionable TODOs & Roadmap

This document captures the short roadmap (MVP → v1 → long-term) and breaks the top feature proposals into issue-sized tasks with acceptance criteria and rough estimates. Use these as GitHub issues or project board cards.

---

**Short Roadmap**

- **MVP (0–6 weeks)**
  - Agent Execution Inspector (basic logs + UI to view steps)
  - Per-Project Model & Cost Policies (policy storage + enforcement stub)
  - Docs & setup clarity (finish `SETUP_GUIDE.md` updates)
  - Health check target (`make health`) improvements

- **v1 (6–16 weeks)**
  - Safe Preview Sandboxes (ephemeral preview runner with egress controls)
  - CI Gate for AI-generated changes (test generation + PR checks)
  - Plugin/Extension SDK (basic lifecycle hooks + sample plugin)
  - Improved agent UX (step replay, diff viewer, revert single step)

- **Long-term (16+ weeks)**
  - Marketplace + billing integration
  - Advanced model training & private model hosting
  - Mobile app & offline-first improvements

---

**Top 5 Features (summary & T-shirt estimates)**

1) Agent Execution Inspector — Priority: High — Estimate: Medium (3–6w)
2) Per-Project Model & Cost Policies — Priority: High — Estimate: Medium (2–4w)
3) Safe Preview Sandboxes — Priority: High — Estimate: Medium→High (4–8w)
4) CI Gate for AI-generated Changes — Priority: Medium→High — Estimate: Medium (3–6w)
5) Plugin/Marketplace MVP — Priority: High — Estimate: Medium→High (4–8w)

---

**Issue-sized Tasks (ready to create)**

Feature: Agent Execution Inspector
- Issue AE-001: Design agent inspector UI
  - Owner: (TBD)
  - Estimate: 3d
  - Description: Wireframes and interaction spec for agent timeline, step diffs, and rollback controls.
  - Acceptance: Wireframes + interaction flows reviewed by PM/Dev.

- Issue AE-002: Add structured agent step logging in `agent-service`
  - Owner: backend
  - Estimate: 5d
  - Description: Persist agent steps as JSON records including step_id, timestamp, action, inputs, outputs, and diff metadata. Add DB table or object storage as appropriate.
  - Acceptance: `POST /agents/tasks/{id}/log` accepts step objects; step objects retrievable via `GET /agents/tasks/{id}/log`.

- Issue AE-003: Frontend Agent Inspector component
  - Owner: frontend
  - Estimate: 6d
  - Description: Implement `src/components/AgentInspector` to render timeline, diffs, and revert button that calls the rollback API.
  - Acceptance: UI shows timeline for a sample run; revert button triggers backend rollback endpoint and updates UI.

Feature: Per-Project Model & Cost Policies
- Issue MP-001: DB migration for `project_policies`
  - Owner: backend
  - Estimate: 2d
  - Description: Add schema (project_id, allowed_providers JSON, budget_cents INT, soft_limit BOOLEAN, created_at, updated_at).
  - Acceptance: Migration runs, table visible, sample row can be inserted.

- Issue MP-002: Project settings UI for model policies
  - Owner: frontend
  - Estimate: 4d
  - Description: Add settings page section allowing project admins to set allowed providers and monthly budget.
  - Acceptance: Settings saved through API and reflected in DB.

- Issue MP-003: Enforce policies in `ai-service`
  - Owner: backend (ai-service)
  - Estimate: 4d
  - Description: Check policy before routing a model request; return 402/429-like response when budget exhausted or provider not allowed. Log policy violations.
  - Acceptance: Requests blocked when policy denies them and logged to analytics.

Feature: Safe Preview Sandboxes
- Issue PS-001: Sandbox spec and infra design
  - Owner: infra
  - Estimate: 3d
  - Description: Define pod job template, resource limits, network egress rules, secret handling, and retention policy.
  - Acceptance: Design doc approved and k8s job spec drafted.

- Issue PS-002: Implement ephemeral preview runner
  - Owner: backend/infra
  - Estimate: 10d
  - Description: Create preview runner that launches ephemeral pods for each preview with network policies and secret redaction sidecar.
  - Acceptance: Preview can be created and destroyed; external egress blocked and logs sanitized.

- Issue PS-003: Preview-service integration and UI
  - Owner: frontend/backend
  - Estimate: 5d
  - Description: Add UI controls for creating a secure preview; show status and logs.
  - Acceptance: Users can create previews from UI and view secure logs.

Feature: CI Gate for AI-generated Changes
- Issue CI-001: Prototype test generation workflow
  - Owner: ai-service
  - Estimate: 5d
  - Description: Generate unit or integration tests from AI-produced code changes and store them as artifacts.
  - Acceptance: Generated tests run locally and produce pass/fail results.

- Issue CI-002: PR check integration
  - Owner: infra/CI
  - Estimate: 4d
  - Description: Add GitHub Actions job that runs generated tests for AI-related PRs and blocks merge on failure.
  - Acceptance: PR check runs and prevents merge if tests fail.

Feature: Plugin/Marketplace MVP
- Issue PM-001: Define plugin SDK (v0)
  - Owner: platform
  - Estimate: 4d
  - Description: Create minimal SDK with lifecycle hooks (activate/deactivate), editor API, and example plugin scaffolding.
  - Acceptance: Sample plugin can modify editor content and register a toolbar action.

- Issue PM-002: Marketplace backend & catalog
  - Owner: backend
  - Estimate: 6d
  - Description: Basic catalog endpoints to list/install plugins and store metadata.
  - Acceptance: Catalog shows sample plugin and install flow returns success.

- Issue PM-003: Plugin manager UI
  - Owner: frontend
  - Estimate: 4d
  - Description: UI to browse, install, enable/disable plugins in workspace settings.
  - Acceptance: Users can install/uninstall the sample plugin through UI.

---

How to convert these into GitHub issues quickly
- Use `gh` (GitHub CLI):

```
gh issue create --title "AE-002: Add structured agent step logging" --body "<paste the issue body from this file>" --label "feature" --assignee "@owner"
```

- Or copy/paste issue blocks into your issue tracker; each block includes acceptance criteria and an estimate.

---

Notes
- Owners are placeholders — replace with actual team members when creating issues.
- Estimates are rough and should be refined during sprint planning.
- If you want, I can open these issues for you (requires GitHub auth/permission) or create a `docs/ISSUES_TO_CREATE.md` with ready-to-paste content.
