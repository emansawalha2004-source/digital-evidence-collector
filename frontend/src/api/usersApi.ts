import { apiClient, type QueryParams } from './client';
import type { ListResponse, User, UserRole } from '../types/api';

export interface UserFilters extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  getUsers(filters?: UserFilters): Promise<ListResponse<User>> {
    return apiClient.getList<User>('/users', filters);
  },
  getUser(id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  },
  updateRole(id: string, role: UserRole): Promise<User> {
    return apiClient.put<User>(`/users/${id}/role`, { role });
  },
  updateStatus(id: string, isActive: boolean): Promise<User> {
    return apiClient.put<User>(`/users/${id}/status`, { isActive });
  }
};
