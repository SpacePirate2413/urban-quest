// Thin client for our self-hosted Chatterbox TTS server (see
// /Users/jaybrentyoungblood/src/chatterbox-tts-api). Chatterbox handles voice
// cloning from a sample file plus end-to-end synthesis with internal text
// chunking, so for a typical scene script we send ONE request and get back
// ONE audio blob.

class TTSError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TTSError';
  }
}

class TTSService {
  constructor(baseUrl = 'http://localhost:4123') {
    this.baseUrl = baseUrl;
  }

  // List the voices currently registered in chatterbox's voice library.
  // Returns [{ name, filename, language, ... }] — the shape chatterbox returns
  // from /v1/voices. The creator-station merges this with our metadata catalog
  // (NARRATOR_VOICES) so every chatterbox voice is pickable, and the catalog
  // adds friendly display names + colors to known IDs.
  async listVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/voices`);
      if (!response.ok) throw new Error(`Failed to list voices: ${response.status}`);
      const data = await response.json();
      return data.voices ?? [];
    } catch (err) {
      console.warn('TTS API not available for voice list:', err.message);
      return [];
    }
  }

  // URL the browser can hit directly to play the source sample for a voice.
  // chatterbox sets CORS_ORIGINS='*' by default so this works from the
  // creator-station origin without a proxy.
  voicePreviewUrl(voiceName) {
    if (!voiceName) return null;
    return `${this.baseUrl}/v1/voices/${encodeURIComponent(voiceName)}/download`;
  }

  // Synthesize an entire script with one TTS request. Chatterbox internally
  // splits long text into chunks and concatenates the audio, returning a
  // single file — so callers always receive one Blob regardless of script
  // length. Throws TTSError if chatterbox is unreachable.
  async generateScript(text, voiceName, options = {}) {
    const { exaggeration = 0.5, cfg_weight = 0.5, temperature = 0.8 } = options;
    let response;
    try {
      response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          voice: voiceName,
          exaggeration,
          cfg_weight,
          temperature,
        }),
      });
    } catch {
      throw new TTSError(
        'Could not reach the AI narrator. Make sure Chatterbox is running on ' + this.baseUrl + ', then try again.',
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new TTSError(
        `Narration generation failed (${response.status}). ${detail.slice(0, 200)}`,
      );
    }
    return response.blob();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Lightweight progress poll while a generation is in flight. Chatterbox
  // exposes /v1/status/progress which returns chunk progress for the
  // currently-running TTS request. Returns null on error so callers can
  // gracefully skip a tick.
  async getProgress() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/status/progress`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
