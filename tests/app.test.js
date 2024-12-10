const request = require('supertest');
const app = require('../app');

// Helper function to wait for logs dynamically
const waitForLogs = async (jobId, timeout = 30000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const res = await request(app).get(`/server-logs?jobId=${jobId}`);
        if (res.statusCode === 200 && res.text.includes('Final log for job')) {
            console.log(`Logs found for job ${jobId}`);
            return res;
        }
        console.log(`Waiting for logs for job ${jobId}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Logs not available within timeout');
};


describe('API Endpoints', () => {
    // Skipped GET / test temporarily
    it.skip('GET / should return a welcome message in test environment', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Welcome to the Job Queue Server!');
    });

    it('POST /create-json should enqueue a job and return jobId', async () => {
        const res = await request(app)
            .post('/create-json')
            .send({ filename: 'test.txt', content: 'This is a test job.' });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Job queued successfully.');
        expect(res.body).toHaveProperty('jobId');
    });

    it('GET /server-logs should return error if jobId is missing', async () => {
        const res = await request(app).get('/server-logs');
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Job ID is required');
    });

    it('GET /server-logs should return logs for a valid jobId', async () => {
        const jobResponse = await request(app)
            .post('/create-json')
            .send({ filename: 'test-log.txt', content: 'Log test' });
        const jobId = jobResponse.body.jobId;

        const res = await waitForLogs(jobId, 15000); // Wait for logs dynamically
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('Log entry for job');
        expect(res.text).toContain('Final log for job');
    }, 20000); // Extended timeout for this test
});

// Clean up after all tests
afterAll(() => {
    jest.clearAllTimers();
});
