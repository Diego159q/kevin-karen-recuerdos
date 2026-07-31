import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makeRingPng(size, bg, ring) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const outer = size * 0.46
  const inner = size * 0.27
  const gemRadius = size * 0.085

  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      let color = bg
      if (dist >= inner && dist <= outer) color = ring
      if (dist <= gemRadius) color = ring
      const offset = y * (1 + size * 3) + 1 + x * 3
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(process.cwd(), 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const olive = [63, 74, 56]
const gold = [185, 154, 95]

writeFileSync(join(outDir, 'icon-192.png'), makeRingPng(192, olive, gold))
writeFileSync(join(outDir, 'icon-512.png'), makeRingPng(512, olive, gold))

console.log('Iconos regenerados en ' + outDir)
