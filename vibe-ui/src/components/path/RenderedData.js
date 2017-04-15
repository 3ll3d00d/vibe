import {List, Record} from "immutable";

const calcRMS = xyz => Math.sqrt(xyz.reduce((a, x) => (a.y + x.y * x.y), 0) / xyz.count());

class DataPoint extends Record({x: 0, y: 0, z: 0}) {}
export default class RenderedData extends Record({xyz: new List(), minX: 0, maxX: 0, minY: 0, maxY: 0}) {
    /** @returns number rms value of this series. */
    rms() {
        return calcRMS(this.xyz);
    }

    applyOffset(offset) {
        if (offset !== 0) {
            return this.withMutations(m => {
                m.set('xyz', this.xyz.map(v => v.set('y', v.y + offset)));
                m.set('minY', this.minY + offset);
                m.set('maxY', this.maxY + offset);
            });
        } else {
            return this;
        }
    }
}


/**
 * Calculates the rendered dataset for this series.
 * @param data
 * @returns {RenderedData}
 */
export function renderData(data) {
    let xyz = new List();
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    for (let [idx, value] of data.freq.entries()) {
        if (value > 0.01) {
            xyz = xyz.push(new DataPoint({x: value, y: data.val[idx], z: 1}));
            if (value < minX) minX = value;
            if (value > maxX) maxX = value;
            if (data.val[idx] < minY) minY = data.val[idx];
            if (data.val[idx] > maxY) maxY = data.val[idx];
        }
    }
    return new RenderedData({xyz: xyz, minX: minX, maxX: maxX, minY: minY, maxY: maxY});
}

/**
 * Creates a new set of data which is a normalisation of this dataset against the given reference data.
 * @param renderedData
 * @param referenceData
 * @returns {*}
 */
export function normaliseData(renderedData, referenceData) {
    let normedData = new List();
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    const renderedDataCount = renderedData.xyz.count();
    referenceData.xyz.forEach((val, idx) => {
        // the datasets might be a different size
        if (idx < renderedDataCount) {
            const normedVal = renderedData.xyz.get(idx).y - val.y;
            normedData = normedData.push(new DataPoint({
                x: renderedData.xyz.get(idx).x,
                y: normedVal,
                z: renderedData.xyz.get(idx).z
            }));
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        }
    });
    return new RenderedData({
        xyz: normedData,
        minX: renderedData.minX,
        maxX: renderedData.maxX,
        minY: minY,
        maxY: maxY
    });
}
