import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

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

export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function clearTeacherAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("teacher_token");
  clearCookie("mt_teacher_auth");
  clearCookie("mt_teacher_login");
}

export function clearStudentAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("student_token");
  clearCookie("mt_student_auth");
  clearCookie("mt_student_login");
}

export function clearAuthTokens() {
  clearTeacherAuth();
  clearStudentAuth();
  clearCookie("mt_role");
  clearCookie("mt_login");
}

export function getFileUrl(path?: string | null) {
  if (!path) return null;

  const normalized = String(path).replaceAll("\\", "/").trim();

  if (!normalized) return null;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  let clean = normalized.replace(/^\.\//, "");

  const appUploadsMarker = "app/uploads/";
  const appUploadsIndex = clean.indexOf(appUploadsMarker);
  if (appUploadsIndex >= 0) {
    clean = `uploads/${clean.slice(appUploadsIndex + appUploadsMarker.length)}`;
  }

  if (clean.startsWith("/app/uploads/")) {
    clean = `uploads/${clean.slice("/app/uploads/".length)}`;
  }

  if (clean.startsWith("/uploads/")) {
    return `${API_BASE_URL}${clean}`;
  }

  if (clean.startsWith("uploads/")) {
    return `${API_BASE_URL}/${clean}`;
  }

  if (clean.startsWith("/")) {
    return `${API_BASE_URL}${clean}`;
  }

  return `${API_BASE_URL}/${clean}`;
}

export function teacherAuthHeaders() {
  const token = getTeacherToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function studentAuthHeaders() {
  const token = getStudentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
