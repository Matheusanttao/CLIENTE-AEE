import { authHeaders } from '../lib/authToken'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'

interface CloudinarySignature {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
}

async function readErrorMessage(response: Response, fallback: string) {
  const raw = await response.text()
  try {
    const payload = JSON.parse(raw) as { message?: string; error?: { message?: string } }
    return payload.message || payload.error?.message || fallback
  } catch {
    if (raw.includes('FUNCTION_INVOCATION_FAILED')) {
      return 'Falha na API de upload (Vercel). Confira as variaveis CLOUDINARY_* e SUPABASE_SERVICE_ROLE_KEY no painel da Vercel e faca redeploy.'
    }
    return fallback
  }
}

export async function uploadToCloudinary(file: File) {
  const headers = await authHeaders()
  const signatureResponse = await fetch('/api/cloudinary/sign', { headers })
  if (!signatureResponse.ok) {
    const detail = await readErrorMessage(signatureResponse, 'Nao foi possivel assinar o upload')
    throw new Error(detail)
  }
  const signature = (await signatureResponse.json()) as CloudinarySignature

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signature.apiKey)
  formData.append('timestamp', String(signature.timestamp))
  formData.append('signature', signature.signature)
  formData.append('folder', signature.folder)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const detail = await readErrorMessage(response, 'Upload para Cloudinary falhou')
    throw new Error(detail)
  }
  const data = (await response.json()) as { secure_url: string }
  return optimizeCloudinaryUrl(data.secure_url)
}
