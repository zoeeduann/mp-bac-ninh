// Re-export AWS SDK from pnpm's nested store path (transitive dep via @payloadcms/storage-s3).
module.exports = require('@aws-sdk/client-s3')
