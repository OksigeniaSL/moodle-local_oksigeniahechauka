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
    key: function () {
        return get('key');
    },
    setKey: function (key) {
        set('key', key);
    },
    forget: function () {
        set('key', null);
        set('manifest', null);
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
