/**
 * a container for paths.
 */
import {Path, PathSeries} from "./Path";
import {NO_OPTION_SELECTED} from "../../constants";
import {List} from "immutable";

class PathStore {
    constructor() {
        this.paths = List();
        this.meta = null;
        this.referenceSeriesId = NO_OPTION_SELECTED;
    }

    /**
     * Adds a new path to the store.
     * @return PathStore the store.
     */
    addPath() {
        this.paths = this.paths.push(this._makePath());
        return this;
    }

    _makePath() {
        return new Path(this.meta);
    }

    /**
     * Removes the path identified by the id from the store.
     * @param pathId the path id.
     * @return PathStore the store.
     */
    removePath(pathId) {
        const index = this.paths.findIndex(p => p.id === pathId);
        if (index !== -1) {
            this.paths = this.paths.delete(index);
        }
        return this;
    }

    /**
     * Marks the path as unloaded.
     * @param pathId the pathId.
     * @returns PathStore the store.
     */
    unloadPath(pathId) {
        const pathIdx = this.paths.findIndex(p => p.id === pathId);
        if (pathIdx !== -1) {
            this.paths = this.paths.update(pathIdx, p => p.unload());
        }
        return this;
    }

    /**
     * @returns {boolean} if we have any path that is complete.
     */
    anyPathIsComplete() {
        return this.paths.find(p => p.isComplete());
    }

    /**
     * a filtered view on the available paths containing just those with data and all params set.
     * @returns {Immutable.Iterable<K, V>}
     */
    getCompletePaths() {
        return this.paths.filter(p => p.isComplete());
    }

    /**
     * @returns {string} a react router path that contains the stored paths.
     */
    toRouterPath() {
        return '/analyse' + this.paths.map(p => p.encode()).join("");
    }

    /**
     * Replaces the contents of this store with the paths identified by the URL.
     * @param routerPath the path.
     * @return PathStore store.
     */
    fromRouterPath(routerPath) {
        const paths = [this._makePath().decodeParams(routerPath)];
        if (routerPath.splat) {
            const splitSplat = routerPath.splat.split("/");
            while (splitSplat.length > 0) {
                const nextPath = splitSplat.splice(0, 4);
                while (nextPath.length < 4) {
                    nextPath.push(null);
                }
                paths.push(this._makePath().decodeSplat(nextPath));
            }
        }
        this.paths = new List(paths);
        return this;
    }

    /**
     * Updates the specified path on a navigation event.
     * @param pathId the path to update.
     * @param routerPath the new router path.
     * @returns {PathStore} the store.
     */
    navigate(pathId, routerPath) {
        const pathIdx = this.paths.findIndex(p => p.id === pathId);
        if (pathIdx !== -1) {
            this.paths = this.paths.update(pathIdx, p => p.decodeParams(routerPath));
        }
        return this;
    }

    /**
     * Specifies the current reference path id.
     * @param referenceSeriesId the reference path id.
     */
    setReferenceSeriesId(referenceSeriesId) {
        this.referenceSeriesId = referenceSeriesId;
        // TODO trigger data calculation
    }

    /**
     * Loads data into the paths.
     * @param namedPromises the data providers.
     * @returns {PathStore} the store.
     */
    updateData(namedPromises) {
        this.paths = this.paths.map((path) => {
            return path.acceptData(namedPromises.find(promise => promise.name === path.measurementId));
        });
        return this;
    }

    /**
     * Stores the current meta data into
     * @param measurementMeta
     */
    storeMeta(measurementMeta) {
        if (!this.meta) {
            this.meta = measurementMeta;
            this.paths = this.paths.map(p => p.acceptMeta(measurementMeta));
        }
        return this;
    }

    /**
     * Converts the paths into a format that can be consumed by a chart.
     * @returns {{chartData: Array, range: {minX: number, minY: number, maxX: number, maxY: number}}}
     */
    asChartData() {
        if (this.anyPathIsComplete()) {
            return this.calculateRange(this.convertToChartData());
        }
        return {chartData: null, range: null};
    }

    /**
     * Calculates the range.
     * @param chartData the data.
     * @returns {{chartData: Array, range: {minX: number, minY: number, maxX: number, maxY: number}}}
     */
    calculateRange(chartData) {
        return {
            chartData: chartData,
            range: {
                minX: Math.min(...chartData.map(k => k.minX)),
                minY: Math.min(...chartData.map(k => k.minY)),
                maxX: Math.max(...chartData.map(k => k.maxX)),
                maxY: Math.max(...chartData.map(k => k.maxY))
            }
        };
    }


    /**
     * Converts each path to a dataset ready to be consumed by the chart. This results in an array of objects where each
     * object specifies an id, the series name and the dataset. There is 1 object per unique combination of path values.
     * @returns {Array}
     */
    convertToChartData() {
        // const referenceOwner = this.paths.find(p => p.hasReferenceSeries(this.referenceSeriesId));
        // if (referenceOwner) {
        //     const referenceData = referenceOwner.getChartData(this.referenceSeriesId)
        // }
        // convert each path to a set of data (1 per series)
        let seriesIdx = -1;
        const dataByPath = this.paths.map(p => p.convertToChartData(++seriesIdx)).toJS();
        // now flatten to one list
        return [].concat(...dataByPath).filter(p => p !== null);
    }

    /**
     * @returns {Number} the number of paths in the store.
     */
    getPathCount() {
        return this.paths.count();
    }

    /**
     * @returns {null|*} the reference path id.
     */
    getReferenceSeriesId() {
        return this.referenceSeriesId;
    }

    /**
     * Loads the given path for analysis which involves loading the specified promise into the path and then
     * yielding the measurementIds for the paths which do not currently have data.
     * @param pathId the path id to load.
     * @param dataPromises the data promises.
     * @returns {[*]} a list of measurement ids that do not have data available.
     */
    load(pathId, dataPromises) {
        const pathIdx = this.paths.findIndex(p => p.id === pathId);
        if (pathIdx !== -1) {
            const path = this.paths.get(pathIdx);
            const promise = dataPromises.find(promise => promise.name === path.measurementId);
            this.paths = this.paths.update(pathIdx, p => p.acceptData(promise));
            return [...new Set(this.paths.filter(path => !(path.data && path.data.fulfilled)).map(path => path.measurementId))];
        }
        return [];
    }

    /**
     * The path at the specified index.
     * @param idx the index.
     * @returns {*} the path.
     */
    getPathAtIdx(idx) {
        return this.paths.get(idx);
    }

    getSeriesToNormaliseOn(state, series) {
        const can = state.normalise && series.map(s => `${s.id}/${s.series}`).includes(state.normalise);
        return can ? state.normalise : "-1";
    }

    /**
     * Gets the data to pass to the chart, normalising it if required.
     * @returns {*}
     */
    normalisedDataIfNecessary() {
        const normaliseSeries = this.getSeriesToNormaliseOn(this.state, this.props.series);
        if (normaliseSeries === "-1") {
            return this.props.series;
        }
        return this.normalise(normaliseSeries);
    }

    /**
     * Returns a copy of the data that has been normalised against the reference series.
     * @param referenceSeriesId the selected reference series.
     */
    normalise(referenceSeriesId) {
        const referenceSeries = this.props.series.find(s => referenceSeriesId === (s.id + '/' + s.series));
        return this.props.series.map(s => {
            return this.normaliseSeries(referenceSeries, s)
        });
    }

    /**
     * Returns a copy of the unnormalised series normalised against the given reference series.
     * @param referenceSeries the reference.
     * @param unnormalisedSeries the series to normalise.
     * @returns {Array} the normalised series.
     */
    normaliseSeries(referenceSeries, unnormalisedSeries) {
        const normedData = new Array(unnormalisedSeries.xyz.length);
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        referenceSeries.xyz.forEach((val, idx) => {
            const normedVal = unnormalisedSeries.xyz[idx].y - val.y;
            normedData[idx] = {x: unnormalisedSeries.xyz[idx].x, y: normedVal, z: unnormalisedSeries.xyz[idx].z};
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        });
        // copy twice to make sure the new normed data doesn't overwrite the data stored in the props
        const copy = Object.assign({}, unnormalisedSeries);
        return Object.assign(copy, {xyz: normedData, minY: minY, maxY: maxY});
    }
}

export let pathStore = new PathStore();

