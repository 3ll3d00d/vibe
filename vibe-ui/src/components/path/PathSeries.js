import {Map, Record} from "immutable";
import {renderData, normaliseData} from "./RenderedData";

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
            return this.set('rendered', renderData(data));
        } else {
            return this;
        }
    }

    /**
     * If we have not normalised this data set already, normalise it and store it.
     * @param referenceSeriesId
     * @param referenceData
     */
    normalise(referenceSeriesId, referenceData) {
        if (!this.normalisedData.get(referenceSeriesId) && this.rendered !== null) {
            const normalisedData = normaliseData(this.rendered, referenceData);
            return this.set('normalisedData', this.normalisedData.set(referenceSeriesId, normalisedData));
        } else {
            // TODO error
        }
        return this;
    }
}
