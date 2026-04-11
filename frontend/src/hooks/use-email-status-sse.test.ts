import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEmailStatusSse, type EmailStatusEvent, type MessageEvent } from './use-email-status-sse';

class MockEventSource {
  static instance: MockEventSource | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  close = vi.fn();

  constructor(public url: string, public options?: EventSourceInit) {
    MockEventSource.instance = this;
  }

  trigger(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  triggerRaw(raw: string) {
    this.onmessage?.(new MessageEvent('message', { data: raw }));
  }
}

vi.stubGlobal('EventSource', MockEventSource);

describe('useEmailStatusSse', () => {
  beforeEach(() => {
    MockEventSource.instance = null;
  });

  it('chama onEvent para evento email:status válido', () => {
    const onEvent = vi.fn();
    renderHook(() => useEmailStatusSse(onEvent));

    const event: EmailStatusEvent = {
      event: 'email:status',
      jobId: 'job-1',
      type: 'family_invite',
      status: 'sent',
    };
    MockEventSource.instance!.trigger(event);

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('ignora eventos com campo event diferente de email:status', () => {
    const onEvent = vi.fn();
    renderHook(() => useEmailStatusSse(onEvent));

    MockEventSource.instance!.trigger({ event: 'outro:evento', jobId: 'job-2' });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('ignora payloads com JSON malformado', () => {
    const onEvent = vi.fn();
    renderHook(() => useEmailStatusSse(onEvent));

    MockEventSource.instance!.triggerRaw('{ isso nao e json {{{');

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('usa sempre o callback mais recente sem recriar o EventSource', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ cb }) => useEmailStatusSse(cb), {
      initialProps: { cb: first },
    });

    const es = MockEventSource.instance!;
    rerender({ cb: second });

    // EventSource não deve ter sido recriado
    expect(MockEventSource.instance).toBe(es);

    es.trigger({ event: 'email:status', jobId: 'job-3', type: 'forgot_password', status: 'failed' });

    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it('fecha o EventSource ao desmontar', () => {
    const { unmount } = renderHook(() => useEmailStatusSse(vi.fn()));
    const es = MockEventSource.instance!;

    unmount();

    expect(es.close).toHaveBeenCalledOnce();
  });

  it('chama onMessage para evento message válido', () => {
    const onEvent = vi.fn();
    const onMessage = vi.fn();
    renderHook(() => useEmailStatusSse(onEvent, onMessage));

    const event: MessageEvent = {
      event: 'message',
      id: 'msg-1',
      type: 'admin',
      content: 'Sistema em manutenção',
      createdAt: new Date().toISOString(),
    };
    MockEventSource.instance!.trigger(event);

    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith(event);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('não chama onMessage quando não fornecido para evento message', () => {
    const onEvent = vi.fn();
    renderHook(() => useEmailStatusSse(onEvent));

    MockEventSource.instance!.trigger({
      event: 'message',
      id: 'msg-2',
      content: 'Olá',
      createdAt: new Date().toISOString(),
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('usa sempre o callback onMessage mais recente sem recriar EventSource', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useEmailStatusSse(vi.fn(), cb),
      { initialProps: { cb: first } },
    );

    const es = MockEventSource.instance!;
    rerender({ cb: second });

    expect(MockEventSource.instance).toBe(es);

    es.trigger({ event: 'message', id: 'msg-3', content: 'Teste', createdAt: new Date().toISOString() });

    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });
});
