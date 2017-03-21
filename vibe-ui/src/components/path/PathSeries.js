import {List, Map, Record} from "immutable";

class DataPoint extends Record({x: 0, y: 0, z: 0}) {
}
class RenderedData extends Record({xyz: new List(), minX: 0, maxX: 0, minY: 0, maxY: 0}) {
}

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
        let xyz = new List();
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        for (let [idx, value] of data.freq.entries()) {
            if (value > 0) {
                xyz = xyz.push(new DataPoint({x: value, y: data.val[idx], z: 1}));
                if (value < minX) minX = value;
                if (value > maxX) maxX = value;
                if (data.val[idx] < minY) minY = data.val[idx];
                if (data.val[idx] > maxY) maxY = data.val[idx];
            }
        }
        return this.set('rendered', new RenderedData({xyz: xyz, minX: minX, maxX: maxX, minY: minY, maxY: maxY}));
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
        let normedData = new List();
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        referenceData.xyz.forEach((val, idx) => {
            const normedVal = this.rendered.xyz.get(idx).y - val.y;
            normedData = normedData.push(new DataPoint({
                x: this.rendered.xyz.get(idx).x,
                y: normedVal,
                z: this.rendered.xyz.get(idx).z
            }));
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        });
        return new RenderedData({
            xyz: normedData,
            minX: this.rendered.minX,
            maxX: this.rendered.maxX,
            minY: minY,
            maxY: maxY
        });
    }
}
