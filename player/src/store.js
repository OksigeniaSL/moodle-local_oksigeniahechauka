// What the screen keeps between restarts: its key and the last manifest. In localStorage, which some kiosk browsers
// clear or refuse: every access is guarded, and the player keeps working from memory if it fails.

const PREFIX = 'hechauka.';
const memory = {};

function get(name) {
    try {
        const v = window.localStorage.getItem(PREFIX + name);
        if (v !== null) {
            return v;
        }
    } catch (e) {
        // Storage refused: memory only.
    }
    return Object.prototype.hasOwnProperty.call(memory, name) ? memory[name] : null;
}

function set(name, value) {
    memory[name] = value;
    try {
        if (value === null) {
            window.localStorage.removeItem(PREFIX + name);
        } else {
            window.localStorage.setItem(PREFIX + name, value);
        }
    } catch (e) {
        // Storage full or refused: memory only.
    }
}

export const store = {
    /** Whether what is written here survives a reload. */
    works: function () {
        try {
            window.localStorage.setItem(PREFIX + 'probe', '1');
            window.localStorage.removeItem(PREFIX + 'probe');
            return true;
        } catch (e) {
            return false;
        }
    },
    key: function () {
        return get('key');
    },
    setKey: function (key) {
        set('key', key);
        set('revoked', null);
    },
    forget: function () {
        set('key', null);
        set('manifest', null);
        set('revoked', '1');
    },
    /** Taken out in the panel: what keeps a copy of the key must not put it back. */
    revoked: function () {
        return get('revoked') === '1';
    },
    manifest: function () {
        const raw = get('manifest');
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    },
    setManifest: function (m) {
        set('manifest', JSON.stringify(m));
    },
};
