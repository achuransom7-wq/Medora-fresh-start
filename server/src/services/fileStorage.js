const fs = require('fs');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const requiredR2Settings = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];
const configuredR2Settings = requiredR2Settings.filter((name) => process.env[name]);

if (configuredR2Settings.length && configuredR2Settings.length !== requiredR2Settings.length) {
  const missing = requiredR2Settings.filter((name) => !process.env[name]);
  throw new Error(`R2 storage configuration is incomplete. Set: ${missing.join(', ')}`);
}

const bucketName = process.env.R2_BUCKET_NAME;
const r2 = bucketName
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

if (process.env.NODE_ENV === 'production' && !r2) {
  throw new Error('Configure all R2_* variables before accepting production file uploads.');
}

const R2_REFERENCE_PREFIX = 'r2://';

function isRemoteStorageEnabled() {
  return Boolean(r2);
}

async function storeUpload(localPath, objectKey, contentType) {
  if (!r2) return localPath;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: fs.createReadStream(localPath),
      ContentType: contentType,
    })
  );
  return `${R2_REFERENCE_PREFIX}${objectKey}`;
}

async function readFile(reference) {
  if (!reference.startsWith(R2_REFERENCE_PREFIX)) {
    return fs.promises.readFile(reference);
  }

  if (!r2) throw new Error('An R2-backed attachment cannot be read until R2 is configured.');
  const key = reference.slice(R2_REFERENCE_PREFIX.length);
  const response = await r2.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  if (!response.Body) throw new Error(`R2 returned an empty body for attachment "${key}".`);

  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function deleteFile(reference) {
  if (reference.startsWith(R2_REFERENCE_PREFIX)) {
    if (!r2) throw new Error('An R2-backed attachment cannot be deleted until R2 is configured.');
    const key = reference.slice(R2_REFERENCE_PREFIX.length);
    await r2.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    return;
  }

  try {
    await fs.promises.unlink(reference);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function deleteFiles(references) {
  const results = await Promise.allSettled(references.map(deleteFile));
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      `Could not delete ${failures.length} of ${references.length} stored attachments.`
    );
  }
}

module.exports = { deleteFile, deleteFiles, isRemoteStorageEnabled, readFile, storeUpload };
