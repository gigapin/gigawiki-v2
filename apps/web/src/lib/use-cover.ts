import { useEffect, useRef, useState } from 'react'

import { uploadCoverImage, IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/images'

export function useCover(initial?: { id: string; url: string } | null, initialId?: string | null) {
  const [preview, setPreview] = useState(initial?.url ?? '')
  const [imageId, setImageId] = useState(initialId ?? initial?.id ?? null)
  const [error, setError] = useState('')
  const pendingFile = useRef<File | null>(null)
  const uploaded = useRef<{ file: File; id: string } | null>(null)
  const objectUrl = useRef('')
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )
  const choose = (file: File) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP or GIF image.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Images must be at most 10 MB.')
      return
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    pendingFile.current = file
    setPreview(objectUrl.current)
    setError('')
  }
  const remove = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = ''
    pendingFile.current = null
    setImageId(null)
    setPreview('')
    setError('')
  }
  const resolveImageId = async () => {
    const file = pendingFile.current
    if (!file) return imageId
    if (uploaded.current?.file === file) return uploaded.current.id
    const asset = await uploadCoverImage(file)
    uploaded.current = { file, id: asset.id }
    return asset.id
  }
  return { preview, error, choose, remove, resolveImageId }
}
