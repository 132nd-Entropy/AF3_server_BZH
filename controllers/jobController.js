const queueController = require('./queueController');

function createJob(req, res) {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content are required.' });
    }

    const filePath = `/home/entropy/AF3_server_BZH/job_data/${filename}.json`;

    // Validate filePath
    if (!filePath.endsWith('.json')) {
        return res.status(400).json({ error: 'File path must be a .json file.' });
    }

    const job = {
        id: generateUniqueId(),
        filename,
        content,
        status: 'queued',
        filePath, // Ensure this is added
    };

    // Save the JSON file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

    // Enqueue the job
    queueController.enqueueJob(job);

    res.json({ message: 'Job created and enqueued successfully.', jobId: job.id });
}

module.exports = {
    createJob,

};
