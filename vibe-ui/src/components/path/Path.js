import {NO_OPTION_SELECTED} from "../../constants";
import {List, Record} from "immutable";
import PathSeries from "./PathSeries";

/**
 * Models the state associated with a data path.
 */
export default class Path extends Record({
    id: null,
    measurementId: null,
    deviceId: null,
    analyserId: null,
    series: new List(),
    data: null,
    measurementMeta: null,
    loaded: true
}) {

    constructor(id, meta) {
        super({id: id, measurementMeta: meta});
    }

    /** @returns String a string key value. */
    getExternalId() {
        return `${this.measurementId}/${this.deviceId}/${this.analyserId}`;
    }

    /** @returns true if this path owns the given reference series id. */
    ownsReference(referenceSeriesId) {
        const externalId = this.getExternalId();
        if (referenceSeriesId.startsWith(externalId)) {
            const referenceSeries = referenceSeriesId.substring(externalId.length + 1);
            return this.series.map(s => s.seriesName).includes(referenceSeries);
        }
        return false;
    }

    /** @returns the rendered data for the reference series id. */
    getReferenceData(referenceSeriesId) {
        const externalId = this.getExternalId();
        if (referenceSeriesId.startsWith(externalId)) {
            const referenceSeriesName = referenceSeriesId.substring(externalId.length + 1);
            const referenceSeries = this.series.find(s => s.seriesName === referenceSeriesName);
            if (referenceSeries) {
                return referenceSeries.rendered;
            }
        }
        return null;
    }

    /**
     * marks all series as invisible.
     * @returns {Path}
     */
    unload() {
        return this.set('loaded', false);
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
                }
                path.set('measurementId', measurementId);
            }
            if (deviceId) {
                if (deviceId !== path.deviceId) {
                    path.remove('analyserId');
                    path.remove('series');
                    path.remove('data');
                }
                path.set('deviceId', deviceId);
            }
            if (analyserId && analyserId !== path.analyserId) {
                if (analyserId === NO_OPTION_SELECTED) {
                    path.remove('analyserId');
                }  else {
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
            }
            if (series) {
                const visibleSeries = series === NO_OPTION_SELECTED ? [] : series.split('-');
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
                } else {
                    encoded += '/' + NO_OPTION_SELECTED;
                }
                const encodedSeries = this.encodeSelectedSeries();
                if (encodedSeries.length > 0) {
                    encoded += '/' + encodedSeries;
                } else {
                    encoded += '/' + NO_OPTION_SELECTED;
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

    /** @returns Boolean if any series is selected. */
    hasSelectedSeries() {
        return this.series.filter(s => s.visible).count() > 0;
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
            const withData = this.set('data', dataPromise.data).set('loaded', true);
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
     * @param referenceSeriesId the reference series, if any.
     */
    convertToChartData(idx, referenceSeriesId) {
        return this.series.filter(s => s.visible && this.loaded && s.rendered).map(s => {
            if (referenceSeriesId !== NO_OPTION_SELECTED) {
                return {name: s.seriesName, data: s.normalisedData.get(referenceSeriesId)};
            } else {
                return {name: s.seriesName, data: s.rendered}
            }
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
            if (path.measurementId && path.deviceId && path.analyserId) {
                const meta = measurementMeta.find(m => m.id === path.measurementId);
                if (meta) {
                    let newSeries = new List(meta.analysis[path.analyserId].sort().map(s => new PathSeries(s).set('visible', false)));
                    if (path.series.size > 0) {
                        const visibleNames = path.series.filter(s => s.visible).map(s => s.seriesName);
                        path.set('series', newSeries.map(s => s.set('visible', visibleNames.includes(s.seriesName))));
                    } else {
                        path.set('series', newSeries);
                    }
                }
            }
        });
    }

    /**
     * Normalises all series against the given reference.
     * @param referenceSeriesId
     * @param referenceData
     */
    normalise(referenceSeriesId, referenceData) {
        return this.set('series', this.series.map(s => s.normalise(referenceSeriesId, referenceData)));
    }
}
