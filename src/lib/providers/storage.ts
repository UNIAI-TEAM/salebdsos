export interface StorageProvider {
  putObject(key: string, body: Uint8Array | ArrayBuffer | Blob, contentType?: string): Promise<{ url: string; key: string }>;
  getObjectUrl(key: string): string;
  signGetUrl(key: string, ttlSeconds?: number): Promise<string>;
  signPutUrl(key: string, contentType: string, ttlSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
