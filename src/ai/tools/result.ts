/**
 * The one result shape every tool returns. The model (later) and any direct
 * caller (now) branch on `ok`; a failure carries a machine code plus a message
 * safe to show or reason about.
 */

export interface ToolFailure {
  ok: false;
  error: { code: string; message: string };
}

export type ToolResult<T> = { ok: true; data: T } | ToolFailure;

export const toolOk = <T>(data: T): ToolResult<T> => ({ ok: true, data });

export const toolFail = (code: string, message: string): ToolFailure => ({
  ok: false,
  error: { code, message },
});
