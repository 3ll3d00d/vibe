/**
 * Bridges the store to the individual Paths.
 */
import {List, Record} from "immutable";
import MeasurementPath from "./MeasurementPath";
import TargetPath from "./TargetPath";

export default class PathBridge extends Record({
    id: null,
    type: 'measure',
    meta: null,
    path: null
}) {
    constructor(id, meta) {
        super({id: id, meta: meta});
    }

    /** @returns String a string key value. */
    getExternalId() {
        return `${this.type}` + this.path ? this.path.getExternalId() : "";
    }

    /**
     * marks all series as invisible.
     * @returns {MeasurementPath}
     */
    unload() {
        if (this.path) {
            return this.set('path', this.path.unload());
        } 
        return this;
    }

    /**
     * Decodes the react router parameters into this path.
     * @param routerPath the routerPath.
     */
    decodeParams(routerPath) {
        if (routerPath.type === 'measure') {
            if (this.path instanceof MeasurementPath) {
                return this.set('path', this.path.decodeParams(routerPath));
            } else {
                return this.set('path', new MeasurementPath(this.meta).decodeParams(routerPath))
                           .set('type', routerPath.type);
            }
        } else if (routerPath.type === 'target') {
            if (this.path instanceof TargetPath) {
                return this.set('path', this.path.decodeParams(routerPath));
            } else {
                return this.set('path', new TargetPath().decodeParams(routerPath))
                           .set('type', routerPath.type);
            }
        }
        return this;
    }

    /**
     * Decodes the react router splat parameter.
     * @param splat the splat param.
     */
    decodeSplat(splat) {
        const splatArgs = splat.slice(1);
        if (splat[0] === 'measure') {
            if (this.path instanceof MeasurementPath) {
                return this.set('path', this.path.decodeSplat(splatArgs)).set('type', splat[0]);
            } else {
                return this.set('path', new MeasurementPath(this.meta).decodeSplat(splatArgs)).set('type', splat[0]);
            }
        } else if (splat[0] === 'target') {
            if (this.path instanceof TargetPath) {
                return this.set('path', this.path.decodeSplat(splatArgs)).set('type', splat[0]);
            } else {
                return this.set('path', new TargetPath().decodeSplat(splatArgs)).set('type', splat[0]);
            }
        }
        return this;
    }

    /**
     * Encodes into a fragment of URL.
     * @returns {string} the url fragment.
     */
    encode() {
        let encoded = `/${this.type}`;
        if (this.path) {
            encoded += this.path.encode();
        }
        return encoded;
    }

    acceptMeta(measurementMeta) {
        if (this.path) {
            return this.set('path', this.path.acceptMeta(measurementMeta));
        }
        return this;
    }

    isComplete() {
        return this.path && this.path.isComplete();
    }

    ownsReference(referenceSeriesId) {
        return this.path && this.path.ownsReference(referenceSeriesId);
    }

    isReferenceVisible(referenceSeriesId) {
        return this.path && this.path.isReferenceVisible(referenceSeriesId);
    }

    getReferenceData(referenceSeriesId) {
        if (this.path) {
            return this.path.getReferenceData(referenceSeriesId);
        }
        return null;
    }

    normalise(referenceSeriesId, referenceData) {
        if (this.path) {
            return this.set('path', this.path.normalise(referenceSeriesId, referenceData));
        }
        return this;
    }

    acceptData(dataPromises) {
        if (this.path) {
            if (dataPromises) {
                return this.set('path', this.path.acceptData(dataPromises.filter(p => p.type === this.type)));
            } else {
                return this.set('path', this.path.acceptData([]));
            }
        }
        return this;
    }

    convertToChartData(idx, referenceSeriesId) {
        if (this.path) {
            return this.path.convertToChartData(idx, referenceSeriesId);
        }
        return List();
    }

    hasSelectedSeries() {
        if (this.path) {
            return this.path.hasSelectedSeries();
        }
        return false;
    }

    triggerLoadIfRequired(fetchMeasurement, fetchTarget) {
        if (this.path) {
            if (this.type === 'measure') {
                this.path.triggerLoadIfRequired(fetchMeasurement);
            } else if (this.type === 'target') {
                this.path.triggerLoadIfRequired(fetchTarget);
            }
        }
        return this;
    }

    /** @returns the number of series in this path (or 0 if no path is set). */
    getSeriesCount() {
        if (this.path) {
            return this.path.getSeriesCount();
        }
        return 0;
    }
}