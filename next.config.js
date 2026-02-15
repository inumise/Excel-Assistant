/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['exceljs', '@wppconnect-team/wppconnect'],
  allowedDevOrigins: ['127.0.0.1'],
}

module.exports = nextConfig
