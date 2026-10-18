import { apiClient } from "./client";
import type { DashboardData } from "../types/api";

export const dashboardApi = {
  getDashboard(): Promise<DashboardData> {
    return apiClient.get<DashboardData>("/dashboard");
  }
};