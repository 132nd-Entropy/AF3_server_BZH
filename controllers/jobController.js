// controllers/jobController.js
const queueController = require('./queueController');

function createJob(req, res) {
    const { filename, content } = req.body;
    if (!filename || !content) {
        return res.status(400).json({ error: 'Invalid job data.' });
    }
    const jobId = Date.now().toString();
    const job = {
        id: jobId,
        filename,
        content,
        status: 'queued',
    };
    queueController.enqueueJob(job);
    res.json({ message: 'Job queued successfully.', jobId });
}

module.exports = {
    createJob,
};
