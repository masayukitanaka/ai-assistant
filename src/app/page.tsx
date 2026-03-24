'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
}

interface ProviderResponse {
  provider: string;
  response?: string;
  error?: string;
}

interface ConversationTurn {
  userMessage: string;
  responses: Record<string, string>; // provider -> response
}

export default function Home() {
  const [conversations, setConversations] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState({
    anthropic: true,
    gemini: true,
    openai: true,
  });
  const [activeTab, setActiveTab] = useState<string>('anthropic');
  const [isComposing, setIsComposing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ローカルストレージのキー
  const STORAGE_KEY = 'ai-assistant-conversations';

  // 初期化: ローカルストレージから会話履歴を読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      }
    } catch (error) {
      console.error('Failed to load conversations from localStorage:', error);
    }
  }, []);

  // 会話履歴が変更されたらローカルストレージに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations to localStorage:', error);
    }
  }, [conversations]);

  // 会話履歴をクリア
  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all conversation history?')) {
      setConversations([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 画像ファイルの処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setImages([...images, ...newImages]);
  };

  // 画像を削除
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // メッセージ送信
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!input.trim() && images.length === 0) return;
    if (!providers.anthropic && !providers.gemini && !providers.openai) {
      alert('Please select at least one provider');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // 選択されたプロバイダーのリスト
    const selectedProviders: string[] = [];
    if (providers.anthropic) selectedProviders.push('anthropic');
    if (providers.gemini) selectedProviders.push('gemini');
    if (providers.openai) selectedProviders.push('openai');

    // 初期状態として「In progress」を設定
    const initialResponses: Record<string, string> = {};
    selectedProviders.forEach((provider) => {
      initialResponses[provider] = 'In progress...';
    });

    const newTurn: ConversationTurn = {
      userMessage: currentInput,
      responses: initialResponses,
    };

    const newConversations = [...conversations, newTurn];
    setConversations(newConversations);
    setImages([]);

    // アクティブなタブを最初のプロバイダーに設定
    if (selectedProviders.length > 0) {
      setActiveTab(selectedProviders[0]);
    }

    // 各プロバイダーに個別にリクエストを送信
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [userMessage],
          images,
          providers,
        }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      // ストリーミングレスポンスを読み取る
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // 最後の不完全な行はバッファに残す
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const providerRes: ProviderResponse = JSON.parse(line);

              // リアルタイムで会話を更新
              setConversations((prevConversations) => {
                const updated = [...prevConversations];
                const lastTurn = updated[updated.length - 1];

                if (providerRes.response) {
                  lastTurn.responses[providerRes.provider] = providerRes.response;
                } else if (providerRes.error) {
                  lastTurn.responses[providerRes.provider] = `Error: ${providerRes.error}`;
                }

                return updated;
              });
            } catch (parseError) {
              console.error('Failed to parse JSON:', line, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // プロバイダーの選択切り替え
  const toggleProvider = (provider: keyof typeof providers) => {
    setProviders({
      ...providers,
      [provider]: !providers[provider],
    });
  };

  // プロバイダー表示名の取得
  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      anthropic: 'Claude',
      gemini: 'Gemini',
      openai: 'GPT-4',
    };
    return labels[provider] || provider;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-sm text-gray-600 mt-1">
              Query multiple AI providers simultaneously: Anthropic Claude, Google Gemini, OpenAI GPT-4
            </p>
          </div>
          {conversations.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-6xl w-full mx-auto">
        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <p className="text-lg">Enter a message to get started</p>
              <p className="text-sm mt-2">You can send text and images</p>
            </div>
          ) : (
            conversations.map((turn, turnIndex) => (
              <div key={turnIndex} className="space-y-4">
                {/* ユーザーメッセージ */}
                <div className="flex justify-end">
                  <div className="max-w-2xl bg-blue-600 text-white rounded-lg px-4 py-3">
                    <div className="whitespace-pre-wrap">{turn.userMessage}</div>
                  </div>
                </div>

                {/* AIレスポンス - タブUI */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* タブヘッダー */}
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    {Object.keys(turn.responses).map((provider) => (
                      <button
                        key={provider}
                        onClick={() => setActiveTab(provider)}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === provider
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {getProviderLabel(provider)}
                      </button>
                    ))}
                  </div>

                  {/* タブコンテンツ */}
                  <div className="p-4">
                    {Object.entries(turn.responses).map(([provider, response]) => (
                      <div
                        key={provider}
                        className={activeTab === provider ? 'block' : 'hidden'}
                      >
                        <div className="text-gray-900">
                          <MarkdownRenderer content={response} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="bg-white border-t border-gray-200 p-6">
          {/* Provider Selection */}
          <div className="mb-4 flex items-center space-x-6">
            <span className="text-sm font-medium text-gray-700">Providers:</span>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={providers.anthropic}
                onChange={() => toggleProvider('anthropic')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Anthropic Claude</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={providers.gemini}
                onChange={() => toggleProvider('gemini')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Google Gemini</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={providers.openai}
                onChange={() => toggleProvider('openai')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">OpenAI GPT-4</span>
            </label>
          </div>

          {/* 画像プレビュー */}
          {images.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-3 font-medium transition-colors"
            >
              📎 Images
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Enter your message..."
              rows={3}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && images.length === 0)}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
