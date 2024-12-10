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

function processJob(job) {
    try {
        console.log(`Processing job: ${job.id} - ${job.filename}`);
        // Simulate job processing logic
        job.status = 'completed'; // Mark the job as completed
    } catch (error) {
        // Handle job processing errors
        console.error(`Failed to process job: ${job.id}. Error: ${error.message}`);
        job.status = 'failed'; // Mark the job as failed
        throw error; // Re-throw the error for logging or further handling
    }
}

module.exports = {
    createJob,
    processJob,
};
