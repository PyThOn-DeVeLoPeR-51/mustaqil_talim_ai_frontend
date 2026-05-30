import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getFileUrl(path?: string | null) {
  if (!path) return null;

  const normalized = path.replaceAll("\\", "/");

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  const marker = "app/uploads/";
  if (normalized.includes(marker)) {
    const relative = normalized.split(marker)[1];
    return `${API_BASE_URL}/uploads/${relative}`;
  }

  return `${API_BASE_URL}/${normalized.replace(/^\/+/, "")}`;
}

export function getTeacherToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("teacher_token");
}

export function getStudentToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("student_token");
}

export function setTeacherToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("teacher_token", token);
}

export function setStudentToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("student_token", token);
}

export function teacherAuthHeaders() {
  const token = getTeacherToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function studentAuthHeaders() {
  const token = getStudentToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}