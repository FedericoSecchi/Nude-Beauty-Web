// Tipos mínimos para usar el harness desde los e2e en TypeScript (tests/e2e/checkout-local.spec.ts).
export const ORDER_URL: string;
export function bundle(rel: string, opts?: { snapshot?: boolean }): Promise<any>;
export function setSnapshot(snapshot: unknown): void;
export function resetBlobs(): void;
export function blobs(store: string): Map<string, any>;
export function putBlob(store: string, key: string, value: unknown): void;
export function fakeFetch(): any;
export function ctx(context?: string): { log: () => void; deploy: { context: string; id: string; published: boolean } };
export function webhookRequest(dataId: string, secret: string, requestId?: string): Request;
export function pedidoFixture(over?: Record<string, unknown>): any;
