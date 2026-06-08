const fs   = require('fs')
const path = require('path')

const pkg     = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
const version = pkg.version
const name    = pkg.build.productName
const setup   = path.join(__dirname, '..', 'release', `${name} Setup.exe`)

if (!fs.existsSync(setup)) {
  console.error('Setup exe not found:', setup)
  process.exit(1)
}

const mb = (fs.statSync(setup).size / 1024 / 1024).toFixed(1)
console.log(`\nInstaller: ${path.basename(setup)} (${mb} MB)`)
console.log(`Path:      ${setup}`)
