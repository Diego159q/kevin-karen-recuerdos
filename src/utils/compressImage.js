import { maxPhotoSize, maxImageDimension } from '../constants'

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen para comprimirla.'))
    }
    image.src = url
  })
}

export async function compressImage(file) {
  const compressibleTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!compressibleTypes.includes(file.type) || file.size <= maxPhotoSize) return file

  const image = await loadImage(file)
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob || blob.size >= file.size) return file

  const compressedName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], compressedName, { type: 'image/jpeg', lastModified: Date.now() })
}

export async function createThumbnail(file) {
  const image = await loadImage(file)
  const maxSide = 600
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75))
  if (!blob) throw new Error('No se pudo generar la miniatura.')

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}-thumb.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}
