/**
 * Test-only environment.
 *
 * The app reads its auth config at import time and refuses to start without a deployment
 * secret. Tests still need to import the app to exercise middleware and routes, so they
 * get a fixed, obviously fake secret here instead of requiring real credentials in CI.
 * It only ever lives in the test process.
 */
process.env.JWT_SECRET ??= "partyplay-test-only-secret-not-for-deployment";
