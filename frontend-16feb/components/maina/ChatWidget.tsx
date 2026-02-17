'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { QuickActions } from './QuickActions';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

function formatResponse(data: any): string {
  if (!data) return 'No response received.';
  if (typeof data === 'string') return data;
  if (data.type === 'text') return String(data.text || '');
  if (data.type === 'enforcement_status') {
    const stats = data.stats || {};
    const total = Number(stats.total_actions || 0);
    const successful = Number(stats.successful || 0);
    const last24h = Number(stats.last_24h || 0);
    const controls = Number(data.controls_enforced || 0);
    const policies = Array.isArray(data.active_policies)
      ? data.active_policies.map((p: any) => p?.name).filter(Boolean)
      : [];
    const policyLine = policies.length > 0 ? policies.join(', ') : 'None';
    return [
      'Enforcement status',
      `Total actions: ${total}`,
      `Successful: ${successful}`,
      `Last 24h: ${last24h}`,
      `Controls enforced: ${controls}`,
      `Active policies: ${policyLine}`,
    ].join('\n');
  }
  if (data.type === 'enforcement_result') {
    const outcome = data.success ? 'Success' : 'Failed';
    const action = data.action || 'Action';
    const target = data.target ? ` on ${data.target}` : '';
    const message = data.message ? ` - ${data.message}` : '';
    return `${action}${target}: ${outcome}${message}`;
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return 'Response received.';
  }
}

function createId() {
  return Math.random().toString(36).slice(2);
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'maina-welcome', role: 'assistant', content: 'Hi, I am Maina. How can I help with enforcement today?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages]);

  const sendMessage = async (value: string) => {
    const text = String(value || '').trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { id: createId(), role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const tenantId = readCookie('sw_tenant') || 'demo-tenant';
      const res = await fetch('/api/maina/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Failed to reach Maina (${res.status})`);
      }
      setMessages((prev) => [...prev, { id: createId(), role: 'assistant', content: formatResponse(data) }]);
    } catch (err: any) {
      const message = err?.message || 'Please try again.';
      toast.error('Maina request failed', message);
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: 'assistant', content: 'Sorry, I could not complete that request.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 sm:w-96 rounded-2xl border border-gray-200 shadow-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <div className="text-sm font-semibold text-gray-900">Maina Assistant</div>
              <div className="text-xs text-gray-500">Automated enforcement helper</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close Maina"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3">
            <QuickActions onSelect={sendMessage} disabled={sending} />
          </div>

          <div className="px-4 pb-4 max-h-72 overflow-y-auto space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-2xl px-3 py-2 text-sm max-w-[80%]'
                      : 'bg-gray-100 text-gray-900 rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap'
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="border-t px-3 py-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask Maina about enforcement..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          className="flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 shadow-lg hover:bg-blue-700"
          onClick={() => setOpen(true)}
          aria-label="Open Maina"
          type="button"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Maina</span>
        </button>
      )}
    </div>
  );
}
