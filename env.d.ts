/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GCS_BUCKET_NAME?: string;
  readonly VITE_GCS_INVENTORY_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


