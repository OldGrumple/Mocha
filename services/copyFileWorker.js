// copyFileWorker.js
const fs = require('fs');
const path = require('path');

const [source, destination] = process.argv.slice(2);

fs.copyFile(source, destination, (err) => {
  if (err) {
    console.error('Copy failed:', err);
    process.exit(1);
  }
  console.log('Copy successful');
  process.exit(0);
});
