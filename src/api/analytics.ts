import { api, teacherAuthHeaders } from "@/lib/api";
import type {
  TeacherAnalyticsParams,
  TeacherAnalyticsRead,
} from "@/types/api";

export async function getTeacherAnalytics(
  params: TeacherAnalyticsParams = {},
): Promise<TeacherAnalyticsRead> {
  const response = await api.get<TeacherAnalyticsRead>(
    "/analytics/teacher",
    {
      headers: teacherAuthHeaders(),
      params,
    },
  );

  return response.data;
}