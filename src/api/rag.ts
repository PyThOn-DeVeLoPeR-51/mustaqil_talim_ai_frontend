import { api, teacherAuthHeaders } from "@/lib/api";
import type {
  RAGChunk,
  RAGDocument,
  RAGDocumentEmbeddingResult,
  RAGEmbeddingStatusRead,
  RAGSemanticSearchResponse,
} from "@/types/rag";

export async function getRAGDocuments(params?: {
  task_id?: number;
  document_status?: string;
}): Promise<RAGDocument[]> {
  const res = await api.get("/rag/documents", {
    headers: teacherAuthHeaders(),
    params,
  });
  return res.data;
}

export async function uploadRAGDocument(data: {
  title: string;
  task_id?: number | null;
  file: File;
}): Promise<RAGDocument> {
  const formData = new FormData();
  formData.append("title", data.title.trim());
  if (typeof data.task_id === "number") {
    formData.append("task_id", String(data.task_id));
  }
  formData.append("file", data.file);

  const res = await api.post("/rag/documents", formData, {
    headers: {
      ...teacherAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function updateRAGDocument(
  documentId: number,
  data: { title?: string; task_id?: number | null }
): Promise<RAGDocument> {
  const res = await api.patch(`/rag/documents/${documentId}`, data, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function getRAGDocumentChunks(documentId: number): Promise<RAGChunk[]> {
  const res = await api.get(`/rag/documents/${documentId}/chunks`, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function reprocessRAGDocument(documentId: number): Promise<RAGDocument> {
  const res = await api.post(`/rag/documents/${documentId}/reprocess`, null, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function embedRAGDocument(
  documentId: number
): Promise<RAGDocumentEmbeddingResult> {
  const res = await api.post(`/rag/documents/${documentId}/embed`, null, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function deleteRAGDocument(documentId: number): Promise<void> {
  await api.delete(`/rag/documents/${documentId}`, {
    headers: teacherAuthHeaders(),
  });
}

export async function getRAGEmbeddingStatus(): Promise<RAGEmbeddingStatusRead> {
  const res = await api.get("/rag/embedding/status", {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function semanticSearchRAG(data: {
  query: string;
  top_k?: number;
  document_ids?: number[];
  task_id?: number;
  min_score?: number;
}): Promise<RAGSemanticSearchResponse> {
  const res = await api.post("/rag/search", data, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function uploadRAGDocumentBackground(data: {
  title: string;
  task_id?: number | null;
  auto_embed?: boolean;
  file: File;
}): Promise<import("@/types/rag").RAGDocumentJobResponse> {
  const formData = new FormData();
  formData.append("title", data.title.trim());
  if (typeof data.task_id === "number") formData.append("task_id", String(data.task_id));
  formData.append("auto_embed", String(data.auto_embed ?? true));
  formData.append("file", data.file);
  const res = await api.post("/rag/documents/background", formData, {
    headers: { ...teacherAuthHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function reprocessRAGDocumentBackground(
  documentId: number,
  autoEmbed = true
): Promise<import("@/types/rag").RAGProcessingJob> {
  const res = await api.post(`/rag/documents/${documentId}/reprocess/background`, null, {
    headers: teacherAuthHeaders(),
    params: { auto_embed: autoEmbed },
  });
  return res.data;
}

export async function embedRAGDocumentBackground(
  documentId: number
): Promise<import("@/types/rag").RAGProcessingJob> {
  const res = await api.post(`/rag/documents/${documentId}/embed/background`, null, {
    headers: teacherAuthHeaders(),
  });
  return res.data;
}

export async function getRAGJobs(params?: {
  job_status?: string;
  document_id?: number;
  limit?: number;
}): Promise<import("@/types/rag").RAGProcessingJob[]> {
  const res = await api.get("/rag/jobs", { headers: teacherAuthHeaders(), params });
  return res.data;
}

export async function retryRAGJob(jobId: number): Promise<import("@/types/rag").RAGProcessingJob> {
  const res = await api.post(`/rag/jobs/${jobId}/retry`, null, { headers: teacherAuthHeaders() });
  return res.data;
}

export async function getRAGStorageUsage(): Promise<import("@/types/rag").RAGStorageUsage> {
  const res = await api.get("/rag/storage/usage", { headers: teacherAuthHeaders() });
  return res.data;
}

export async function getRAGMonitoringSummary(): Promise<import("@/types/rag").RAGMonitoringSummary> {
  const res = await api.get("/rag/monitoring/summary", { headers: teacherAuthHeaders() });
  return res.data;
}
