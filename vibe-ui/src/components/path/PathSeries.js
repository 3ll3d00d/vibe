import {Map, Record} from "immutable";

/**
 * An individual series that has a dataset which can be displayed on a chart.
 */
export default class PathSeries extends Record({
    seriesName: '',
    visible: true,
    rendered: null,
    normalisedData: new Map()
}) {
    constructor(seriesName) {
        super({seriesName: seriesName});
    }

    /**
     * Converts the input data to chart format.
     * @param data the raw data.
     * @returns itself.
     */
    acceptData(data) {
        if (this.rendered === null) {
            return this.calculateData(data);
        } else {
            return this;
        }
    }

    /**
     * Calculates the rendered dataset for this series.
     * @param data
     * @returns {Map<string, {xyz: Array, minX: Number, maxX: Number, minY: Number, maxY: Number}>}
     */
    calculateData(data) {
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

    /**
     * If we have not normalised this data set already, normalise it and store it.
     * @param referenceSeriesId
     * @param referenceData
     */
    normalise(referenceSeriesId, referenceData) {
        if (!this.normalisedData.get(referenceSeriesId) && this.rendered !== null) {
            const normalisedData = this.normaliseData(referenceData);
            return this.set('normalisedData', this.normalisedData.set(referenceSeriesId, normalisedData));
        } else {
            // TODO error
        }
        return this;
    }

    /**
     * Creates a new set of data which is a normalisation of this dataset against the given reference data.
     * @param referenceData
     * @returns {*}
     */
    normaliseData(referenceData) {
        const normedData = new Array(this.rendered.xyz.length);
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        referenceData.xyz.forEach((val, idx) => {
            const normedVal = this.rendered.xyz[idx].y - val.y;
            normedData[idx] = {x: this.rendered.xyz[idx].x, y: normedVal, z: this.rendered.xyz[idx].z};
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        });
        // copy twice to make sure the new normed data doesn't overwrite the data stored in the props
        const copy = Object.assign({}, this.rendered);
        return Object.assign(copy, {xyz: normedData, minY: minY, maxY: maxY});
    }
}
