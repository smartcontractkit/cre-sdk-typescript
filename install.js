import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import https from 'https'

const __dirname = import.meta.dirname;

// Lookup table for all platforms and binary distribution packages
const BINARY_DISTRIBUTION_PACKAGES = {
    'linux-x64': '@chainlink/cre-ts-linux-x64',
    'linux-arm64': '@chainlink/cre-ts-linux-arm',
    'darwin-x64': '@chainlink/cre-ts-darwin-x64',
    'darwin-arm64': '@chainlink/cre-ts-darwin-arm64',
    'win32-x64': '@chainlink/cre-ts-windows-x64',
}

// Adjust the version you want to install. You can also make this dynamic.
const BINARY_DISTRIBUTION_VERSION = '1.0.0'

// Windows binaries end with .exe so we need to special case them.
const binaryName = process.platform === 'win32' ? 'cre-build.exe' : 'cre-build'

// Determine package name for this platform
const platformSpecificPackageName =
  BINARY_DISTRIBUTION_PACKAGES[`${process.platform}-${process.arch}`]

// Compute the path we want to emit the fallback binary to
const fallbackBinaryPath = path.join(__dirname, binaryName)

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          const chunks = []
          response.on('data', (chunk) => chunks.push(chunk))
          response.on('end', () => {
            resolve(Buffer.concat(chunks))
          })
        } else if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          // Follow redirects
          makeRequest(response.headers.location).then(resolve, reject)
        } else {
          reject(
            new Error(
              `npm responded with status code ${response.statusCode} when downloading the package!`
            )
          )
        }
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

function extractFileFromTarball(tarballBuffer, filepath) {
  // Tar archives are organized in 512 byte blocks.
  // Blocks can either be header blocks or data blocks.
  // Header blocks contain file names of the archive in the first 100 bytes, terminated by a null byte.
  // The size of a file is contained in bytes 124-135 of a header block and in octal format.
  // The following blocks will be data blocks containing the file.
  let offset = 0
  while (offset < tarballBuffer.length) {
    const header = tarballBuffer.subarray(offset, offset + 512)
    offset += 512

    const fileName = header.toString('utf-8', 0, 100).replace(/\0.*/g, '')
    const fileSize = parseInt(header.toString('utf-8', 124, 136).replace(/\0.*/g, ''), 8)

    if (fileName === filepath) {
      return tarballBuffer.subarray(offset, offset + fileSize)
    }

    // Clamp offset to the uppoer multiple of 512
    offset = (offset + fileSize + 511) & ~511
  }
}

async function downloadBinaryFromNpm() {
  // Download the tarball of the right binary distribution package
  const tarballDownloadBuffer = await makeRequest(
    `https://registry.npmjs.org/${platformSpecificPackageName}/-/${platformSpecificPackageName}-${BINARY_DISTRIBUTION_VERSION}.tgz`
  )

  const tarballBuffer = zlib.unzipSync(tarballDownloadBuffer)

  // Extract binary from package and write to disk
  fs.writeFileSync(
    fallbackBinaryPath,
    extractFileFromTarball(tarballBuffer, `package/bin/${binaryName}`),
    { mode: 0o755 } // Make binary file executable
  )
}

function isPlatformSpecificPackageInstalled() {
  try {
    // Resolving will fail if the optionalDependency was not installed
    require.resolve(`${platformSpecificPackageName}/bin/${binaryName}`)
    return true
  } catch (e) {
    return false
  }
}

if (!platformSpecificPackageName) {
  throw new Error('Platform not supported!')
}

// Skip downloading the binary if it was already installed via optionalDependencies
if (!isPlatformSpecificPackageInstalled()) {
  console.log('Platform specific package not found. Will manually download binary.')
  downloadBinaryFromNpm()
} else {
  console.log(
    'Platform specific package already installed. Will fall back to manually downloading binary.'
  )
}
