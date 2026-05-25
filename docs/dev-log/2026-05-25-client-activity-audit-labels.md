---
title: 'Client activity audit labels'
date: 2026-05-25
author: 'Codex'
---

# Client activity audit labels

## 背景

Client detail 的 Activity log 直接渲染了 audit event action，例如
`client.source_details.updated`。这些 action 是内部审计键，不适合作为用户可见标题。

## 做了什么

- Client activity rows now render through the shared audit action label formatter.
- Added readable labels for client fact/profile changes, including
  `client.source_details.updated` → `Client details updated`.
- Registered the source-details audit action in shared/db audit action lists so
  the server-written event is represented consistently.

## 验证

- Added audit label coverage for `client.source_details.updated`.
- Browser verification should show the client activity title as readable copy
  instead of the raw action key.
