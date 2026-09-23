# Permission Matrix

Roles seed default grants; authorization evaluates the effective union of role and explicit user grants, never a role name in the client.

| Capability | Creator | Admin | Moderator | Helper | User |
| --- | --- | --- | --- | --- | --- |
| View standard user card | `USER_VIEW` | configurable | configurable | scoped | self |
| Read phone/email/DOB | `USER_VIEW_*` + audit | explicit grant + audit | no default | no | self |
| Resolve reports | `REPORT_MANAGE` | configurable | configurable | scoped | report only |
| Moderate message/room | `CHAT_MODERATE` | configurable | configurable | scoped | no |
| Assign/remove roles | `ROLE_ASSIGN`, `ROLE_REMOVE` | proposal only | helper proposal only | no | no |
| Finance or adjustment | `FINANCE_VIEW`, `FINANCE_MANAGE` | explicit grant | no | no | own wallet only |
| Read private chats | `CHAT_HISTORY_ACCESS` + reason + audit | explicit grant + reason | no default | no | membership only |
| Platform settings/audit logs | `SYSTEM_SETTINGS`, `AUDIT_LOG_VIEW` | explicit grant | no | no | no |

Admin-to-moderator and moderator-to-helper changes create approval requests; only a creator-authorized approver may finalize them. Server policy prohibits assigning a permission beyond the actor's delegation ceiling.
