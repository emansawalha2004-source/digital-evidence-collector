# EvidenceSystem APIs

Base URL:

```txt
http://localhost:5000/api
```

Most APIs require `Authorization: Bearer <token>` after login + OTP verification.

## Health
| Method | URL | Description |
|---|---|---|
| GET | `/health` | Check backend status |

## Authentication
| Method | URL | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login and receive MFA/OTP challenge |
| POST | `/auth/login/verify-mfa` | Verify OTP/MFA and receive JWT token |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/logout` | Logout locally |
| PUT | `/auth/change-password` | Change password |
| POST | `/auth/mfa/setup` | Start MFA setup |
| POST | `/auth/mfa/verify` | Confirm MFA setup |
| POST | `/auth/mfa/disable` | Disable MFA |
| POST | `/auth/mfa/backup-codes/regenerate` | Regenerate backup codes |

## Cases
| Method | URL | Description |
|---|---|---|
| GET | `/cases` | List cases |
| POST | `/cases` | Create case |
| GET | `/cases/:id` | Case details |
| PUT | `/cases/:id` | Update case |
| DELETE | `/cases/:id` | Archive case |
| GET | `/cases/:id/evidence` | Evidence inside a case |
| GET | `/cases/:id/timeline` | Case timeline |
| GET | `/cases/:id/stats` | Case statistics |

## Evidence
| Method | URL | Description |
|---|---|---|
| GET | `/evidence` | List evidence |
| POST | `/evidence` | Create text/link evidence |
| POST | `/evidence/upload` | Upload file evidence with multipart/form-data |
| GET | `/evidence/stats` | Evidence statistics |
| GET | `/evidence/archived` | Archived evidence |
| GET | `/evidence/:id` | Evidence details |
| PUT | `/evidence/:id` | Update evidence |
| DELETE | `/evidence/:id` | Archive evidence |
| PUT | `/evidence/:id/restore` | Restore evidence |
| POST | `/evidence/:id/notes` | Add note |
| GET | `/evidence/:id/download` | Download evidence file |
| GET | `/evidence/:id/preview` | Preview evidence file |
| POST | `/evidence/:id/verify-integrity` | Verify SHA-256 integrity |

## Dashboard / Timeline / Reports / Analysis / Users
| Method | URL | Description |
|---|---|---|
| GET | `/dashboard` | Dashboard metrics |
| GET | `/timeline` | Full audit timeline |
| GET | `/timeline/evidence/:evidenceId` | Evidence timeline |
| GET | `/timeline/case/:caseId` | Case timeline |
| GET | `/reports` | List generated reports |
| POST | `/reports/evidence/:id` | Generate evidence report |
| POST | `/reports/case/:id` | Generate case report |
| GET | `/reports/download/:filename` | Download report PDF |
| POST | `/analysis/text` | Analyze text |
| POST | `/analysis/link` | Analyze link |
| POST | `/analysis/evidence/:id` | Analyze existing evidence |
| GET | `/analysis/evidence/:id/history` | Evidence analysis history |
| GET | `/users` | List users - admin |
| GET | `/users/:id` | User details - admin |
| PUT | `/users/:id/role` | Update role - admin |
| PUT | `/users/:id/status` | Activate/deactivate user - admin |
