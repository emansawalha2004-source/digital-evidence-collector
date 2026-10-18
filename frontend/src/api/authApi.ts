import { apiClient } from './client';
import type { User } from '../types/api';

export interface AuthResponse { user: User; token: string; }
export interface MfaRequiredResponse { mfaRequired: true; mfaToken: string; challengeType?: 'otp' | 'totp'; devOtp?: string; }
export type LoginResponse = AuthResponse | MfaRequiredResponse;
export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { fullName: string; email: string; password: string; confirmPassword: string; }
export interface MfaSetupResponse { otpauthUrl: string; qrCodeDataUrl: string; manualEntryKey: string; }
export interface BackupCodesResponse { message: string; backupCodes: string[]; }
export interface ForgotPasswordResponse { message: string; devOtp?: string; }

export const authApi = {
  login(payload: LoginPayload): Promise<LoginResponse> { return apiClient.post<LoginResponse>('/auth/login', payload); },
  verifyLoginMfa(payload: { mfaToken: string; code: string }): Promise<AuthResponse> { return apiClient.post<AuthResponse>('/auth/login/verify-mfa', payload); },
  register(payload: RegisterPayload): Promise<LoginResponse> { return apiClient.post<LoginResponse>('/auth/register', payload); },
  me(): Promise<User> { return apiClient.get<User>('/auth/me'); },
  logout(): Promise<{ message: string }> { return apiClient.post<{ message: string }>('/auth/logout'); },
  changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/auth/change-password', payload);
  },
  forgotPassword(payload: { email: string }): Promise<ForgotPasswordResponse> { return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload); },
  resetPassword(payload: { email: string; code: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> { return apiClient.post<{ message: string }>('/auth/reset-password', payload); },
  setupMfa(): Promise<MfaSetupResponse> { return apiClient.post<MfaSetupResponse>('/auth/mfa/setup'); },
  verifyMfaSetup(payload: { code: string }): Promise<BackupCodesResponse> { return apiClient.post<BackupCodesResponse>('/auth/mfa/verify', payload); },
  disableMfa(payload: { password: string; code: string }): Promise<{ message: string }> { return apiClient.post<{ message: string }>('/auth/mfa/disable', payload); },
  regenerateBackupCodes(payload: { password: string; code: string }): Promise<BackupCodesResponse> { return apiClient.post<BackupCodesResponse>('/auth/mfa/backup-codes/regenerate', payload); },
};
