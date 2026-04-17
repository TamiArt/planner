declare module 'fontkit' {
  export function create(buffer: Uint8Array | ArrayBuffer): unknown;
  export function registerFormat(...args: unknown[]): void;
  export const defaultLanguage: string;
  export function setDefaultLanguage(language: string): void;
}
