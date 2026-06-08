const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pkg     = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
const version = pkg.version
const src     = path.join(__dirname, '..', 'release', 'win-unpacked')
const dst     = path.join(__dirname, '..', 'release', `Auto-Weekly-Report-Creator-${version}-win-x64.zip`)

if (!fs.existsSync(src)) {
  console.error('win-unpacked not found:', src)
  process.exit(1)
}

if (fs.existsSync(dst)) fs.rmSync(dst)

// Use .NET ZipFile — handles locked files better than PowerShell Compress-Archive
execSync(
  `powershell -Command "Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${src}', '${dst}')"`,
  { stdio: 'inherit' }
)

const mb = (fs.statSync(dst).size / 1024 / 1024).toFixed(1)
console.log(`\nPackaged: ${path.basename(dst)} (${mb} MB)`)
