// Same-origin requests work with the Vite proxy; deployments can override the API origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''
