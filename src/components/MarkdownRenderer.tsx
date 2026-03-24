'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          return !inline && language ? (
            <div className="relative my-4 rounded-lg overflow-hidden">
              {/* Language badge */}
              <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-800 rounded-bl-lg">
                {language}
              </div>
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre({ children }: any) {
          return <>{children}</>;
        },
        h1({ children }: any) {
          return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
        },
        h2({ children }: any) {
          return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
        },
        h3({ children }: any) {
          return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
        },
        p({ children }: any) {
          return <p className="mb-4 leading-7">{children}</p>;
        },
        ul({ children }: any) {
          return <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>;
        },
        ol({ children }: any) {
          return <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>;
        },
        li({ children }: any) {
          return <li className="leading-7">{children}</li>;
        },
        blockquote({ children }: any) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700">
              {children}
            </blockquote>
          );
        },
        a({ href, children }: any) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {children}
            </a>
          );
        },
        table({ children }: any) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }: any) {
          return <thead className="bg-gray-100">{children}</thead>;
        },
        th({ children }: any) {
          return (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }: any) {
          return <td className="border border-gray-300 px-4 py-2">{children}</td>;
        },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
