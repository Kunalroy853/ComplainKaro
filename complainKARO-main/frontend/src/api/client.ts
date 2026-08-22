export const BASE_URL = import.meta.env.VITE_API_URL || 'https://complainkaro.onrender.com';

function getToken(): string | null {
  return localStorage.getItem('vl_token');
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(rest.body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: finalHeaders,
    ...rest,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  loginStudent: (phone: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login/student', {
      method: 'POST', auth: false,
      body: JSON.stringify({ phone, password }),
    }),

  loginWarden: (name: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login/warden', {
      method: 'POST', auth: false,
      body: JSON.stringify({ name, password }),
    }),

  registerStudent: (data: { name: string; roomNumber: string; phone: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/register/student', {
      method: 'POST', auth: false,
      body: JSON.stringify(data),
    }),

  registerWarden: (data: { name: string; hostelBlock: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/register/warden', {
      method: 'POST', auth: false,
      body: JSON.stringify(data),
    }),

  // Complaints
  submitComplaint: (formData: FormData) =>
    request<{ ticket: Ticket; isDuplicate: boolean; pipeline: PipelineInfo }>('/api/complaints', {
      method: 'POST',
      body: formData,
    }),

  // Tickets
  getTickets: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ tickets: TicketWithStudent[] }>(`/api/tickets${qs}`);
  },

  getMyTickets: () =>
    request<{ tickets: Ticket[] }>('/api/tickets/my'),

  getTicket: (id: string) =>
    request<{ ticket: TicketWithStudent }>(`/api/tickets/${id}`),

  updateTicketStatus: (id: string, status: TicketStatus) =>
    request<{ ticket: Ticket }>(`/api/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteTicket: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/tickets/${id}`, {
      method: 'DELETE',
    }),

  health: () =>
    request<{ status: string; services: Record<string, boolean> }>('/health', { auth: false }),
};

// ── Types ──────────────────────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'duplicate' | 'flagged' | 'resolved';
export type TicketCategory = 'wifi' | 'electricity' | 'water' | 'food' | 'hygiene' | 'security' | 'maintenance' | 'other';

export interface User {
  id: string;
  name: string;
  role: 'student' | 'warden';
  roomNumber?: string;
  hostelBlock?: string;
}

export interface Ticket {
  id: string;
  studentId: string;
  audioUrl: string;
  transcript: string;
  category: TicketCategory;
  urgencyScore: number;
  confidenceScore: number;
  status: TicketStatus;
  clusterId: string | null;
  reportCount: number;
  needsManualReview: number;
  classificationSource: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TicketWithStudent extends Ticket {
  studentName: string | null;
  roomNumber: string | null;
  phone?: string | null;
}

export interface PipelineInfo {
  transcriptSource: string;
  classificationSource: string;
  embeddingGenerated: boolean;
  dedupChecked: boolean;
}

export const BASE_WS_URL = BASE_URL.replace('http', 'ws');
