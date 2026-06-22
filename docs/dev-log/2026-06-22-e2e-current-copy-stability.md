# 2026-06-22 E2E Current Copy Stability

CI E2E drifted after the login split preview and first-run dashboard changes:

- login smoke assertions now target the current DueDateHQ sign-in heading and no-password reassurance copy;
- locale smoke assertions use the current Chinese heading and supporting line instead of the removed CPA-firm eyebrow;
- the authenticated shell smoke test treats the first-run dashboard empty state as a valid protected shell;
- obligation status E2E scopes the success toast to the notification region so it waits for the server audit id without matching unrelated page copy;
- obligation status menu items no longer stop propagation inside the Base UI radio group, so row status changes actually commit;
- Pulse apply toast text now pluralizes the one-client case and the E2E scopes the assertion to notifications.
