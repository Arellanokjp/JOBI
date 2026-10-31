/** Internal shape used by AuditLogsService.record(); audit logs are not writable over HTTP. */
export interface CreateAuditLogInput {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}
