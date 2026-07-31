export type RAGDocumentStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type RAGEmbeddingStatus = "not_started" | "partial" | "ready";
export type RAGFileType = "pdf" | "docx";

export type RAGDocument = {
  id: number;
  teacher_id: number;
  task_id?: number | null;
  title: string;
  original_filename: string;
  file_type: RAGFileType;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  checksum_sha256?: string | null;
  status: RAGDocumentStatus;
  page_count?: number | null;
  chunk_count: number;
  embedded_chunk_count: number;
  embedding_status: RAGEmbeddingStatus;
  embedding_model?: string | null;
  embedding_dimensions?: number | null;
  processing_error?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
};

export type RAGChunk = {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  content_hash?: string | null;
  section_title?: string | null;
  page_number_start?: number | null;
  page_number_end?: number | null;
  char_start?: number | null;
  char_end?: number | null;
  token_count?: number | null;
  char_count?: number | null;
  embedding_model?: string | null;
  embedding_dimensions?: number | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RAGEmbeddingStatusRead = {
  provider: string;
  model: string;
  dimensions: number;
  loaded: boolean;
  cache_dir: string;
};

export type RAGDocumentEmbeddingResult = {
  document_id: number;
  chunk_count: number;
  embedded_chunk_count: number;
  provider: string;
  model: string;
  dimensions: number;
};

export type RAGSemanticSearchHit = {
  score: number;
  distance: number;
  document: RAGDocument;
  chunk: RAGChunk;
};

export type RAGSemanticSearchResponse = {
  query: string;
  provider: string;
  model: string;
  dimensions: number;
  top_k: number;
  hits: RAGSemanticSearchHit[];
};

export type RAGJobType = "ingest" | "reprocess" | "embed";
export type RAGJobStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

export type RAGProcessingJob = {
  id: number;
  document_id: number;
  teacher_id: number;
  job_type: RAGJobType;
  status: RAGJobStatus;
  progress_percent: number;
  attempts: number;
  max_attempts: number;
  payload_json?: Record<string, unknown> | null;
  result_json?: Record<string, unknown> | null;
  error_message?: string | null;
  available_at: string;
  locked_at?: string | null;
  locked_by?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type RAGDocumentJobResponse = {
  document: RAGDocument;
  job: RAGProcessingJob;
};

export type RAGStorageUsage = {
  teacher_id: number;
  document_count: number;
  document_limit?: number | null;
  used_bytes: number;
  limit_bytes?: number | null;
  remaining_bytes?: number | null;
  usage_percent?: number | null;
};

export type RAGMonitoringSummary = {
  documents_total: number;
  documents_by_status: Record<string, number>;
  embedding_by_status: Record<string, number>;
  jobs_total: number;
  jobs_by_status: Record<string, number>;
  storage: RAGStorageUsage;
  worker_enabled: boolean;
  worker_poll_seconds: number;
};
