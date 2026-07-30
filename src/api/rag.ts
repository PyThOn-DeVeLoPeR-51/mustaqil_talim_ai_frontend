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
