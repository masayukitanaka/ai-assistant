import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// 型定義
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | { type: string; text?: string; image_url?: { url: string }; source?: any }[];
}

interface RequestBody {
  messages: ChatMessage[];
  images?: string[]; // base64エンコードされた画像
  providers: {
    anthropic: boolean;
    gemini: boolean;
    openai: boolean;
  };
}

interface ProviderResponse {
  provider: string;
  response?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { messages, images = [], providers } = body;

    // 選択されたプロバイダーのリスト
    const selectedProviders: string[] = [];
    if (providers.anthropic) selectedProviders.push('anthropic');
    if (providers.gemini) selectedProviders.push('gemini');
    if (providers.openai) selectedProviders.push('openai');

    if (selectedProviders.length === 0) {
      return NextResponse.json(
        { error: 'At least one provider must be selected' },
        { status: 400 }
      );
    }

    // ReadableStreamを使ってストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const promises: Promise<void>[] = [];

        // 各プロバイダーを並列実行し、完了次第送信
        if (providers.anthropic) {
          promises.push(
            callAnthropic(messages, images).then((result) => {
              const data = JSON.stringify(result) + '\n';
              controller.enqueue(encoder.encode(data));
            })
          );
        }

        if (providers.gemini) {
          promises.push(
            callGemini(messages, images).then((result) => {
              const data = JSON.stringify(result) + '\n';
              controller.enqueue(encoder.encode(data));
            })
          );
        }

        if (providers.openai) {
          promises.push(
            callOpenAI(messages, images).then((result) => {
              const data = JSON.stringify(result) + '\n';
              controller.enqueue(encoder.encode(data));
            })
          );
        }

        // すべてのプロバイダーが完了するまで待つ
        await Promise.allSettled(promises);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Anthropic Claude API呼び出し
async function callAnthropic(
  messages: ChatMessage[],
  images: string[]
): Promise<ProviderResponse> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const anthropic = new Anthropic({ apiKey });

    // メッセージの整形
    const lastMessage = messages[messages.length - 1];
    const content: any[] = [];

    // テキストコンテンツ
    if (typeof lastMessage.content === 'string') {
      content.push({ type: 'text', text: lastMessage.content });
    }

    // 画像コンテンツ
    if (images.length > 0) {
      for (const image of images) {
        // base64画像の処理
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const mediaType = image.match(/data:image\/(\w+);base64/)?.[1] || 'jpeg';

        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: `image/${mediaType}`,
            data: base64Data,
          },
        });
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const responseText = textContent && 'text' in textContent ? textContent.text : '';

    return {
      provider: 'anthropic',
      response: responseText,
    };
  } catch (error: any) {
    return {
      provider: 'anthropic',
      error: error.message || 'Anthropic API error',
    };
  }
}

// Google Gemini API呼び出し
async function callGemini(
  messages: ChatMessage[],
  images: string[]
): Promise<ProviderResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const lastMessage = messages[messages.length - 1];
    const parts: any[] = [];

    // テキストコンテンツ
    if (typeof lastMessage.content === 'string') {
      parts.push({ text: lastMessage.content });
    }

    // 画像コンテンツ
    if (images.length > 0) {
      for (const image of images) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const mimeType = image.match(/data:(image\/\w+);base64/)?.[1] || 'image/jpeg';

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
      }
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    return {
      provider: 'gemini',
      response: text,
    };
  } catch (error: any) {
    return {
      provider: 'gemini',
      error: error.message || 'Gemini API error',
    };
  }
}

// OpenAI API呼び出し
async function callOpenAI(
  messages: ChatMessage[],
  images: string[]
): Promise<ProviderResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const openai = new OpenAI({ apiKey });

    const lastMessage = messages[messages.length - 1];
    const content: any[] = [];

    // テキストコンテンツ
    if (typeof lastMessage.content === 'string') {
      content.push({ type: 'text', text: lastMessage.content });
    }

    // 画像コンテンツ
    if (images.length > 0) {
      for (const image of images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: image,
          },
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 1024,
    });

    const responseText = response.choices[0]?.message?.content || '';

    return {
      provider: 'openai',
      response: responseText,
    };
  } catch (error: any) {
    return {
      provider: 'openai',
      error: error.message || 'OpenAI API error',
    };
  }
}
