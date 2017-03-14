import {NO_OPTION_SELECTED} from "../../constants";
import {List, Record} from "immutable";

/**
 * A cached representation of a dataset for a single series.
 */
class RenderedData extends Record({rendered: null, referenceSeriesId: null, normalised: null}) {
    loadData(data) {
        return this.set('rendered', data);
    }

    calculateData(data) {
        console.log("Rendering data");
        const xyz = [];
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        for (let [idx, value] of data.freq.entries()) {
            if (value > 0) {
                xyz.push({x: value, y: data.val[idx], z: 1});
                if (value < minX) minX = value;
                if (value > maxX) maxX = value;
                if (data.val[idx] < minY) minY = data.val[idx];
                if (data.val[idx] > maxY) maxY = data.val[idx];
            }
        }
        return this.set('rendered', {xyz: xyz, minX: minX, maxX: maxX, minY: minY, maxY: maxY});
    }

    normalise(referenceSeriesId, referenceData) {
        const normedData = new Array(this.data.xyz.length);
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        referenceData.xyz.forEach((val, idx) => {
            const normedVal = this.data.xyz[idx].y - val.y;
            normedData[idx] = {x: this.data.xyz[idx].x, y: normedVal, z: this.data.xyz[idx].z};
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        });
        this.referenceSeriesId = referenceSeriesId;
        // copy twice to make sure the new normed data doesn't overwrite the data stored in the props
        const copy = Object.assign({}, this);
        this.normalisedData = Object.assign(copy, {xyz: normedData, minY: minY, maxY: maxY});
    }
}

export class PathSeries extends Record({
    seriesName: '',
    visible: true,
    renderedData: null
}) {
    constructor(seriesName) {
        super({seriesName: seriesName});
    }

    /**
     * Converts the input data into a RenderedData instance.
     * @param data the raw data.
     * @returns itself.
     */
    acceptData(data) {
        if (this.renderedData === null) {
            return this.set('renderedData', new RenderedData().calculateData(data))
        } else {
            return this;
        }
    }

    normaliseAgainst(id, renderedData) {

    }

    render(idx) {
        // TODO add path id and series
        return Object.assign({seriesIdx: idx}, this.renderedData.data);
    }
}

/**
 * Models the state associated with a data path.
 */
export class Path extends Record({
    id: null,
    measurementId: null,
    deviceId: null,
    analyserId: null,
    series: new List(),
    data: null,
    measurementMeta: null
}) {

    constructor(meta) {
        super({id: window.performance.now(), measurementMeta: meta});
    }

    /** @returns String a string key value. */
    getExternalId() {
        return `${this.measurementId}/${this.deviceId}/${this.analyserId}`;
    }

    /**
     * marks all series as invisible.
     * @returns {Path}
     */
    unload() {
        return this.set('series', this.series.map(s => s.set('visible', false)));
    }

    /**
     * Decodes the react router parameters into this path.
     * @param routerPath the routerPath.
     */
    decodeParams(routerPath) {
        return this._decode(routerPath.measurementId, routerPath.deviceId, routerPath.analyserId, routerPath.series);
    }

    /**
     * Decodes the react router splat parameter.
     * @param splat the splat param.
     */
    decodeSplat(splat) {
        return this._decode(splat[0], splat[1], splat[2], splat[3]);
    }

    /**
     * A function that applies the given params to the path.
     * @param measurementId the measurement id.
     * @param deviceId the device id.
     * @param analyserId the analyser id.
     * @param series
     * @returns the updated path.
     */
    _decode(measurementId, deviceId, analyserId, series) {
        return this.withMutations(path => {
            if (measurementId) {
                // if the measurementId has changed, ensure all downstream sections of the path should be removed
                if (measurementId !== path.measurementId) {
                    path.remove('deviceId');
                    path.remove('analyserId');
                    path.remove('series');
                    path.remove('data');
                    path.set('measurementId', measurementId);
                }
            }
            if (deviceId && deviceId !== path.deviceId) path.set('deviceId', deviceId);
            if (analyserId && analyserId !== path.analyserId) {
                if (analyserId !== path.analyserId) {
                    // if the analyser has changed, we need a new set of series but we can only do that if we have meta
                    // already, if we don't have meta then we have to rely on the series in the path
                    if (this.measurementMeta) {
                        const meta = this.measurementMeta.find(m => m.id === measurementId);
                        if (meta) {
                            path.set('series', new List(meta.analysis[analyserId].sort().map(s => new PathSeries(s))));
                        }
                    }
                }
                path.set('analyserId', analyserId);
            }
            if (series) {
                const visibleSeries = series.split('-');
                // if we have the series already we must have loaded meta so just map the visible set in
                if (path.series.size > 0) {
                    path.set('series', path.series.map(s => s.set('visible', visibleSeries.includes(s.seriesName))));
                } else {
                    // otherwise just create the missing members
                    path.set('series', new List(visibleSeries.map(s => new PathSeries(s))));
                }
            }
        });
    }

    /**
     * Encodes into a fragment of URL.
     * @returns {string} the url fragment.
     */
    encode() {
        let encoded = "";
        if (this.measurementId) {
            encoded += '/' + this.measurementId;
            if (this.deviceId) {
                encoded += '/' + this.deviceId;
                if (this.analyserId) {
                    encoded += '/' + this.analyserId;
                    if (this.series) {
                        encoded += '/' + this.encodeSelectedSeries();
                    }
                }
            }
        }
        return encoded;
    }

    /**
     * encodes the series as a string.
     * @returns {*|string}
     */
    encodeSelectedSeries() {
        return this.series.filter(s => s.visible).map(s => s.seriesName).join('-');
    }

    /** @returns true if any series is selected. */
    hasSelectedSeries() {
        return this.series.find(s => s.visible);
    }

    /**
     * @returns true if this path has all params set.
     */
    isComplete() {
        return this.measurementId && this.deviceId && this.analyserId
            && this.encodeSelectedSeries() !== NO_OPTION_SELECTED
            && this.data && this.data.fulfilled;
    }

    /**
     * Accepts the promise for data into the path, rendering to chart format if required.
     */
    acceptData(dataPromise) {
        if (dataPromise) {
            const withData = this.set('data', dataPromise.data);
            if (dataPromise.data.fulfilled) {
                return withData.addMissingRenderedData(dataPromise.data.value);
            }
            return withData;
        } else {
            return this.delete('data');
        }
    }

    /**
     * Passes the data from the server down into the series for rendering.
     * @param data the data.
     */
    addMissingRenderedData(data) {
        return this.set('series', this.series.map(s => s.acceptData(data[this.deviceId][this.analyserId][s.seriesName])));
    }

    /**
     * Converts the path to a format that the chart can consume (if it is complete).
     * @param idx the series index.
     */
    convertToChartData(idx) {
        return this.series.filter(s => s.visible).map(s => {
            return {name: s.seriesName, data: s.renderedData.rendered}
        }).map(d => Object.assign({id: this.getExternalId(), series: d.name, seriesIdx: idx}, d.data));
    }

    /**
     * Loads the measurement meta into the path.
     * @param measurementMeta
     */
    acceptMeta(measurementMeta) {
        return this.withMutations(path => {
            path.set('measurementMeta', measurementMeta);
            // if the component was loaded with path elements set via the URL then the meta will arrive after the initial
            // decode, this means we now need make sure we have populated the series so we have somewhere to load our
            // data into
            if (path.measurementId) {
                const meta = measurementMeta.find(m => m.id === path.measurementId);
                if (meta) {
                    let newSeries = new List(meta.analysis[path.analyserId].sort().map(s => new PathSeries(s)));
                    if (path.series.size > 0) {
                        const invisibleNames = path.series.filter(s => !s.visible).map(s => s.seriesName);
                        newSeries = newSeries.map(s => {
                            if (invisibleNames.includes(s)) {
                                return s.set('visible', false);
                            } else {
                                return s;
                            }
                        });
                    }
                    path.set('series', newSeries);
                }
            }
        });
    }
}
