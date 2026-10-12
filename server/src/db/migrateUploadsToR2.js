const path = require('path');
require('dotenv').config();

async function migrateUploads() {
  const db = require('./index');
  const fileStorage = require('../services/fileStorage');

  if (!fileStorage.isRemoteStorageEnabled()) {
    throw new Error('Configure all R2_* variables before migrating existing uploads.');
  }

  try {
    await db.initialize();
    const attachments = await db.prepare('SELECT id, file_path, mime_type FROM attachments ORDER BY id').all();
    let migrated = 0;
    let alreadyRemote = 0;

    for (const attachment of attachments) {
      if (attachment.file_path.startsWith('r2://')) {
        alreadyRemote++;
        continue;
      }

      const objectKey = `uploads/${attachment.id}${path.extname(attachment.file_path).slice(0, 10)}`;
      const fileReference = await fileStorage.storeUpload(attachment.file_path, objectKey, attachment.mime_type);
      if (!fileReference.startsWith('r2://')) {
        throw new Error(`Attachment ${attachment.id} was not stored in R2.`);
      }

      await db.prepare('UPDATE attachments SET file_path = ? WHERE id = ?').run(fileReference, attachment.id);
      migrated++;
      console.log(`[migration] copied attachment ${attachment.id} to R2`);
    }

    console.log(`[migration] moved ${migrated} attachments to R2; ${alreadyRemote} were already there`);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  migrateUploads().catch((error) => {
    console.error('[migration] attachment upload copy failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { migrateUploads };
