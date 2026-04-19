import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface KnowledgeEntry {
  title: string;
  content: string;
}

export interface ChatbotReply {
  answer: string;
  source: 'cloud' | 'local-rag';
  citations: Array<{ title: string }>;
}

@Injectable()
export class ChatbotService {
  private readonly knowledgeBase: KnowledgeEntry[] = [];

  constructor() {
    this.loadKnowledgeBase();
  }

  async chat(message: string): Promise<ChatbotReply> {
    const contexts = this.retrieveContext(message, 3);
    const cloudAnswer = await this.requestCloudModel(message, contexts);

    if (cloudAnswer) {
      return {
        answer: cloudAnswer,
        source: 'cloud',
        citations: contexts.map((entry) => ({ title: entry.title })),
      };
    }

    return {
      answer: this.buildLocalAnswer(message, contexts),
      source: 'local-rag',
      citations: contexts.map((entry) => ({ title: entry.title })),
    };
  }

  private buildLocalAnswer(message: string, contexts: KnowledgeEntry[]): string {
    if (contexts.length === 0) {
      return (
        'Tôi chưa tìm thấy nội dung sơ cứu phù hợp trong cơ sở tri thức nội bộ. ' +
        'Với tình huống khẩn cấp, hãy gọi 115 ngay và làm theo hướng dẫn của nhân viên y tế.'
      );
    }

    const guidance = contexts
      .map((entry, index) => `${index + 1}. ${entry.title}: ${entry.content}`)
      .join('\n');

    return (
      `Dựa trên dữ liệu sơ cứu chuẩn, đây là hướng dẫn tham khảo cho câu hỏi: "${message}".\n` +
      `${guidance}\n\n` +
      'Lưu ý: Đây là nội dung tham khảo, không thay thế chẩn đoán bác sĩ. Trong tình huống nguy hiểm, gọi 115 ngay.'
    );
  }

  private retrieveContext(message: string, limit: number): KnowledgeEntry[] {
    const keywords = this.normalizeText(message)
      .split(' ')
      .filter((token) => token.length > 2);

    if (keywords.length === 0) {
      return this.knowledgeBase.slice(0, limit);
    }

    const scored = this.knowledgeBase
      .map((entry) => {
        const haystack = this.normalizeText(`${entry.title} ${entry.content}`);
        const score = keywords.reduce((acc, token) => {
          return haystack.includes(token) ? acc + 1 : acc;
        }, 0);
        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.entry);

    return scored.length > 0 ? scored : this.knowledgeBase.slice(0, limit);
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async requestCloudModel(
    message: string,
    contexts: KnowledgeEntry[],
  ): Promise<string | null> {
    const endpoint = process.env.CHAT_MODEL_API_URL;
    const apiKey = process.env.CHAT_MODEL_API_KEY;

    if (!endpoint) {
      return null;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          message,
          contexts,
          instruction:
            'Answer in Vietnamese, keep medical advice safe and include emergency recommendation when needed.',
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        answer?: string;
        output?: string;
        text?: string;
      };

      return payload.answer || payload.output || payload.text || null;
    } catch {
      return null;
    }
  }

  private loadKnowledgeBase() {
    const filePath = this.resolveDataFile('cam_nang_so_cuu.csv');
    if (!filePath) {
      return;
    }

    const csv = readFileSync(filePath, 'utf8');
    const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

    for (let i = 1; i < lines.length; i += 1) {
      const separatorIndex = lines[i].indexOf(';');
      if (separatorIndex === -1) {
        continue;
      }

      const title = lines[i].slice(0, separatorIndex).trim();
      const content = lines[i].slice(separatorIndex + 1).trim();
      if (!title || !content) {
        continue;
      }

      this.knowledgeBase.push({ title, content });
    }
  }

  private resolveDataFile(fileName: string): string | null {
    const candidates = [
      resolve(process.cwd(), '../ai/data', fileName),
      resolve(process.cwd(), 'ai/data', fileName),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }
}
