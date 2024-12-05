// utils/fileUtils.js
const fs = require('fs');
const path = require('path');

exports.createDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

exports.writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`File ${path.basename(filePath)} created at ${filePath}`);
};
