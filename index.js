const { Redis } = require('@upstash/redis');
const crypto = require('crypto');
const secret = process.env.WEBHOOK_SECRET;
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const port = 3000

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Ensure express js is parsing the raw body through instead of applying it's own encoding
app.use(bodyParser.raw({ type: '*/*' }));

app.get('/', async (req, res) => {
    return res.status(200).json({ hello: 'world' })
})

// Example webhook handler
app.post('/webhook/elevenlabs', async (req, res) => {
    await redis.set('headers_webhook_eleven_labs', JSON.stringify(req.headers));
    const headers = req.headers['elevenlabs-signature'].split(',');
    const timestamp = headers.find((e) => e.startsWith('t=')).substring(2);
    const signature = headers.find((e) => e.startsWith('v0='));

    // Validate timestamp
    const reqTimestamp = timestamp * 1000;
    const tolerance = Date.now() - 30 * 60 * 1000;
    if (reqTimestamp < tolerance) {
        await redis.set('response_webhook_eleven_labs', 'Request expired');
        res.status(403).send('Request expired');
        return;
    } else {
        // Validate hash
        const message = `${timestamp}.${req.body}`;
        const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
        if (signature !== digest) {
            await redis.set('response_webhook_eleven_labs', 'Request unauthorized');
            res.status(401).send('Request unauthorized');
            return;
        }
    }

    const rawBody = req.body; // aqui é um Buffer
    const bodyString = rawBody.toString('utf8');

    await redis.set('response_webhook_eleven_labs', 'Success: ' + bodyString);
    
    fetch(process.env.N8N_WEBHOOK, {
        method: "POST",
        body: bodyString
    })
    res.status(200).send();
});

app.listen(port, () => {
    console.log(`Eleven labs listening on port ${port}`)
})  