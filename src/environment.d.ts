declare global {
  namespace NodeJS {
    interface ProcessEnv extends Dict<string>  {
      DEFAULT_OPENAI_MODEL?: string
      OPENAI_API_KEY?: string

      AT_BREAD_IDENTIFIER_OVERRIDE?: string
    }
  }
}

// Without this TypeScript complains:
// Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.ts(2669)
export {};