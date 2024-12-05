// controllers/jsonGenerator.js

const fs = require('fs').promises;
const path = require('path');

/**
 * Generate the JSON file for the job.
 * @param {String} filename - The name of the file.
 * @param {Object} content - The content to write.
 */
async function generateJSONFile(filename, content) {
    const jsonContent = JSON.stringify(content, null, 2);
    const outputDir = path.join(__dirname, '..', 'output');
    const filePath = path.join(outputDir, `${filename}.json`);

    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(filePath, jsonContent, 'utf-8');
    console.log(`JSON file created at ${filePath}`);
}

module.exports = {
    generateJSONFile,
};
