import {NO_OPTION_SELECTED} from "../../constants";

/**
 * Models the state associated with a data path.
 */
export default class Path {
    constructor() {
        this.id = window.performance.now();
        this.measurementId = null;
        this.deviceId = null;
        this.analyserId = null;
        this.series = null;
        this.name = null;
        this.data = null;
        this.unloaded = false;
    }

    /**
     * Decodes the react router parameters into this path.
     * @param params the params.
     */
    decodeParams(params) {
        return this._decode(params.measurementId, params.deviceId, params.analyserId, params.series);
    }

    /**
     * Decodes the react router splat parameter.
     * @param splat the splat param.
     */
    decodeSplat(splat) {
        return this._decode(splat[0], splat[1], splat[2], splat[3]);
    }

    _decode(measurementId, deviceId, analyserId, series) {
        if (measurementId) {
            if (measurementId !== this.measurementId) {
                this.data = null;
                this.name = null;
                this.unloaded = false;
            }
            this.measurementId = measurementId;
        }
        if (deviceId) this.deviceId = deviceId;
        if (analyserId) this.analyserId = analyserId;
        if (series) this.series = series;
        return this;
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
                        encoded += '/' + this.series;
                    }
                }
            }
        }
        return encoded;
    }

    /**
     * Copies the path and unloads the data.
     * @returns {Path}
     */
    unload() {
        const clone = this.clone();
        clone.data = null;
        clone.unloaded = true;
        return clone
    }

    /**
     * Copies the path and loads the data.
     * @returns {Path}
     */
    load(promise) {
        const clone = this.clone();
        clone.unloaded = false;
        if (promise) {
            clone.data = promise.data;
            clone.name = promise.name;
        } else {
            clone.data = null;
            clone.name = null;
        }
        return clone
    }

    /**
     * clones the path.
     * @returns {Path}
     */
    clone() {
        const clone = new Path();
        clone.id = this.id;
        clone.measurementId = this.measurementId;
        clone.deviceId = this.deviceId;
        clone.analyserId = this.analyserId;
        clone.series = this.series;
        clone.data = this.data;
        clone.name = this.name;
        clone.unloaded = this.unloaded;
        return clone;
    }

    /**
     * Accepts changes to the params.
     * @param params
     * @returns {Path}
     */
    updateParams(params) {
        const clone = this.clone();
        clone.decodeParams(params);
        return clone;
    }

    /**
     * @returns true if this path has all params set.
     */
    isComplete() {
        return this.measurementId && this.deviceId && this.analyserId
            && this.series && this.series !== NO_OPTION_SELECTED
            && this.data && this.data.fulfilled;
    }

    /**
     * Converts the path to a format that the chart can consume (if it is complete).
     * @param idx the series index.
     * @returns {*}
     */
    convertToChartData(idx) {
        if (this.isComplete()) {
            return this.series.split("-").map(s => {
                const data = this.data.value[this.deviceId][this.analyserId][s];
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
                return {
                    id: `${this.measurementId}/${this.deviceId}/${this.analyserId}`,
                    series: s,
                    seriesIdx: idx,
                    xyz: xyz,
                    minX: minX,
                    maxX: maxX,
                    minY: minY,
                    maxY: maxY
                };
            });
        } else {
            return null;
        }
    }
}
