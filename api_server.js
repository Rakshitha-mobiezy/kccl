
const express = require('express');
const crypto = require('crypto');
const LoginAutomation = require('./login-automation');


// Runs `worker` on each item, with at most `limit` running at the same time.
// Returns results in the same shape as Promise.allSettled.
async function runWithConcurrencyLimit(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;

    async function runner() {
        while (next < items.length) {
            const i = next++;
            try {
                results[i] = { status: 'fulfilled', value: await worker(items[i]) };
            } catch (err) {
                results[i] = { status: 'rejected', reason: err };
            }
        }
    }

    const runners = Array.from({ length: Math.min(limit, items.length) }, runner);
    await Promise.all(runners);
    return results;
}

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// TODO: replace this with your real endpoint. This is where the final result
// of EACH account's automation gets POSTed automatically once it finishes -
// you don't need to poll for it, it's pushed out on its own.
// ---------------------------------------------------------------------------
const RESULTS_API_URL = 'https://apibng.mobiezy.in/service2/update_automation_response';

// In-memory job store: jobId -> { status, results, startedAt, completedAt }
// NOTE: resets if the server restarts. Swap for Redis/a DB if you need this
// to survive a restart or to work across multiple server instances.
const jobs = new Map();

// Shapes a result down to exactly: id, username, password, stb, dueDate, success, message
function toApiResponse(result) {
    return {
        id: result.id,
        username: result.username,
        password: result.password,
        stb: result.stb,
        dueDate: result.dueDate || null,
        success: !!result.success,
        message: result.message || (result.success ? 'Successfully renewed the pack.' : 'Automation failed.'),
    };
}

// Runs ONE account's automation end-to-end, then POSTs its result to
// RESULTS_API_URL right away - it doesn't wait for the other accounts in the
// batch to finish first.
async function runOneAccountAndReport({ id, username, password, stb, headless = true }) {
    const automation = new LoginAutomation({
        username,
        password,
        stbNumber: stb,
        headless,
        label: username,
    });

    let rawResult;
    try {
        await automation.initialize();
        rawResult = await automation.run(3);
    } catch (err) {
        rawResult = { success: false, message: String(err.message).split('\n')[0], username, password, stb };
    } finally {
        await automation.close();
    }

    const payload = toApiResponse({ ...rawResult, id });

    try {
        await fetch(RESULTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        console.log(`[${id || username}] Result reported to results API.`);
    } catch (err) {
        console.error(`[${id || username}] Failed to POST result to results API: ${err.message}`);
    }

    return payload;
}

/**
 * POST /automate
 * body: {
 *   "accounts": [
 *     { "id": "req-123", "username": "user1", "password": "pass1", "stb": "STB0001" },
 *     { "id": "req-124", "username": "user2", "password": "pass2", "stb": "STB0002" }
 *   ],
 *   "concurrency": 5,     // optional, defaults to 5
 *   "headless": true      // optional, defaults to true
 * }
 *
 * NOTE the new "id" field on each account - this is whatever identifier you
 * want to correlate the eventual result back to on your end. It gets carried
 * through and included in the payload POSTed to RESULTS_API_URL once that
 * account's automation finishes.
 *
 * Responds IMMEDIATELY with a jobId - it does NOT wait for the browser
 * automation to finish. Use GET /status/:jobId if you also want to poll for
 * results yourself, in addition to the automatic push to RESULTS_API_URL.
 */
app.post('/automate', (req, res) => {
    const { accounts, concurrency = 5, headless = true } = req.body || {};

    if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({ error: 'accounts must be a non-empty array' });
    }

    const jobId = crypto.randomUUID();
    jobs.set(jobId, {
        status: 'pending',
        results: null,
        startedAt: new Date().toISOString(),
    });

    // ---- Respond right away. Everything below runs in the background ----
    // ---- and is NOT awaited before the response is sent.              ----
    res.status(202).json({
        success: true,
        message: 'Automation triggered successfully',
        jobId,
        accountCount: accounts.length,
        statusUrl: `/status/${jobId}`,
    });

    // Fire-and-forget: each account reports its own result to
    // RESULTS_API_URL as soon as IT finishes (via runOneAccountAndReport),
    // independent of the others. We still collect everything here too, so
    // GET /status/:jobId has something to show if you want it.
    runWithConcurrencyLimit(accounts, concurrency, (account) =>
        runOneAccountAndReport({ ...account, headless })
    )
        .then((results) => {
            const response = results.map((r, i) =>
                r.status === 'fulfilled'
                    ? r.value
                    : {
                          id: accounts[i].id,
                          username: accounts[i].username,
                          stb: accounts[i].stb,
                          success: false,
                          message: 'Automation failed unexpectedly - please retry.',
                          error: r.reason?.message || String(r.reason),
                      }
            );

            jobs.set(jobId, {
                status: 'completed',
                results: response,
                completedAt: new Date().toISOString(),
            });
        })
        .catch((err) => {
            console.error(`[${jobId}] Automation job failed: ${err.message}`);
            jobs.set(jobId, {
                status: 'failed',
                error: err.message,
                completedAt: new Date().toISOString(),
            });
        });
});

/**
 * GET /status/:jobId
 * Optional: poll this to check on a job triggered via POST /automate.
 * status is one of: "pending", "completed", "failed".
 */
app.get('/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ jobId: req.params.jobId, ...job });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Automation API listening on http://localhost:${PORT}`));