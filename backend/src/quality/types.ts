export type GateResult = {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
};

export function gatePassed(name: string, message: string, durationMs: number): GateResult {
  return { name, passed: true, message, durationMs };
}

export function gateFailed(name: string, message: string, durationMs: number): GateResult {
  return { name, passed: false, message, durationMs };
}
