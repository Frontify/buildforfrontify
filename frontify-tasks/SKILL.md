---
name: frontify-tasks
description: >
  [TODO: 1–3 sentences covering what this skill does — converts a PRD or
  feature brief into an ordered, actionable task list for Frontify extension
  development — and when to load it (after frontify-prd produces a document,
  or when the user asks for a structured development plan).]
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: "[TODO: your-org]"
  version: "0.1"
---

# Frontify Tasks

[TODO: One short paragraph explaining what this skill produces — a concrete,
ordered task list that the developer (or agent) can work through to build
the extension — and how it relates to the PRD produced by frontify-prd.]

---

## Input

[TODO: Describe what this skill expects as input:

- A completed PRD from frontify-prd (preferred)
- Or a direct feature brief from the user if no PRD exists
- The confirmed extension type and surface(s)

Instruct the agent to confirm the input before generating tasks.]

---

## Task breakdown approach

[TODO: Define how the agent should break requirements into tasks.
Cover:

- Granularity — how small should each task be (e.g. completable in
  under 2 hours, testable independently)
- Ordering — scaffold and foundation tasks first, feature tasks second,
  polish and testing last
- Dependency notation — how to indicate when one task blocks another
- How to handle uncertainty — tasks that need a spike or investigation
  before implementation can be estimated]

---

## Task output format

[TODO: Define the format of each task in the output list. Specify
every field and what it should contain. Suggested fields:

- Task ID (e.g. T-01, T-02)
- Title (action verb + object, ≤ 10 words)
- Description (what to do, 1–3 sentences)
- Acceptance criteria (how to know it is done)
- Depends on (task IDs that must be complete first)
- Suggested skill to load (e.g. if the task involves auth, note the
  matching `frontify-auth-{app,block,theme,integration}`; if it involves
  GraphQL, note `frontify-graphql`)]

---

## Standard task categories

[TODO: Define the standard categories all Frontify extension task lists
should include, in order:

1. Project scaffold and environment setup
2. Authentication integration
3. Core feature implementation (one task per feature from the PRD)
4. UI implementation with Fondue
5. API integration (GraphQL queries and mutations)
6. Testing
7. Deployment and publishing setup
8. Documentation

Note that not all categories apply to every project.]

---

## Handoff to implementation

[TODO: Instruct the agent that once the task list is confirmed, it should
offer to begin with the first task immediately — loading whatever type or
resource skill that task requires.]
