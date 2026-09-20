/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_API_KEY: string
  readonly VITE_CLOUDINARY_API_SECRET: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
  readonly VITE_BREVO_API_KEY: string
  readonly VITE_BREVO_SENDER_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
