import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';

interface MessageRendererProps {
  message: Message;
}

// Helper function to extract text from various content formats
function extractText(content: any): string {
  if (!content) return '';

  // If content is a string, return it directly
  if (typeof content === 'string') {
    return content;
  }

  // If content is an array, extract text from each item
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  // If content is an object with a text property
  if (content && typeof content === 'object' && 'text' in content) {
    return content.text;
  }

  // Fallback: stringify the content
  return JSON.stringify(content);
}

// Helper function to render code interpreter output
function renderOutput(output: any): ReactNode {
  if (!output) return null;

  // If output is a string, return it directly
  if (typeof output === 'string') {
    return <pre className="whitespace-pre-wrap font-mono">{output}</pre>;
  }

  // If output has a 'logs' field, display it
  if (output && typeof output === 'object' && 'logs' in output) {
    return <pre className="whitespace-pre-wrap font-mono">{output.logs}</pre>;
  }

  // If output has other specific fields, try to render them nicely
  if (output && typeof output === 'object') {
    // For objects with type field, show the relevant content
    if (output.type === 'logs' && output.logs) {
      return <pre className="whitespace-pre-wrap font-mono">{output.logs}</pre>;
    }
    if (output.type === 'error' && output.message) {
      return <pre className="whitespace-pre-wrap font-mono text-red-600">{output.message}</pre>;
    }
    // For image outputs or other data, try to display appropriately
    if (output.type === 'image' && output.data) {
      return <img src={output.data} alt="Output" className="max-w-full" />;
    }
  }

  // Fallback: stringify the output with nice formatting
  return <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(output, null, 2)}</pre>;
}

export default function MessageRenderer({ message }: MessageRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (message.role === 'user') {
    const userText = extractText(message.content);
    return (
      <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">User</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{userText}</div>
      </div>
    );
  }

  if (message.type === 'reasoning') {
    const reasoningText = extractText(message.content);
    const preview = reasoningText.substring(0, 200);
    const showToggle = reasoningText.length > 200;

    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-blue-700 uppercase">Reasoning</div>
          {showToggle && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {isExpanded || !showToggle ? reasoningText : `${preview}...`}
        </div>
        {message.id && (
          <div className="mt-2 text-xs text-gray-500">ID: {message.id}</div>
        )}
      </div>
    );
  }

  if (message.type === 'code_interpreter_call') {
    return (
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="text-xs font-semibold text-green-700 uppercase mb-2">
          Code Interpreter
        </div>
        {message.code && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Code:</div>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <code>{message.code}</code>
            </pre>
          </div>
        )}
        {message.outputs && message.outputs.length > 0 && (
          <div>
            <div className="text-xs text-gray-600 mb-1">Output:</div>
            <div className="bg-white p-3 rounded border border-green-300 text-xs">
              {message.outputs.map((output: any, idx: number) => (
                <div key={idx}>
                  {renderOutput(output)}
                </div>
              ))}
            </div>
          </div>
        )}
        {message.container_id && (
          <div className="mt-2 text-xs text-gray-500">Container: {message.container_id}</div>
        )}
      </div>
    );
  }

  if (message.role === 'assistant') {
    const assistantText = extractText(message.content);
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-300">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Assistant</div>
        <div className="text-sm text-gray-800 prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{assistantText}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
        {message.type || message.role || 'Unknown'}
      </div>
      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(message, null, 2)}
      </pre>
    </div>
  );
}
