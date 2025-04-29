declare module 'react-native-zip-archive' {
  export function zip(source: string, target: string): Promise<string>;
  export function unzip(source: string, target: string): Promise<string>;
  export function subscribe(callback: (event: { progress: number; filePath: string }) => void): { remove: () => void };
  export function isPasswordProtected(source: string): Promise<boolean>;
  export function unzipWithPassword(source: string, target: string, password: string): Promise<string>;
} 