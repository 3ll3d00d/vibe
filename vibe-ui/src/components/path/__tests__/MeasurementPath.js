import MeasurementPath from "../MeasurementPath";

const testData = [{
    name: "test_measurement_1",
    data: {
        fulfilled: true,
        value: {
            "test_device_1": {
                "test_analysis_1": {
                    "a": {
                        "freq": [1, 2, 3, 4, 5, 6],
                        "val": [1, 2, 3, 4, 5, 6]
                    }
                },
                "test_analysis_2": {
                    "a": {
                        "freq": [1, 2, 3, 4, 5, 6],
                        "val": [11, 12, 13, 14, 15, 16]
                    }
                }
            }
        }
    }
}];

test('has an external id', () => {
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', null);
    expect(path.getExternalId()).toBe('woot/boot/toot');
});

test('does not own reference for another measurement', () => {
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('testtest')).toBeFalsy();
});

test('does not own reference for another series', () => {
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('woot/boot/toot/d')).toBeFalsy();
});

test('does own reference', () => {
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.getExternalId()).toBe('woot/boot/toot');
    expect(path.ownsReference('woot/boot/toot/a')).toBeTruthy();
});

test('has selected series', () => {
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', 'a-b-c');
    expect(path.hasSelectedSeries()).toBeTruthy();
});

test('has no selected series', () => {
    // note that this (passing an unknown series to the 2nd _decode) is a hack
    const path = new MeasurementPath(null)._decode('woot', 'boot', 'toot', 'a-b-c')._decode('woot', 'boot', 'toot', 'd');
    expect(path.hasSelectedSeries()).toBeFalsy();
});

test('changing analyser when data is loaded, propagates data to the series', () => {
    let path = new MeasurementPath(null)._decode('test_measurement_1', 'test_device_1', 'test_analysis_1', 'a');
    path = path.acceptData(testData);
    expect(path.loaded).toBeTruthy();
    expect(path.data).not.toBeNull();
    expect(path.series.count()).toBe(1);
    expect(path.series.filter(s => s.rendered).count()).toBe(1);
    path = path._decode('test_measurement_1', 'test_device_1', 'test_analysis_2', 'a');
    expect(path.loaded).toBeTruthy();
    expect(path.data).not.toBeNull();
    expect(path.series.count()).toBe(1);
    expect(path.series.filter(s => s.rendered).count()).toBe(1);
});

