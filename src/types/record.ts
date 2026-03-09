export interface RecordMeta {
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  deleted: boolean;
  deleted_by?: string;
  deleted_at?: string;
  version: number;
  pipeline_stage?: string;
}

export interface CrmRecord {
  id: string;
  tenant_id: string;
  data: { [field_id: string]: unknown };
  meta: RecordMeta;
}

export interface RecordVersion {
  id: string;
  record_id: string;
  version: number;
  data_snapshot: { [field_id: string]: unknown };
  changed_by: string;
  changed_at: string;
}
