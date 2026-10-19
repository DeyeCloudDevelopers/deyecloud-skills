import { readdir, stat, readFile, mkdir, rm, copyFile } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import { deflateRawSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skillsDir = join(root, "skills");
// Version extracted from the first SKILL.md found; all skills share the same version.
// Auto-generate date-based version: vYYMMDD (e.g. v261015)
const now = new Date();
const yy = String(now.getFullYear()).slice(2);
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const dateVersion = `v${yy}${mm}${dd}`;
let skillPkgVersion = dateVersion;
const outFile = join(root, "public", "skills", `deye-open-mcp-skills-${skillPkgVersion}.zip`);
let outFileResolved = outFile;

async function walk(dir, base = dir) {
  const entries = [];
  for (const name of await readdir(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      entries.push(...(await walk(full, base)));
    } else {
      entries.push({ path: relative(base, full), full, stats: s });
    }
  }
  return entries;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeU16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function makeU32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

async function buildZip() {
  await rm(outFileResolved, { force: true });
  await mkdir(dirname(outFile), { recursive: true });

  // Parse version from each SKILL.md frontmatter, write back the auto date
  // version, and build VERSION.txt
  const versionLines = [];
  const skillDirs = await readdir(skillsDir);
  const { writeFile } = await import("node:fs/promises");
  for (const dirName of skillDirs) {
    if (dirName.startsWith(".")) continue;
    const skillMd = join(skillsDir, dirName, "SKILL.md");
    try {
      const statMd = await stat(skillMd);
      if (statMd.isFile()) {
        const text = await readFile(skillMd, "utf8");
        // Write back the date-based version so SKILL.md stays in sync
        const updated = text.replace(
          /^version:\s*.+$/m,
          `version: ${dateVersion}`
        );
        if (updated !== text) {
          await writeFile(skillMd, updated, "utf8");
        }
        versionLines.push(`${dirName}=${dateVersion}`);
      }
    } catch {}
  }
  // Re-resolve outFile now that we know the version
  outFileResolved = join(root, "public", "skills", `deye-open-mcp-skills-${skillPkgVersion}.zip`);
  const versionContent = Buffer.from(
    `DeyeCloud OpenAPI Skills — Version Manifest\n` +
    `Generated: ${new Date().toISOString()}\n` +
    `MCP Server: 1.0.0\n` +
    `\n` +
    versionLines.join("\n") + "\n",
    "utf8"
  );

  const files = await walk(skillsDir);
  files.push({ path: "VERSION.txt", full: null, stats: { size: versionContent.length }, _data: versionContent });
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const file of files) {
    const data = file._data || await readFile(file.full);
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const nameBuf = Buffer.from(file.path, "utf8");
    const useDeflate = compressed.length < data.length;
    const compData = useDeflate ? compressed : data;

    // Local file header (30 bytes + name)
    const localHeader = Buffer.concat([
      makeU32(0x04034b50),
      makeU16(20),              // version needed
      makeU16(0),               // flags
      makeU16(useDeflate ? 8 : 0),
      makeU16(0), makeU16(0),   // mod time, mod date
      makeU32(crc),
      makeU32(compData.length),
      makeU32(data.length),
      makeU16(nameBuf.length),
      makeU16(0),               // extra field length
    ]);

    const localEntry = Buffer.concat([localHeader, nameBuf, compData]);
    localChunks.push(localEntry);

    // Central directory record (46 bytes + name)
    const centralHeader = Buffer.concat([
      makeU32(0x02014b50),
      makeU16(20), makeU16(20), // version made/needed
      makeU16(0),               // flags
      makeU16(useDeflate ? 8 : 0),
      makeU16(0), makeU16(0),
      makeU32(crc),
      makeU32(compData.length),
      makeU32(data.length),
      makeU16(nameBuf.length),
      makeU16(0), makeU16(0),   // extra, comment len
      makeU16(0),               // disk number start
      makeU16(0),               // internal attrs
      makeU32(0),               // external attrs
      makeU32(offset),          // offset of local header
    ]);

    centralChunks.push(Buffer.concat([centralHeader, nameBuf]));

    offset += localEntry.length;
  }

  const centralBuf = Buffer.concat(centralChunks);
  const endRecord = Buffer.concat([
    makeU32(0x06054b50),
    makeU16(0), makeU16(0),
    makeU16(files.length), makeU16(files.length),
    makeU32(centralBuf.length),
    makeU32(offset),
    makeU16(0),               // comment length
  ]);

  await new Promise((resolve, reject) => {
    const stream = createWriteStream(outFileResolved);
    stream.on("error", reject);
    stream.on("finish", resolve);
    for (const c of localChunks) stream.write(c);
    stream.write(centralBuf);
    stream.write(endRecord);
    stream.end();
  });

  console.log(`Packed ${files.length} files -> public/skills/deye-open-mcp-skills-${skillPkgVersion}.zip`);

  // Also write a stable unversioned copy so that old versioned links and the
  // unversioned URL both resolve to the latest build.
  const stableFile = join(root, "public", "skills", "deye-open-mcp-skills.zip");
  await copyFile(outFileResolved, stableFile);
  console.log(`Copied stable -> public/skills/deye-open-mcp-skills.zip`);

  // Write a plain-text latest version file for skill self-check
  const latestVerFile = join(root, "public", "skills", "latest-version.txt");
  await writeFile(latestVerFile, skillPkgVersion, "utf8");
  console.log(`Wrote latest-version.txt -> ${skillPkgVersion}`);
}

buildZip().catch((e) => { console.error(e); process.exit(1); });
