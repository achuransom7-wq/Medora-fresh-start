const fs = require('fs');

function ensureWritableDirectory(directory, purpose) {
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    const guidance = process.env.RENDER
      ? 'Attach a Render Persistent Disk at /var/data and make this path live under that mount.'
      : 'Choose a directory the application process can read and write.';
    throw new Error(`${purpose} directory "${directory}" is not writable. ${guidance} Original error: ${error.message}`);
  }
}

module.exports = ensureWritableDirectory;