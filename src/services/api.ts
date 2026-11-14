import { Attendee, EventConfig } from '../types';

// In development with Vite proxy or production with PHP server, relative '/api' works.
// Also fall back to http://127.0.0.1:8000/api if running Vite directly without proxy.
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.port === '8000') {
    return '/api';
  }
  return '/api';
};

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = getBaseUrl();

async function parseJsonResponse<T = any>(res: Response, fallbackError = 'সার্ভার থেকে ত্রুটিপূর্ণ উত্তর এসেছে'): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    if (res.status === 403) {
      throw new Error('সার্ভারে প্রবেশাধিকার সীমিত (403 Forbidden)। সার্ভার রুলস বা পারমিশন চেক করুন।');
    }
    if (res.status === 404) {
      throw new Error('সার্ভার রুট পাওয়া যায়নি (404 Not Found)।');
    }
    if (res.status >= 500) {
      throw new Error(`সার্ভার ইন্টারনাল এরর (${res.status})।`);
    }
    const cleanSnippet = text.replace(/<[^>]+>/g, '').trim().slice(0, 100);
    throw new Error(cleanSnippet || fallbackError);
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || fallbackError);
  }

  return json;
}

export interface BackendStatus {
  online: boolean;
  driver?: string;
  mysqlError?: string;
  phpVersion?: string;
  attendeesCount?: number;
  message?: string;
}

export const api = {
  /**
   * Check connection to PHP backend
   */
  async checkStatus(): Promise<BackendStatus> {
    try {
      const res = await fetch(`${API_BASE}/status.php`, { credentials: 'same-origin' });
      if (!res.ok) {
        // Try fallback direct port 8000
        const directRes = await fetch('http://127.0.0.1:8000/api/status.php');
        if (directRes.ok) {
          const data = await directRes.json();
          return {
            online: true,
            driver: data.driver,
            phpVersion: data.phpVersion,
            attendeesCount: data.attendeesCount,
            message: data.message,
          };
        }
        return { online: false };
      }
      const data = await res.json();
      return {
        online: true,
        driver: data.driver,
        mysqlError: data.mysqlError,
        phpVersion: data.phpVersion,
        attendeesCount: data.attendeesCount,
        message: data.message,
      };
    } catch {
      // Try fallback direct port 8000 in case proxy is not active
      try {
        const directRes = await fetch('http://127.0.0.1:8000/api/status.php');
        if (directRes.ok) {
          const data = await directRes.json();
          return {
            online: true,
            driver: data.driver,
            phpVersion: data.phpVersion,
            attendeesCount: data.attendeesCount,
            message: data.message,
          };
        }
      } catch {
        // Backend not running
      }
      return { online: false };
    }
  },

  /**
   * Fetch all attendees from PHP backend
   */
  async getAttendees(search?: string): Promise<Attendee[]> {
    const url = search
      ? `${API_BASE}/attendees.php?search=${encodeURIComponent(search)}`
      : `${API_BASE}/attendees.php`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch attendees');
      const json = await res.json();
      return json.data || [];
    } catch {
      // Fallback direct port 8000
      const fallbackUrl = search
        ? `http://127.0.0.1:8000/api/attendees.php?search=${encodeURIComponent(search)}`
        : `http://127.0.0.1:8000/api/attendees.php`;
      const res = await fetch(fallbackUrl);
      const json = await res.json();
      return json.data || [];
    }
  },

  /**
   * Public registration for invited guests (auto generates sequential first-come ID)
   */
  async registerPublicAttendee(data: {
    name: string;
    school?: string;
    district?: string;
    guests?: string;
    phone?: string;
    photoUrl?: string;
  }): Promise<Attendee> {
    const payload = { ...data, action: 'save' };
    try {
      const res = await fetch(`${API_BASE}/attendees.php?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await parseJsonResponse(res, 'নিবন্ধন সম্পন্ন করা যায়নি');
      return json.data;
    } catch (err: any) {
      if (isLocalhost) {
        try {
          const directRes = await fetch('http://127.0.0.1:8000/api/attendees.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await parseJsonResponse(directRes, 'নিবন্ধন সম্পন্ন করা যায়নি');
          return json.data;
        } catch {
          // ignore
        }
      }
      throw err;
    }
  },

  /**
   * Save attendee (upsert: create or update) in database
   */
  async saveAttendee(attendee: Attendee): Promise<Attendee> {
    try {
      const res = await fetch(`${API_BASE}/attendees.php?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendee),
      });
      const json = await res.json();
      if (!json.success) {
        // Fallback to update or create
        try {
          return await this.updateAttendee(attendee);
        } catch {
          return await this.createAttendee(attendee);
        }
      }
      return json.data;
    } catch (err: any) {
      if (isLocalhost) {
        try {
          const directRes = await fetch('http://127.0.0.1:8000/api/attendees.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attendee),
          });
          const json = await directRes.json();
          if (json.success) return json.data;
        } catch {
          // ignore
        }
      }
      // If action=save failed network, try direct create/update
      try {
        return await this.updateAttendee(attendee);
      } catch {
        return await this.createAttendee(attendee);
      }
    }
  },

  /**
   * Create attendee in database
   */
  async createAttendee(attendee: Omit<Attendee, 'id'> & { id?: string }): Promise<Attendee> {
    const res = await fetch(`${API_BASE}/attendees.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendee),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create attendee');
    return json.data;
  },

  /**
   * Update attendee in database (uses POST with action=update for maximum compatibility with InfinityFree & Apache)
   */
  async updateAttendee(attendee: Attendee): Promise<Attendee> {
    try {
      const res = await fetch(`${API_BASE}/attendees.php?action=update&id=${encodeURIComponent(attendee.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendee),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update attendee');
      return json.data;
    } catch (err: any) {
      // Fallback direct port 8000 in case proxy is not active
      try {
        const fallbackUrl = `http://127.0.0.1:8000/api/attendees.php?action=update&id=${encodeURIComponent(attendee.id)}`;
        const res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendee),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to update attendee');
        return json.data;
      } catch {
        throw err;
      }
    }
  },

  /**
   * Delete attendee from database and return re-adjusted attendees list
   */
  async deleteAttendee(id: string, regNo?: string): Promise<{ success: boolean; data?: Attendee[] }> {
    const params = new URLSearchParams({ action: 'delete', id });
    if (regNo) params.append('regNo', regNo);
    const queryString = params.toString();

    try {
      const res = await fetch(`${API_BASE}/attendees.php?${queryString}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, regNo, action: 'delete' }),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: !!json.success, data: json.data };
      }
    } catch {
      // Fallback direct port 8000
      try {
        const fallbackUrl = `http://127.0.0.1:8000/api/attendees.php?${queryString}`;
        const res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, regNo, action: 'delete' }),
        });
        const json = await res.json();
        return { success: !!json.success, data: json.data };
      } catch {
        return { success: false };
      }
    }
    return { success: false };
  },

  /**
   * Batch import attendees (replace or append)
   */
  async batchImport(attendees: Attendee[], mode: 'replace' | 'append' = 'append'): Promise<Attendee[]> {
    const res = await fetch(`${API_BASE}/attendees.php?action=batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendees, mode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to batch import');
    return json.data;
  },

  /**
   * Reset attendees back to default initial seed
   */
  async resetAttendees(): Promise<Attendee[]> {
    const res = await fetch(`${API_BASE}/attendees.php?action=reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Fetch event config from PHP backend
   */
  async getConfig(): Promise<EventConfig> {
    try {
      const res = await fetch(`${API_BASE}/config.php`);
      if (!res.ok) throw new Error('Failed to fetch config');
      const json = await res.json();
      return json.data;
    } catch {
      const res = await fetch('http://127.0.0.1:8000/api/config.php');
      const json = await res.json();
      return json.data;
    }
  },

  /**
   * Update event config in database
   */
  async updateConfig(config: EventConfig): Promise<EventConfig> {
    const res = await fetch(`${API_BASE}/config.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update config');
    return json.data;
  },

  /**
   * Upload attendee photo
   */
  async uploadPhoto(fileOrBase64: File | string, attendeeId?: string): Promise<string> {
    if (typeof fileOrBase64 === 'string') {
      // Base64
      const res = await fetch(`${API_BASE}/upload.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: fileOrBase64, attendeeId }),
      });
      const json = await parseJsonResponse(res, 'ছবি আপলোড করা যায়নি');
      return json.url;
    } else {
      // Multipart File
      const formData = new FormData();
      formData.append('photo', fileOrBase64);
      if (attendeeId) {
        formData.append('attendeeId', attendeeId);
      }
      const res = await fetch(`${API_BASE}/upload.php`, {
        method: 'POST',
        body: formData,
      });
      const json = await parseJsonResponse(res, 'ছবি আপলোড করা যায়নি');
      return json.url;
    }
  },
};

