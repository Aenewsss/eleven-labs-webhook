const crypto = require('crypto');
const secret = process.env.WEBHOOK_SECRET;
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const port = 3000

// Ensure express js is parsing the raw body through instead of applying it's own encoding
app.use(bodyParser.raw({ type: '*/*' }));

// Example webhook handler
app.post('/webhook/elevenlabs', async (req, res) => {
    const headers = req.headers['ElevenLabs-Signature'].split(',');
    const timestamp = headers.find((e) => e.startsWith('t=')).substring(2);
    const signature = headers.find((e) => e.startsWith('v0='));

    // Validate timestamp
    const reqTimestamp = timestamp * 1000;
    const tolerance = Date.now() - 30 * 60 * 1000;
    if (reqTimestamp < tolerance) {
        res.status(403).send('Request expired');
        return;
    } else {
        // Validate hash
        const message = `${timestamp}.${req.body}`;
        const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
        if (signature !== digest) {
            res.status(401).send('Request unauthorized');
            return;
        }
    }

    const rawBody = req.body; // aqui é um Buffer
    const bodyString = rawBody.toString('utf8');
    
    fetch(process.env.N8N_WEBHOOK, {
        method: "POST",
        body: bodyString
    })

    res.status(200).send();
});

app.listen(port, () => {
    console.log(`Eleven labs listening on port ${port}`)
})  