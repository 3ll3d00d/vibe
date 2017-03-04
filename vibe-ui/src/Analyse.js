import React, {Component, PropTypes} from "react";
import {connect} from "react-refetch";
import Analysis from "./Analysis";
import AnalysisNavigator from "./AnalysisNavigator";
import Message from "./Message";

class Analyse extends Component {
    static contextTypes = {
        router: PropTypes.object.isRequired,
        apiPrefix: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.navigate.bind(this);
        this.addPath.bind(this);
        this.removePath.bind(this);
        this.triggerAnalysis.bind(this);
        this.state = {paths: this.decodeParams(props.params)};
    }

    /**
     * append a new measurement path.
     */
    addPath = () => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            paths.push({id: window.performance.now(), measurementId: null});
            return {paths: paths};
        });
    };

    /**
     * Remove the measurement path with the given id.
     * @param id the path id.
     */
    removePath = (id) => {
        this.setState((previousState, props) => {
            const newPaths = previousState.paths.slice();
            const idx = newPaths.findIndex(p => p.id === id);
            newPaths.splice(idx, 1);
            this.context.router.push(this.encodeParams(newPaths));
            return {paths: newPaths};
        });
    };

    /**
     * Marks this path as unloaded so it doesn't show on the chart.
     * @param id the path id.
     */
    unloadPath = (id) => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            const pathIdx = paths.findIndex(p => p.id === id);
            const newPath = Object.assign(paths[pathIdx], {unloaded: true});
            if (newPath.data) newPath.data = null;
            paths.splice(pathIdx, 1, newPath);
            return {paths: paths};
        });
    };

    /**
     * Triggers an analysis from the available paths.
     */
    triggerAnalysis = (id) => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            const pathIdx = paths.findIndex(p => p.id === id);
            let newPath = Object.assign(paths[pathIdx], {unloaded: false});
            const promise = this.extractDataPromises(props).find(p => p.name === newPath.measurementId);
            if (promise) {
                newPath = Object.assign(newPath, promise);
            }
            paths.splice(pathIdx, 1, newPath);
            return {paths: paths};
        });
        const toLoad = [...new Set(this.state.paths.filter(p => !(p.data && p.data.fulfilled)).map(p => p.measurementId))];
        toLoad.forEach(m => {
            this.props.fetchData(m)
        });
    };

    /**
     * Converts navigator events into routes (aka URLs).
     * @param id the id of the path that just changed.
     */
    navigate = (id) => (params) => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            const pathIdx = paths.findIndex(p => p.id === id);
            paths.splice(pathIdx, 1, Object.assign({id: paths[pathIdx].id}, params));
            this.context.router.push(this.encodeParams(paths));
            return {paths: paths};
        });
    };

    /**
     * Decodes the URL (router) parameters into a set of paths.
     * @param params the params.
     * @returns {[*]} the paths.
     */
    decodeParams(params) {
        const paths = [this.decodePath(params)];
        if (params.splat) {
            const splitSplat = params.splat.split("/");
            while (splitSplat.length > 0) {
                const nextParams = splitSplat.splice(0, 4);
                while (nextParams.length < 4) {
                    nextParams.push(null);
                }
                paths.push(this.decodePath({
                    measurementId: nextParams[0],
                    deviceId: nextParams[1],
                    analyserId: nextParams[2],
                    series: nextParams[3]
                }));
            }
        }
        return paths;
    }

    /**
     * Converts a set of params into a single path.
     * @param params
     * @returns a path object.
     */
    decodePath(params) {
        let first = {id: window.performance.now()};
        if (params.measurementId) first = Object.assign(first, {measurementId: params.measurementId});
        if (params.deviceId) first = Object.assign(first, {deviceId: params.deviceId});
        if (params.analyserId) first = Object.assign(first, {analyserId: params.analyserId});
        if (params.series) first = Object.assign(first, {series: params.series});
        return first;
    }

    /**
     * Encodes the paths into the URL.
     * @param paths the paths to encode.
     * @returns {string} the URL path.
     */
    encodeParams(paths) {
        return '/analyse' + paths.map(p => this.encodePath(p)).join("");
    }

    /**
     * Encodes a single path into a fragment of URL.
     * @param path the path.
     * @returns {string} the url fragment.
     */
    encodePath(path) {
        let encoded = "";
        if (path.measurementId) {
            encoded += '/' + path.measurementId;
            if (path.deviceId) {
                encoded += '/' + path.deviceId;
                if (path.analyserId) {
                    encoded += '/' + path.analyserId;
                    if (path.series) {
                        encoded += '/' + path.series;
                    }
                }
            }
        }
        return encoded;
    }

    /**
     * Extracts promises for fetched data and converts them into a set of named objects.
     * @param props the props.
     * @returns {Array} the objects that wrap the data props.
     */
    extractDataPromises(props) {
        return Object.keys(props).filter(p => p.startsWith("fetchedData_")).map(p => {
            return {
                name: p.substring("fetchedData_".length),
                data: props[p]
            }
        });
    }

    /**
     * triggerAnalysis causes 1-n new props to appear as refetch issues the queries, these will appear as the arg to this
     * function which copies the promise into the associated path. This would be unnecessary if we just used fetch
     * directly (but then we'd have to roll some more error handling code etc).
     * @param nextProps the new props.
     */
    componentWillReceiveProps(nextProps) {
        this.appendFetchedDataToPaths(nextProps);
    }

    appendFetchedDataToPaths(nextProps) {
        const namedPromises = this.extractDataPromises(nextProps);
        namedPromises.forEach(promise => {
            this.setState((previousState, props) => {
                const decoratedPaths = previousState.paths.slice().map((p) => {
                    if (p.measurementId === promise.name && !p.unloaded) {
                        return Object.assign(p, promise);
                    } else {
                        return p;
                    }
                });
                return {paths: decoratedPaths};
            });
        });
    }

    /**
     * @returns {boolean} if we have any path that is complete.
     */
    anyPathsIsComplete() {
        return this.getCompletePaths().length > 0;
    }

    /**
     * a filtered view on the available paths containing just those with data and all params set.
     * @returns {Array.<T>}
     */
    getCompletePaths() {
        return this.state.paths.filter(p => this.pathIsComplete(p));
    }

    /**
     * @param p the path.
     * @returns {T|*|null} true if this path has all params set.
     */
    pathIsComplete(p) {
        return p.measurementId && p.deviceId && p.analyserId && p.series && p.data && p.data.fulfilled;
    }

    renderLoaded() {
        let analysis = null;
        if (this.anyPathsIsComplete()) {
            analysis = <Analysis series={this.pathsToChartData()} pathCount={this.state.paths.length}/>;
        }
        return (
            <div>
                {this.renderNavigators()}
                {analysis}
            </div>
        );
    }

    /**
     * Converts each path to a dataset ready to be consumed by the chart. This results in an array of objects where each
     * object specifies an id, the series name and the dataset. There is 1 object per unique combination of path values.
     * @returns {Array}
     */
    pathsToChartData() {
        // convert each path to a set of data (1 per series)
        let seriesIdx = -1;
        const dataByPath = this.state.paths.map(p => {
            seriesIdx++;
            if (this.pathIsComplete(p)) {
                return p.series.split("-").map(s => {
                    const data = p.data.value[p.deviceId][p.analyserId][s];
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
                        id: `${p.measurementId}/${p.deviceId}/${p.analyserId}`,
                        series: s,
                        seriesIdx: seriesIdx,
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
        });
        // now flatten to one list
        return [].concat(...dataByPath).filter(p => p !== null);
    }

    renderNavigators() {
        return Array.from({length: this.state.paths.length}, (v, i) => {
            const isLast = i === (this.state.paths.length - 1);
            const isNotFirstAndOnly = i !== 0 || (this.state.paths.length > 1 && i === 0);
            return <AnalysisNavigator key={this.state.paths[i].id}
                                      measurementMeta={this.props.measurementMeta.value}
                                      path={this.state.paths[i]}
                                      addHandler={this.addPath}
                                      removeHandler={this.removePath}
                                      unloadHandler={this.unloadPath}
                                      analysisHandler={this.triggerAnalysis}
                                      isLastPath={isLast}
                                      isNotFirstAndOnlyPath={isNotFirstAndOnly}
                                      navigator={this.navigate(this.state.paths[i].id)}/>;
        });
    }

    renderRejected() {
        return (
            <div>
                <Message title="Unable to fetch measurements" type="danger"
                         message={this.props.data.reason.toString()}/>
            </div>
        );
    }

    renderLoading() {
        return (
            <div>
                <Message type="info" message="Loading"/>
            </div>
        );
    }

    render() {
        if (this.props.measurementMeta.pending) {
            return this.renderLoading();
        } else if (this.props.measurementMeta.rejected) {
            return this.renderRejected();
        } else if (this.props.measurementMeta.fulfilled) {
            return this.renderLoaded();
        }
    }
}

export default connect((props, context) => ({
    measurementMeta: {
        url: `${context.apiPrefix}/measurements`,
        then: (measurements) => ({
            value: measurements
                .filter(m => m.status === 'COMPLETE')
                .map(m => {
                    return {
                        analysis: m.analysis.analysis,
                        series: m.analysis.series,
                        id: m.id,
                        devices: Object.keys(m.recordingDevices)
                    };
                })
        })
    },
    fetchData: (measurementId) => ({
        [`fetchedData_${measurementId}`]: `${context.apiPrefix}/measurements/${measurementId}/analyse`
    })
}))(Analyse)
