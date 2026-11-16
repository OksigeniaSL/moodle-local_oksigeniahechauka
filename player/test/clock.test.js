// A television with its clock wrong: the player takes the server's time from the Date header of its answers, when the
// device is a minute or more off, and keeps the device's otherwise.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {realClock, skewOf, SKEW_MIN_MS} from '../src/clock.js';
import {makeApi} from '../src/api.js';

const MIN = 60000;

test('the difference is the Date header against the middle of the request, from a minute on', () => {
    // A television 39 minutes behind: it sent at its 11:00:00 and heard at 11:00:00.4; the server said 11:39:00.
    const sent = Date.UTC(2026, 10, 16, 11, 0, 0);
    const server = Date.UTC(2026, 10, 16, 11, 39, 0);
    const skew = skewOf(server, sent, sent + 400);
    assert.ok(Math.abs(skew - 39 * MIN) < 1000, String(skew));
    // Half a minute off is taken as right: whole seconds in the header, and the network takes its time.
    assert.equal(skewOf(sent + 30000, sent, sent + 400), 0);
    assert.equal(skewOf(sent - SKEW_MIN_MS + 2000, sent, sent + 400), 0);
    // A clock ahead, too.
    assert.ok(skewOf(sent - 60 * MIN, sent, sent + 400) < -59 * MIN);
});

test('an answer that says nothing changes nothing', () => {
    const sent = Date.now();
    assert.equal(skewOf(NaN, sent, sent + 100), null);
    assert.equal(skewOf(0, sent, sent + 100), null);
    assert.equal(skewOf(sent + 40 * MIN, sent, sent - 1), null);
    // An answer that took more than ten seconds says little about when it was sent.
    assert.equal(skewOf(sent + 40 * MIN, sent, sent + 11000), null);
});

test('the real clock moves by what the server said, and back when the television is put right', () => {
    const clock = realClock();
    assert.equal(clock.skew(), 0);
    const sent = Date.now();
    clock.heard(sent + 39 * MIN, sent, sent + 200);
    assert.ok(Math.abs(clock.skew() - 39 * MIN) < 1000);
    assert.ok(Math.abs(clock.date().getTime() - (Date.now() + 39 * MIN)) < 2000);
    assert.ok(Math.abs(clock.now() - (Date.now() + 39 * MIN)) < 2000);
    const wall = clock.wall();
    assert.equal(typeof wall.min, 'number');
    // Someone sets the television's clock: the next answer is within the minute.
    const later = Date.now();
    clock.heard(later + 2000, later, later + 200);
    assert.equal(clock.skew(), 0);
});

test('every answer of the server tells its time, with when the request left and came back', async () => {
    const said = 'Mon, 16 Nov 2026 11:39:00 GMT';
    const original = globalThis.fetch;
    globalThis.fetch = async function () {
        return {ok: true, status: 200, headers: {get: (h) => (h === 'Date' ? said : null)}, json: async () => ({})};
    };
    try {
        const heard = [];
        const api = makeApi({heartbeat: '/beat', manifest: '/m'}, () => 'key', false, function (server, sent, received) {
            heard.push([server, sent, received]);
        });
        await api.heartbeat({});
        await api.manifest(null);
        assert.equal(heard.length, 2);
        assert.equal(heard[0][0], Date.parse(said));
        assert.ok(heard[0][2] >= heard[0][1]);
        // Without someone to tell, as in the panel's preview, nothing breaks.
        await makeApi({heartbeat: '/beat'}, () => null, true).heartbeat({});
    } finally {
        globalThis.fetch = original;
    }
});
