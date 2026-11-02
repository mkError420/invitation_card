import { Attendee, EventConfig } from '../types';

// In development with Vite proxy or production with PHP server, relative '/api' works.
// Also fall back to http://127.0.0.1:8000/api if running Vite directly without proxy.
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.port === '8000') {
    return '/api';
  }
  return '/api';
};

const API_BASE = getBaseUrl();

export interface BackendStatus {
  online: boolean;
  driver?: string;
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
    const res = await fetch(`${API_BASE}/attendees.php?action=update&id=${encodeURIComponent(attendee.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendee),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update attendee');
    return json.data;
  },

  /**
   * Delete attendee from database (uses POST with action=delete)
   */
  async deleteAttendee(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/attendees.php?action=delete&id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    return !!json.success;
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
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to upload image');
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
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to upload photo');
      return json.url;
    }
  },
};

