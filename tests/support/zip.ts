// Test-only: builds a ZIP archive with the given entries, stored uncompressed, so the tests can make
// Word and Excel files (which are ZIP archives) and look-alikes without a library or binary fixtures.
// Office opens such a file; the CRC is computed so other ZIP readers accept it too.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function zip(entries: Record<string, string | Buffer>): Buffer {
  const locals: Buffer[] = []
  const directory: Buffer[] = []
  let offset = 0
  for (const [name, content] of Object.entries(entries)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const nameBytes = Buffer.from(name)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    locals.push(local, nameBytes, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt32LE(offset, 42)
    directory.push(central, nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const directoryBytes = Buffer.concat(directory)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(entries).length, 8)
  end.writeUInt16LE(Object.keys(entries).length, 10)
  end.writeUInt32LE(directoryBytes.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directoryBytes, end])
}

/** The package's list of parts, naming the main one, which is how readers such as file-type tell Word from Excel. */
const contentTypes = (part: string, type: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="${part}" ContentType="${type}"/></Types>`

/** The entries of a minimal Word file (enough for the content checks, not a full document). */
export const docx = (extra: Record<string, string> = {}) =>
  zip({
    '[Content_Types].xml': contentTypes('/word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),
    '_rels/.rels': '<Relationships/>',
    'word/document.xml': '<w:document/>',
    ...extra,
  })

/** The entries of a minimal Excel file. */
export const xlsx = (extra: Record<string, string> = {}) =>
  zip({
    '[Content_Types].xml': contentTypes('/xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'),
    '_rels/.rels': '<Relationships/>',
    'xl/workbook.xml': '<workbook/>',
    ...extra,
  })

/** A minimal PDF: the signature both checks look for, plus the cross-reference table and end marker Payload's needs. */
export const pdf = () =>
  Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\nxref\n0 1\n0000000000 65535 f \ntrailer<<>>\nstartxref\n9\n%%EOF\n')
