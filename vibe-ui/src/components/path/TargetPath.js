/**
 * Models the state associated with a target data path.
 */
import {List, Record} from "immutable";
import PathSeries from "./PathSeries";
import {NO_OPTION_SELECTED} from "../../constants";

export default class TargetPath extends Record({
    targetName: null,
    data: null,
    loaded: true,
    series: null
}) {

    /** @returns String a string key value. */
    getExternalId() {
        return `${this.targetName}`;
    }

    /**
     * marks all series as invisible.
     * @returns {MeasurementPath}
     */
    unload() {
        return this.set('loaded', false);
    }

    /**
     * Decodes the react router parameters into this path.
     * @param routerPath the routerPath.
     */
    decodeParams(routerPath) {
        return this._decode(routerPath.measurementId);
    }

    /**
     * Decodes the react router splat parameter.
     * @param splat the splat param.
     */
    decodeSplat(splat) {
        return this._decode(splat[0]);
    }

    _decode(targetName) {
        if (targetName) {
            if (targetName !== this.targetName) {
                return this.withMutations(p => {
                    p.set('targetName', targetName);
                    p.delete('data');
                    p.delete('series');
                    return p;
                });
            } else if (targetName === NO_OPTION_SELECTED) {
                return this.withMutations(p => {
                    p.delete('targetName');
                    p.delete('data');
                    p.delete('series');
                    return p;
                });
            } else {
                return this;
            }
        } else {
            return this.withMutations(p => {
                p.delete('targetName');
                p.delete('data');
                p.delete('series');
                return p;
            });
        }
    }

    /**
     * Encodes into a fragment of URL.
     * @returns {string} the url fragment.
     */
    encode() {
        const first = this.targetName ? `/${this.targetName}` : `/${NO_OPTION_SELECTED}`;
        return `${first}/${NO_OPTION_SELECTED}/${NO_OPTION_SELECTED}/${NO_OPTION_SELECTED}`;
    }

    convertToChartData(idx, referenceSeriesId) {
        const chartData = this.getChartData(referenceSeriesId);
        if (chartData) {
            return new List().push(Object.assign({
                id: this.getExternalId(),
                series: chartData.name,
                seriesIdx: idx
            }, chartData.data.toJS()));
        }
        return new List();
    }

    getChartData(referenceSeriesId) {
        const s = this.series;
        if (this.loaded && s && s.visible && s.rendered) {
            if (referenceSeriesId !== NO_OPTION_SELECTED && s.normalisedData.get(referenceSeriesId)) {
                return {name: s.seriesName, data: s.normalisedData.get(referenceSeriesId), rms: s.rms()};
            } else {
                return {name: s.seriesName, data: s.rendered, rms: s.rms()}
            }
        }
        return null;
    }

    acceptMeta(measurementMeta) {
        // ignore
        return this;
    }

    /** @returns true if this path has all params set. */
    isComplete() {
        return this.data && this.data.fulfilled;
    }

    acceptData(dataPromises) {
        const dataPromise = dataPromises.find(p => p.name === this.targetName);
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

    hasSelectedSeries() {
        return this.targetName;
    }

    addMissingRenderedData(namedData) {
        if (!this.series) {
            return this.set('series', new PathSeries('').acceptData(namedData.data));
        }
        return this;
    }

    /**
     * If this path needs data, calls the func to fetch it.
     * @param dataProvider
     * @returns {MeasurementPath}
     */
    triggerLoadIfRequired(dataProvider) {
        if (!(this.data && this.data.fulfilled)) {
            dataProvider(this.targetName);
        }
    }

    /** @returns boolean if this path owns the given reference series id. */
    ownsReference(referenceSeriesId) {
        return referenceSeriesId === this.getExternalId();
    }
}
