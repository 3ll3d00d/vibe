import {createStore} from "../PathStore";
import {NO_OPTION_SELECTED} from "../../../constants.js";

const measurementMeta = [
    {
        id: 'test_measurement_1',
        devices: ['test_device_1'],
        analysis: {
            test_analysis_1: ['a', 'b', 'c'],
            test_analysis_2: ['1', '2', '3']
        }
    },
    {
        id: 'test_measurement_2',
        devices: ['test_device_2'],
        analysis: {
            test_analysis_1: ['a', 'b', 'c'],
            test_analysis_2: ['1', '2', '3']
        }
    }
];

const testData = [
    {
        name: "test_measurement_1",
        data: {
            fulfilled: true,
            value: {
                "test_device_1": {
                    "test_analysis_1": {
                        "a": {
                            "freq": [1, 2, 3, 4, 5, 6],
                            "val": [1, 2, 3, 4, 5, 6]
                        },
                        "b": {
                            "freq": [1, 2, 3, 4, 5, 6],
                            "val": [11, 12, 13, 14, 15, 16]
                        },
                        "c": {
                            "freq": [1, 2, 3, 4, 5, 6],
                            "val": [21, 22, 23, 24, 25, 26]
                        }
                    }
                }
            }
        }
    },
    {
        name: "test_measurement_2",
        data: {
            fulfilled: false
        }
    }
];

function getCountProvider() {
    let counter = 1;
    return () => counter++;
}

/**
 * Creates a new store.
 * @param hasMetaLoaded if true, store the measurement meta on load.
 */
let initialiseStore = function (hasMetaLoaded) {
    let store = createStore(getCountProvider());
    expect(store).toBeDefined();
    if (hasMetaLoaded) {
        store = store.storeMeta(measurementMeta);
        expect(store).toBeDefined();
    }
    expect(store.getPathCount()).toBe(0);
    return store;
};

/**
 * Verifies the basic data in this path.
 * @param path the path to verify.
 * @param pathId the path id
 * @param params the navigation parameters.
 * @param measurementMeta the measurement metadata.
 * @param encodedPath the expected encoded path.
 */
let verifyPath = function (path, pathId, params, measurementMeta, encodedPath) {
    expect(path).toBeDefined();
    expect(path.id).toBe(pathId);
    const {measurementId, deviceId, analyserId, series} = params;
    if (measurementId) {
        expect(path.measurementId).toBe(measurementId);
    } else {
        expect(path.measurementId).toBeNull();
    }
    if (deviceId) {
        expect(path.deviceId).toBe(deviceId);
    } else {
        expect(path.deviceId).toBeNull();
    }
    if (analyserId && analyserId !== NO_OPTION_SELECTED) {
        expect(path.analyserId).toBe(analyserId);
    } else {
        expect(path.analyserId).toBeNull();
    }
    expect(path.series).toBeDefined();
    const visibleSeries = path.series.filter(s => s.visible);
    if (series && series !== NO_OPTION_SELECTED) {
        const expectedSeries = series.split('-');
        const visibleSeriesNames = visibleSeries.map(s => s.seriesName);
        expect(visibleSeries.count()).toBe(expectedSeries.length);
        expectedSeries.forEach(s => expect(visibleSeriesNames).toContain(s));
    } else {
        expect(visibleSeries.count()).toBe(0);
    }
    if (measurementMeta) {
        expect(path.measurementMeta).toBe(measurementMeta);
    } else {
        expect(path.measurementMeta).toBeNull();
    }
    expect(path.encode()).toBe(encodedPath);
    if (measurementId && deviceId && analyserId && analyserId !== NO_OPTION_SELECTED) {
        expect(path.getExternalId()).toBe(`${measurementId}/${deviceId}/${analyserId}`);
    }
};

test('a new store is empty', () => {
    const store = createStore(getCountProvider());
    expect(store).toBeDefined();
    expect(store.getPathCount()).toBe(0);
});

describe('a path can be loaded from a URL', () => {
    test('with a measurementid', () => {
        const store = initialiseStore(false);
        const nav1 = {measurementId: 'test_measurement_1'};
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1');
    });
    test('with measurement and device ids', () => {
        const store = initialiseStore(false);
        const nav1 = {measurementId: 'test_measurement_1', deviceId: 'test_device_1'};
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/none/none');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/none/none');
    });
    test('with measurement, device and analyser ids', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analyser_1'
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analyser_1/none');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analyser_1/none');
    });
    test('with all IDs set', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analyser_1',
            series: 'a-b'
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analyser_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analyser_1/a-b');
    });
});
describe('multiple paths can be loaded from a URL', () => {
    test('2 paths', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analyser_1',
            series: 'a-b',
            splat: 'test_measurement_2/test_device_2/test_analyser_2/1-2-3'
        };
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2',
            analyserId: 'test_analyser_2',
            series: '1-2-3',
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(2);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analyser_1/a-b');
        verifyPath(store.getPathAtIdx(1), 2, nav2, null, '/test_measurement_2/test_device_2/test_analyser_2/1-2-3');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analyser_1/a-b/test_measurement_2/test_device_2/test_analyser_2/1-2-3');
    });
    test('3 paths', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analyser_1',
            series: 'a-b',
            splat: 'test_measurement_2/test_device_2/test_analyser_2/1-2-3/test_measurement_3/test_device_3/test_analyser_3/c-d-e'
        };
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2',
            analyserId: 'test_analyser_2',
            series: '1-2-3',
        };
        const nav3 = {
            measurementId: 'test_measurement_3',
            deviceId: 'test_device_3',
            analyserId: 'test_analyser_3',
            series: 'c-d-e',
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(3);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analyser_1/a-b');
        verifyPath(store.getPathAtIdx(1), 2, nav2, null, '/test_measurement_2/test_device_2/test_analyser_2/1-2-3');
        verifyPath(store.getPathAtIdx(2), 3, nav3, null, '/test_measurement_3/test_device_3/test_analyser_3/c-d-e');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analyser_1/a-b/test_measurement_2/test_device_2/test_analyser_2/1-2-3/test_measurement_3/test_device_3/test_analyser_3/c-d-e');
    });
    test('incomplete last path', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analyser_1',
            series: 'a-b',
            splat: 'test_measurement_2/test_device_2'
        };
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2'
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(2);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analyser_1/a-b');
        verifyPath(store.getPathAtIdx(1), 2, nav2, null, '/test_measurement_2/test_device_2/none/none');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analyser_1/a-b/test_measurement_2/test_device_2/none/none');
    });
    test('incomplete first path', () => {
        const store = initialiseStore(false);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'none',
            series: 'none',
            splat: 'test_measurement_2/test_device_2/test_analysis_2/1-2'
        };
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2',
            analyserId: 'test_analysis_2',
            series: '1-2',
        };
        store.fromRouterPath(nav1);
        expect(store.getPathCount()).toBe(2);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/none/none');
        verifyPath(store.getPathAtIdx(1), 2, nav2, null, '/test_measurement_2/test_device_2/test_analysis_2/1-2');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/none/none/test_measurement_2/test_device_2/test_analysis_2/1-2');
    });
});

describe('paths can navigate', () => {
    test('a path can navigate to a series', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        expect(store).toBeDefined();
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        verifyPath(store.getPathAtIdx(0), 1, {}, measurementMeta, "");
        expect(store.toRouterPath()).toBe('/analyse');

        const nav1 = {measurementId: 'test_measurement_1'};
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1');

        const nav2 = {measurementId: 'test_measurement_1', deviceId: 'test_device_1'};
        store.navigate(1, nav2);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav2, measurementMeta, '/test_measurement_1/test_device_1/none/none');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/none/none');

        const nav3 = {measurementId: 'test_measurement_1', deviceId: 'test_device_1', analyserId: 'test_analysis_1'};
        store.navigate(1, nav3);
        expect(store.getPathCount()).toBe(1);
        const nav3WithSeries = Object.assign(nav3, {series: 'a-b-c'});
        verifyPath(store.getPathAtIdx(0), 1, nav3WithSeries, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b-c');

        const nav4 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav4);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav4, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');
    });

    test('the path is reset when the measurement id changes', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');

        const nav2 = {measurementId: 'test_measurement_2'};
        store.navigate(1, nav2);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav2, measurementMeta, '/test_measurement_2');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_2');
    });

    test('the path is reset when the device id changes', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');

        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2'
        };
        store.navigate(1, nav2);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav2, measurementMeta, '/test_measurement_2/test_device_2/none/none');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_2/test_device_2/none/none');
    });

    test('path navigation is independent of other paths', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');

        store = store.addPath();
        const nav2 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'c'
        };
        store.navigate(2, nav2);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        verifyPath(store.getPathAtIdx(1), 2, nav2, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b/test_measurement_1/test_device_1/test_analysis_1/c');

    });

    test('early paths can be incomplete', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2'
        };
        store.navigate(1, nav1);
        store = store.addPath();
        const nav2 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'c'
        };
        store.navigate(2, nav2);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_2/test_device_2/none/none');
        verifyPath(store.getPathAtIdx(1), 2, nav2, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_2/test_device_2/none/none/test_measurement_1/test_device_1/test_analysis_1/c');
    });
});

describe('paths can be added and removed', () => {
    test('add 1 path then remove it', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');

        store.removePath(1);
        expect(store.getPathCount()).toBe(0);
        expect(store.toRouterPath()).toBe('/analyse');
    });

    test('add 2 path, remove first, add another', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b'
        };
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');

        const nav2 = {measurementId: 'test_measurement_2'};
        store.addPath();
        store.navigate(2, nav2);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
        verifyPath(store.getPathAtIdx(1), 2, nav2, measurementMeta, '/test_measurement_2');

        store.removePath(1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 2, nav2, measurementMeta, '/test_measurement_2');

        store = store.addPath();
        store.navigate(3, nav1);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 2, nav2, measurementMeta, '/test_measurement_2');
        verifyPath(store.getPathAtIdx(1), 3, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
    });
});

describe('measurementMeta is loaded into the store', () => {
    test('when a path is created after the meta is loaded, the path is meta aware', () => {
        let store = initialiseStore(true);
        store = store.addPath();
        expect(store).toBeDefined();
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        const path = store.getPathAtIdx(0);
        expect(path).toBeDefined();
        verifyPath(path, 1, {}, measurementMeta, "");
        expect(store.toRouterPath()).toBe('/analyse');
    });
    test('an existing path becomes meta aware', () => {
        let store = initialiseStore(false);
        store = store.addPath();
        expect(store).toBeDefined();
        expect(store.getPathCount()).toBe(1);
        expect(store.anyPathIsComplete()).toBeFalsy();
        const path = store.getPathAtIdx(0);
        verifyPath(path, 1, {}, null, "");
        store = store.storeMeta(measurementMeta);
        expect(store).toBeDefined();
        verifyPath(path, 1, {}, null, "");
        verifyPath(store.getPathAtIdx(0), 1, {}, measurementMeta, "");
        expect(store.toRouterPath()).toBe('/analyse');
    });
    describe('measurement metadata populates series after load', () => {
        test('when series has not been selected', () => {
            let store = initialiseStore(false);
            const nav1 = {
                measurementId: 'test_measurement_1',
                deviceId: 'test_device_1',
                analyserId: 'test_analysis_1'
            };
            store = store.addPath();
            store.navigate(1, nav1);
            expect(store.getPathCount()).toBe(1);
            verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analysis_1/none');
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/none');

            const nav2 = {
                measurementId: 'test_measurement_2',
                deviceId: 'test_device_2',
                analyserId: 'test_analysis_2'
            };
            store = store.addPath();
            store.navigate(2, nav2);
            expect(store.getPathCount()).toBe(2);
            verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analysis_1/none');
            verifyPath(store.getPathAtIdx(1), 2, nav2, null, '/test_measurement_2/test_device_2/test_analysis_2/none');
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/none/test_measurement_2/test_device_2/test_analysis_2/none');

            store = store.storeMeta(measurementMeta);
            const path1WithMeta = store.getPathAtIdx(0);
            verifyPath(path1WithMeta, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/none');
            const expectedSeries1 = measurementMeta[0].analysis.test_analysis_1;
            expect(path1WithMeta.series.count()).toBe(expectedSeries1.length);
            expectedSeries1.forEach(s => {
                const pathSeries = path1WithMeta.series.find(ps => ps.seriesName === s);
                expect(pathSeries).toBeDefined();
                expect(pathSeries.seriesName).toBe(s);
                expect(pathSeries.visible).toBe(false);
            });
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/none/test_measurement_2/test_device_2/test_analysis_2/none');

            const path2WithMeta = store.getPathAtIdx(1);
            verifyPath(path2WithMeta, 2, nav2, measurementMeta, '/test_measurement_2/test_device_2/test_analysis_2/none');
            const expectedSeries2 = measurementMeta[0].analysis.test_analysis_2;
            expect(path2WithMeta.series.count()).toBe(expectedSeries2.length);
            expectedSeries2.forEach(s => {
                const pathSeries = path2WithMeta.series.find(ps => ps.seriesName === s);
                expect(pathSeries).toBeDefined();
                expect(pathSeries.seriesName).toBe(s);
                expect(pathSeries.visible).toBe(false);
            });
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/none/test_measurement_2/test_device_2/test_analysis_2/none');
        });
        test('when a series has been selected', () => {
            let store = initialiseStore(false);
            const nav1 = {
                measurementId: 'test_measurement_1',
                deviceId: 'test_device_1',
                analyserId: 'test_analysis_1',
                series: 'a-b'
            };
            store = store.addPath();
            store.navigate(1, nav1);
            expect(store.getPathCount()).toBe(1);
            verifyPath(store.getPathAtIdx(0), 1, nav1, null, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');

            store = store.storeMeta(measurementMeta);
            const path1WithMeta = store.getPathAtIdx(0);
            verifyPath(path1WithMeta, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b');
            const expectedSeries1 = measurementMeta[0].analysis.test_analysis_1;
            const visibleSeries = nav1.series.split('-');
            expect(path1WithMeta.series.count()).toBe(expectedSeries1.length);
            expectedSeries1.forEach(s => {
                const pathSeries = path1WithMeta.series.find(ps => ps.seriesName === s);
                expect(pathSeries).toBeDefined();
                expect(pathSeries.seriesName).toBe(s);
                expect(pathSeries.visible).toBe(visibleSeries.includes(s));
            });
            expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b');
        });
    });
});

describe('measurement data is loaded into paths', () => {
    test('a single path accepts data for all series', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a');

        const toLoad = store.load(1, testData);
        expect(toLoad).toHaveLength(0);
        expect(store.getPathCount()).toBe(1);
        expect(store.allPathsAreComplete()).toBeTruthy();
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.data.fulfilled).toBeTruthy();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);
    });

    test('loading data yields measurement ids without data', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a');
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2',
            analyserId: 'test_analysis_2',
            series: '1'
        };
        store = store.addPath();
        store.navigate(2, nav2);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        verifyPath(store.getPathAtIdx(1), 2, nav2, measurementMeta, '/test_measurement_2/test_device_2/test_analysis_2/1');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a/test_measurement_2/test_device_2/test_analysis_2/1');

        const toLoad = store.load(1, testData);
        expect(toLoad).toHaveLength(1);
        expect(toLoad[0]).toBe('test_measurement_2');
        expect(store.allPathsAreComplete()).toBeFalsy();
        expect(store.anyPathIsComplete()).toBeTruthy();
    });

    test('data can be loaded en masse', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a');
        const nav2 = {
            measurementId: 'test_measurement_2',
            deviceId: 'test_device_2',
            analyserId: 'test_analysis_2',
            series: '1'
        };
        store = store.addPath();
        store.navigate(2, nav2);
        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        verifyPath(store.getPathAtIdx(1), 2, nav2, measurementMeta, '/test_measurement_2/test_device_2/test_analysis_2/1');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a/test_measurement_2/test_device_2/test_analysis_2/1');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(2);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);
        const pathWithoutData = store.getPathAtIdx(1);
        verifyPath(pathWithoutData, 2, nav2, measurementMeta, '/test_measurement_2/test_device_2/test_analysis_2/1');
        expect(pathWithoutData.data).not.toBeNull();
        expect(pathWithoutData.loaded).toBeTruthy();
        expect(pathWithoutData.series.count()).toBe(3);
        expect(pathWithoutData.series.filter(s => s.rendered).count()).toBe(0);
    });
});

describe('paths are rendered to a chart friendly format', () => {
    test('data must be loaded', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b-c'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b-c');

        const {chartData, range} = store.asChartData();
        expect(chartData).toBeNull();
        expect(range).toBeNull();
    });

    test('multiple paths can be rendered when they have data', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b-c'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b-c');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(1);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);

        const {chartData, range} = store.asChartData();
        expect(chartData).not.toBeNull();
        expect(chartData).toHaveLength(3);
        expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(3);
        const seriesInData = chartData.map(d => d.series);
        ['a','b','c'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
        expect(range).not.toBeNull();
        expect(range.minX).toBe(1);
        expect(range.minY).toBe(1);
        expect(range.maxX).toBe(6);
        expect(range.maxY).toBe(26);
    });

    test('invisible paths are not rendered', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'b-c'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/b-c');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(1);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/b-c');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);

        const {chartData, range} = store.asChartData();
        expect(chartData).not.toBeNull();
        expect(chartData).toHaveLength(2);
        expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(2);
        const seriesInData = chartData.map(d => d.series);
        ['b','c'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
        expect(range).not.toBeNull();
        expect(range.minX).toBe(1);
        expect(range.minY).toBe(11);
        expect(range.maxX).toBe(6);
        expect(range.maxY).toBe(26);
    });

    test('unloaded paths are not rendered but can be reloaded', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'b-c'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/b-c');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(1);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/b-c');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);

        store.unloadPath(1);
        {
            const {chartData, range} = store.asChartData();
            expect(chartData).toBeNull();
            expect(range).toBeNull();
        }

        const toLoad = store.load(1, testData);
        {
            expect(toLoad).toHaveLength(0);
            expect(store.getPathCount()).toBe(1);
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(2);
            expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(2);
            const seriesInData = chartData.map(d => d.series);
            ['b','c'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(11);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBe(26);
        }
    });
});

describe('paths can be normalised against a reference series', () => {
    test('normalises', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a-b-c'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a-b-c');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(1);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a-b-c');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);
        {
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(3);
            expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(3);
            const seriesInData = chartData.map(d => d.series);
            ['a','b','c'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(1);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBe(26);
        }

        store.setReferenceSeriesId('test_measurement_1/test_device_1/test_analysis_1/a');
        {
            expect(store.getReferenceSeriesId()).toBe('test_measurement_1/test_device_1/test_analysis_1/a');
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(3);
            expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(3);
            const seriesInData = chartData.map(d => d.series);
            ['a','b','c'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(0);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBe(20);
        }
    });

    test('adding a path when a reference is set, is normalised', () => {
        let store = initialiseStore(true);
        const nav1 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'a'
        };
        store = store.addPath();
        store.navigate(1, nav1);
        expect(store.getPathCount()).toBe(1);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a');

        store.updateData(testData);
        expect(store.getPathCount()).toBe(1);
        const pathWithData = store.getPathAtIdx(0);
        verifyPath(pathWithData, 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        expect(pathWithData.data).not.toBeNull();
        expect(pathWithData.loaded).toBeTruthy();
        expect(pathWithData.series.count()).toBe(3);
        expect(pathWithData.series.filter(s => s.rendered).count()).toBe(3);
        {
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(1);
            expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(1);
            const seriesInData = chartData.map(d => d.series);
            ['a'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(1);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBe(6);
        }
        store.setReferenceSeriesId('test_measurement_1/test_device_1/test_analysis_1/a');
        {
            expect(store.getReferenceSeriesId()).toBe('test_measurement_1/test_device_1/test_analysis_1/a');
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(1);
            expect(chartData.map(d => d.id).filter(d => d === pathWithData.getExternalId())).toHaveLength(1);
            const seriesInData = chartData.map(d => d.series);
            ['a'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(0);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBeCloseTo(0);
        }

        // add a series and expect it to be normalised
        const nav2 = {
            measurementId: 'test_measurement_1',
            deviceId: 'test_device_1',
            analyserId: 'test_analysis_1',
            series: 'b'
        };
        store = store.addPath();
        store.navigate(2, nav2);
        store.updateData(testData);

        expect(store.getPathCount()).toBe(2);
        verifyPath(store.getPathAtIdx(0), 1, nav1, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/a');
        const path2WithData = store.getPathAtIdx(1);
        verifyPath(path2WithData, 2, nav2, measurementMeta, '/test_measurement_1/test_device_1/test_analysis_1/b');
        expect(store.toRouterPath()).toBe('/analyse/test_measurement_1/test_device_1/test_analysis_1/a/test_measurement_1/test_device_1/test_analysis_1/b');

        expect(path2WithData.data).not.toBeNull();
        expect(path2WithData.loaded).toBeTruthy();
        expect(path2WithData.series.count()).toBe(3);
        expect(path2WithData.series.filter(s => s.rendered).count()).toBe(3);
        {
            const {chartData, range} = store.asChartData();
            expect(chartData).not.toBeNull();
            expect(chartData).toHaveLength(2);
            expect(chartData.map(d => d.id).filter(d => d === path2WithData.getExternalId())).toHaveLength(2);
            const seriesInData = chartData.map(d => d.series);
            ['a','b'].forEach(s => expect(seriesInData.includes(s)).toBeTruthy());
            expect(range).not.toBeNull();
            expect(range.minX).toBe(1);
            expect(range.minY).toBe(0);
            expect(range.maxX).toBe(6);
            expect(range.maxY).toBe(10);
        }


    });
});
