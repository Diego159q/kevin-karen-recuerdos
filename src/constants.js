export const moments = ['Preparativos', 'Ceremonia', 'Cena', 'Fiesta', 'Baile', 'Otro']
export const coupleName = 'Kevin & Karen'
export const weddingDate = '08.08.2026'
export const privateCode = 'kevinkaren2026'
export const invitationUrl = 'https://kevin-karen-boda.netlify.app/'
const rawDeployedUrl = import.meta.env.VITE_DEPLOYED_URL || ''
const deployedUrl = rawDeployedUrl.replace(/^https?:\/\//, '')
export const memoryDomain = deployedUrl || window.location.host
export const publicMemoryUrl = deployedUrl ? `https://${deployedUrl}` : window.location.origin
export const maxFilesPerUpload = 20
export const maxPhotoSize = 10 * 1024 * 1024
export const maxVideoSize = 100 * 1024 * 1024
export const maxImageDimension = 2200

export const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(publicMemoryUrl)}`

export const seedMemories = [
  {
    id: 'seed-1',
    guestName: 'Laura Gomez',
    table: 'Mesa 4',
    relation: 'Familia de Karen',
    moment: 'Ceremonia',
    uploadedAt: '2026-08-08T10:42:00',
    fileName: 'entrada-ceremonia.jpg',
    type: 'image',
    accent: 'champagne',
    approved: true,
  },
  {
    id: 'seed-2',
    guestName: 'Mateo Ruiz',
    table: 'Familia',
    relation: 'Amigos de Kevin',
    moment: 'Fiesta',
    uploadedAt: '2026-08-08T18:18:00',
    fileName: 'brindis.mp4',
    type: 'video',
    accent: 'olive',
    approved: true,
  },
  {
    id: 'seed-3',
    guestName: 'Sofia Marin',
    table: 'Mesa 2',
    relation: 'Amigos de la pareja',
    moment: 'Baile',
    uploadedAt: '2026-08-08T20:07:00',
    fileName: 'primer-baile.jpg',
    type: 'image',
    accent: 'rose',
    approved: false,
  },
]
