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

export function setCookie(name: string, value: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearTeacherAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("teacher_token");
  document.cookie =
    "mt_teacher_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

export function clearStudentAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("student_token");
  document.cookie =
    "mt_student_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;

  clearTeacherAuth();
  clearStudentAuth();
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