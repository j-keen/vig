import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateRawSync } from 'node:zlib'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version
if (!version) {
  throw new Error('package.json is missing version')
}

const extDir = join(root, 'extension')
const buildDir = join(extDir, 'build')
const stagingName = `designpoke_v${version}`
const stagingDir = join(root, stagingName)
const zipPath = join(buildDir, 'designpoke.zip')

mkdirSync(buildDir, { recursive: true })
if (existsSync(zipPath)) rmSync(zipPath)

rmSync(stagingDir, { recursive: true, force: true })
cpSync(extDir, stagingDir, {
  recursive: true,
  filter: (src) => {
    const rel = relative(extDir, src)
    if (!rel) return true
    const top = rel.split(/[\\/]/)[0]
    return top !== 'build'
  },
})

const entries = []
collectFiles(stagingDir, stagingDir, entries)
const zip = buildZip(entries)
writeFileSync(zipPath, zip)
rmSync(stagingDir, { recursive: true, force: true })

console.log(`Wrote ${zipPath} (${entries.length} entries, ${zip.length} bytes)`)

function collectFiles(dir, base, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, base, out)
      continue
    }
    const zipName = `${stagingName}/${relative(base, full).split(sep).join('/')}`
    out.push(makeEntry(zipName, readFileSync(full), st.mtime))
  }
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { dosTime, dosDate }
}

function u16(n) {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(n)
  return buf
}

function u32(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(n >>> 0)
  return buf
}

function makeEntry(name, data, mtime) {
  const nameBuf = Buffer.from(name, 'utf8')
  const compressed = deflateRawSync(data)
  const { dosTime, dosDate } = dosDateTime(mtime)
  return { nameBuf, data, compressed, crc: crc32(data), dosTime, dosDate }
}

function buildZip(list) {
  const locals = []
  const centrals = []
  let offset = 0

  for (const entry of list) {
    const local = Buffer.concat([
      Buffer.from('PK\x03\x04'),
      u16(20),
      u16(0),
      u16(8),
      u16(entry.dosTime),
      u16(entry.dosDate),
      u32(entry.crc),
      u32(entry.compressed.length),
      u32(entry.data.length),
      u16(entry.nameBuf.length),
      u16(0),
      entry.nameBuf,
      entry.compressed,
    ])
    const central = Buffer.concat([
      Buffer.from('PK\x01\x02'),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(entry.dosTime),
      u16(entry.dosDate),
      u32(entry.crc),
      u32(entry.compressed.length),
      u32(entry.data.length),
      u16(entry.nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      entry.nameBuf,
    ])
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }

  const centralDir = Buffer.concat(centrals)
  const eocd = Buffer.concat([
    Buffer.from('PK\x05\x06'),
    u16(0),
    u16(0),
    u16(list.length),
    u16(list.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])
  return Buffer.concat([...locals, centralDir, eocd])
}
