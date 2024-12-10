const fs = require('fs');
const path = require('path');

// Specify the directory where JSON files will be stored
const jsonDirectory = path.join(__dirname, '../job_data');

// Ensure the directory exists
if (!fs.existsSync(jsonDirectory)) {
    fs.mkdirSync(jsonDirectory, { recursive: true }); // Create directory recursively if it doesn't exist
}

function generateJSONFile(filename, content) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(jsonDirectory, `${filename}.json`); // Use the defined directory
        fs.writeFile(filePath, JSON.stringify(content, null, 2), (err) => {
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
