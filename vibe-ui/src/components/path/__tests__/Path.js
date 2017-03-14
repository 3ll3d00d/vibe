import Path from "../Path";

test('has an external id', () => {
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', null);
    expect(path.getExternalId()).toBe('woot/boot/toot');
});

test('does not own reference for another measurement', () => {
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('testtest')).toBeFalsy();
});

test('does not own reference for another series', () => {
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('woot/boot/toot/d')).toBeFalsy();
});

test('does own reference', () => {
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('woot/boot/toot/a')).toBeTruthy();
});

test('has selected series', () => {
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.hasSelectedSeries()).toBeTruthy();
});

test('has no selected series', () => {
    // note that this (passing an unknown series to the 2nd _decode) is a hack
    const path = new Path(1, null)._decode('woot', 'boot', 'toot', 'a-b-c')._decode('woot', 'boot', 'toot', 'd');
    expect(path.hasSelectedSeries()).toBeFalsy();
});