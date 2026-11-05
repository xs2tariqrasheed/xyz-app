# Module 25 — System Pages, Errors & Session States

## 1. Purpose
Standard outcomes the app communicates outside normal flows.

## 2. States [O]

| Route | State | Content (exact meaning) | Next action |
|---|---|---|---|
| `/Misc/TimeOut` | Session expired | "Your session has expired. You'll be redirected to main page in 5 seconds." | auto-redirect to login after 5 s |
| `/Misc/Error` | Unexpected error | "We are very sorry, but an unexpected error has occurred. Please try again in one minute. If you continue to receive this message, you can contact us at Customer.Service@xyzcar.com" | — |
| `/Misc/NotAllow` | Guest booking disabled | "Guest reservations are not available at this time … Kindly call XYZ dispatch at 718-768-7333" | call dispatch |
| `/Misc/UserMessages?constant=1` | Account locked | locked after several failed logins; try again in a few minutes | back to login |
| `/Misc/UserMessages?constant=2` | Account expired | call customer service 718-499-2007 (9am–5pm) or dispatch 24h 718-768-7333 | — |
| `/Misc/BrowserError` | Unsupported browser | legacy IE notice | drop in Revamp |

## 3. Triggers [O/C]
| Trigger | Result |
|---|---|
| Anonymous on member route | 302 → TimeOut |
| Anonymous on booking | 302 → NotAllow |
| Unknown route | 302 → `/Misc/Error?aspxerrorpath=…` |
| Server exception / bad params / wrong HTTP method | 302 → `/Misc/Error` |
| Client AJAX failure | navigate to Error |
| Lookup/step JSON `{Redirect}` | navigate to given URL |

## 4. Revamp notes
HTTP semantics: 401 → session-expired screen (5 s countdown), 403 → not-allowed, 404, 423 locked, 410/403 expired account, 500 generic. Keep phone numbers/e-mail in configuration.
