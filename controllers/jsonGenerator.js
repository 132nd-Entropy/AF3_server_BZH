// controllers/jsonGenerator.js

const fs = require('fs');
const path = require('path');

function generateJSONFile(filename, content) {
    return new Promise((resolve, reject) => {
        const filePath = path.join('/path/to/input', `${filename}.json`); // Adjust the path as needed
        fs.writeFile(filePath, JSON.stringify(content), (err) => {
            if (err) {
                return reject(err);
            }
            resolve(filePath); // Return the file path upon success
        });
    });
}

module.exports = {
    generateJSONFile,
};
