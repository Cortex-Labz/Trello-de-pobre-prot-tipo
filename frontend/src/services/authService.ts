import { api } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async getMe(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    const response = await api.put<{ user: User }>('/auth/me', data);
    return response.data;
  },
};
