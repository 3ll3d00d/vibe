import {List, Record} from "immutable";
// import PathSeries from "./PathSeries";

/**
 * Models the state associated with a target data path.
 */
export default class TargetPath extends Record({
    targetName: null,
    series: new List(),
    data: null,
    loaded: true
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
        return this._decode(splat[1]);
    }

    _decode(targetName) {
        if (targetName) {
            if (targetName !== this.targetName) {
                return this.withMutations(p => {
                    p.set('targetName', targetName);
                    p.delete('data');
                    return p;
                });
            }
        } else {
            return this.withMutations(p => {
                p.delete('targetName');
                p.delete('data');
                return p;
            });
        }
    }

    /**
     * Encodes into a fragment of URL.
     * @returns {string} the url fragment.
     */
    encode() {
        return this.targetName ? `/${this.targetName}` : "";
    }

    convertToChartData(idx, referenceSeriesId) {
        // TODO impl
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

    addMissingRenderedData(data) {
        // return this.set('series', this.series.map(s => s.acceptData(data[this.deviceId][this.analyserId][s.seriesName])));
        return this;
    }
}
