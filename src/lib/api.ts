// API configuration and service

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  expense_date: string;
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  tags?: string[];
  attachments?: Array<{ name: string; url: string }>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  user_id: string;
  expense_date: string;
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  tags?: string[];
  attachments?: Array<{ name: string; url: string }>;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.detail || error.message || "Request failed");
    }

    return response.json();
  }

  // Auth
  async signup(email: string, password: string, name: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.request<User>("/auth/me");
  }

  // Profile
  async getProfile(): Promise<ApiResponse<Profile>> {
    return this.request<Profile>("/profiles/me");
  }

  async updateProfile(data: Partial<Profile>): Promise<ApiResponse<Profile>> {
    return this.request<Profile>("/profiles/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Expenses
  async getExpenses(days?: number): Promise<ApiResponse<Expense[]>> {
    const params = days ? `?days=${days}` : "";
    return this.request<Expense[]>(`/expenses${params}`);
  }

  async getExpense(id: string): Promise<ApiResponse<Expense>> {
    return this.request<Expense>(`/expenses/${id}`);
  }

  async createExpense(data: ExpenseCreate): Promise<ApiResponse<Expense>> {
    return this.request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: Partial<ExpenseCreate>): Promise<ApiResponse<Expense>> {
    return this.request<Expense>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/expenses/${id}`, {
      method: "DELETE",
    });
  }

  // S3 File Management
  async uploadFile(file: File): Promise<ApiResponse<{
    file_key: string;
    original_filename: string;
    size_bytes: number;
    uploaded_at: string;
    notifications: any;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${API_BASE_URL}/s3/upload`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.detail || error.message || "Upload failed");
    }

    return response.json();
  }

  async listFiles(): Promise<ApiResponse<{
    files: Array<{
      key: string;
      size: number;
      last_modified: string;
      etag: string;
      original_filename: string;
    }>;
    total_count: number;
  }>> {
    return this.request(`/s3/files`);
  }
}

export const api = new ApiClient();
