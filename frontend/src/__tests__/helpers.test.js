import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage } from '../utils/helpers';

describe('getFriendlyErrorMessage utility', () => {
  describe('String inputs (AI/API raw errors)', () => {
    it('maps Gemini 429 quota exceeded error correctly', () => {
      const rawError = 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash-lite';
      const result = getFriendlyErrorMessage(rawError);
      expect(result).toContain('โควตาการใช้งาน AI (Gemini) ของระบบฟรีเต็มแล้ว');
      expect(result).toContain('กรุณารอสักครู่');
    });

    it('maps other rate limit/429 strings', () => {
      expect(getFriendlyErrorMessage('rate limit reached')).toContain('โควตาการใช้งาน AI');
      expect(getFriendlyErrorMessage('ResourceExhausted')).toContain('โควตาการใช้งาน AI');
      expect(getFriendlyErrorMessage('Please retry in 24s')).toContain('โควตาการใช้งาน AI');
    });

    it('maps invalid API Key errors', () => {
      expect(getFriendlyErrorMessage('API_KEY_INVALID')).toContain('รหัสกุญแจเชื่อมต่อ (API Key) ไม่ถูกต้อง');
      expect(getFriendlyErrorMessage('GEMINI_API_KEY is not set')).toContain('รหัสกุญแจเชื่อมต่อ (API Key) ไม่ถูกต้อง');
    });

    it('maps model overload/unavailable errors', () => {
      expect(getFriendlyErrorMessage('Model is overloaded')).toContain('เซิร์ฟเวอร์ AI ปลายทางขัดข้องชั่วคราวหรือกำลังทำงานหนักเกินไป');
      expect(getFriendlyErrorMessage('Service Unavailable 503')).toContain('เซิร์ฟเวอร์ AI ปลายทางขัดข้องชั่วคราวหรือกำลังทำงานหนักเกินไป');
    });

    it('maps network connection errors', () => {
      expect(getFriendlyErrorMessage('Failed to fetch')).toContain('ไม่สามารถเชื่อมต่อเครือข่ายไปยังเซิร์ฟเวอร์ AI ได้');
      expect(getFriendlyErrorMessage('network error')).toContain('ไม่สามารถเชื่อมต่อเครือข่ายไปยังเซิร์ฟเวอร์ AI ได้');
    });

    it('returns fallback for unknown errors', () => {
      expect(getFriendlyErrorMessage('some random api error')).toContain('เกิดข้อผิดพลาดในการประมวลผลของ AI');
    });
  });

  describe('Object inputs (Axios/HTTP errors)', () => {
    it('handles null/undefined gracefully', () => {
      expect(getFriendlyErrorMessage(null)).toContain('เกิดข้อผิดพลาดที่ไม่รู้จัก');
      expect(getFriendlyErrorMessage(undefined)).toContain('เกิดข้อผิดพลาดที่ไม่รู้จัก');
    });

    it('maps HTTP 401 Unauthorized', () => {
      const err = { response: { status: 401 } };
      expect(getFriendlyErrorMessage(err)).toContain('คุณยังไม่ได้เข้าสู่ระบบ หรือเซสชันของคุณหมดอายุแล้ว');
    });

    it('maps HTTP 403 Forbidden', () => {
      const err = { response: { status: 403 } };
      expect(getFriendlyErrorMessage(err)).toContain('คุณไม่มีสิทธิ์ในการเข้าถึง');
    });

    it('maps HTTP 404 Not Found', () => {
      const err = { response: { status: 404 } };
      expect(getFriendlyErrorMessage(err)).toContain('ไม่พบข้อมูลหรือหน้าที่ต้องการ');
    });

    it('maps HTTP 429 Too Many Requests', () => {
      const err = { response: { status: 429 } };
      expect(getFriendlyErrorMessage(err)).toContain('มีการส่งคำขอมากเกินไปชั่วคราว');
    });

    it('maps HTTP 500 Server Error', () => {
      const err = { response: { status: 500 } };
      expect(getFriendlyErrorMessage(err)).toContain('ระบบหลังบ้านขัดข้องชั่วคราว');
    });

    it('extracts and maps inner data error from response', () => {
      const err = {
        response: {
          status: 502,
          data: {
            error: 'gemini 429: quota exceeded'
          }
        }
      };
      expect(getFriendlyErrorMessage(err)).toContain('โควตาการใช้งาน AI (Gemini) ของระบบฟรีเต็มแล้ว');
    });

    it('maps general Axios network errors', () => {
      const err = { message: 'Network Error' };
      expect(getFriendlyErrorMessage(err)).toContain('การเชื่อมต่อเครือข่ายล้มเหลว');
    });

    it('maps general Axios timeout errors', () => {
      const err = { message: 'timeout of 5000ms exceeded' };
      expect(getFriendlyErrorMessage(err)).toContain('หมดเวลารอการตอบรับจากเซิร์ฟเวอร์');
    });
  });
});
