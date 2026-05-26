/// <reference types="vite/client" />

interface OpenDialogOptions {
  title: string;
  mode: "file" | "folder";
  filters?: Array<{ name: string; extensions: string[] }>;
}

interface Window {
  desktop: {
    getApiBase: () => Promise<string>;
    selectPath: (options: OpenDialogOptions) => Promise<string | null>;
  };
}
