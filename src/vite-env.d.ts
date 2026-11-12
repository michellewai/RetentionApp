interface ImportMetaEnv {
  /** 'code' or 'supabase'. See src/config.ts. */
  readonly VITE_DATA_SOURCE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
