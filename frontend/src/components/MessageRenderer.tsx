import { useState } from 'react';
import type { Message } from '../types';

interface MessageRendererProps {
  message: Message;
}

export default function MessageRenderer({ message }: MessageRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">User</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }

  if (message.type === 'reasoning') {
    const reasoningText = message.content?.[0]?.text || '';
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
                <div key={idx} className="whitespace-pre-wrap">
                  {JSON.stringify(output, null, 2)}
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
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-300">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Assistant</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</div>
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
