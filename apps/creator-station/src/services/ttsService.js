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

  async generateSpeech(text, voice, options = {}) {
    const { exaggeration = 0.5, cfg_weight = 0.5, temperature = 0.8 } = options;

    try {
      const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          voice,
          exaggeration,
          cfg_weight,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      return await response.blob();
    } catch {
      throw new TTSError(
        'Text-to-speech is not available. Record audio manually.'
      );
    }
  }

  async previewVoice(voiceId, sampleText = "Welcome to Urban Quest. Your adventure begins now.") {
    return this.generateSpeech(sampleText, voiceId, {
      exaggeration: 0.5,
      cfg_weight: 0.5,
      temperature: 0.8,
    });
  }

  async listVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/voices`);
      if (!response.ok) {
        throw new Error(`Failed to list voices: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('TTS API not available for voice list:', error.message);
      return [];
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateScene(lines, voiceId, onProgress) {
    const results = [];
    const total = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (onProgress) {
        onProgress({
          current: i,
          total,
          percent: Math.round((i / total) * 100),
          currentLine: line,
        });
      }

      const blob = await this.generateSpeech(line.text, voiceId, line.options);
      const duration = this.estimateDuration(line.text);

      results.push({
        lineIndex: i,
        voiceId,
        duration,
        blob,
        url: URL.createObjectURL(blob),
        generated: true,
      });
    }

    if (onProgress) {
      onProgress({
        current: total,
        total,
        percent: 100,
        complete: true,
      });
    }

    return results;
  }

  estimateDuration(text) {
    const words = text.length / 5;
    const minutes = words / 150;
    const seconds = minutes * 60;
    return Math.max(2, Math.min(6, seconds + (Math.random() - 0.5) * 2));
  }
}

export const ttsService = new TTSService();
export default ttsService;
