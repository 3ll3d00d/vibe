import React, {Component, PropTypes} from "react";
import {connect} from "react-refetch";
import {Panel} from "react-bootstrap";
import AnalysisNavigator from "./AnalysisNavigator";
import Message from "../../components/Message";
import ChartController from "./ChartController";
import Path from "./Path";

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
        this.state = {paths: this.loadPathsFromParams(props.params)};
    }

    /**
     * Decodes the URL (router) parameters into a set of paths.
     * @param params the params.
     * @returns {[*]} the paths.
     */
    loadPathsFromParams(params) {
        const paths = [new Path().decodeParams(params)];
        if (params.splat) {
            const splitSplat = params.splat.split("/");
            while (splitSplat.length > 0) {
                const nextParams = splitSplat.splice(0, 4);
                while (nextParams.length < 4) {
                    nextParams.push(null);
                }
                paths.push(new Path().decodeSplat(nextParams));
            }
        }
        return paths;
    }

    /**
     * append a new measurement path.
     */
    addPath = () => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            paths.push(new Path());
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
            this.context.router.push(this.encodePathsToURL(newPaths));
            return {paths: newPaths};
        });
    };

    encodePathsToURL(newPaths) {
        return '/analyse' + newPaths.map(p => p.encode()).join("");
    }

    /**
     * Marks this path as unloaded so it doesn't show on the chart.
     * @param id the path id.
     */
    unloadPath = (id) => {
        this.setState((previousState, props) => {
            const paths = previousState.paths.slice();
            const pathIdx = paths.findIndex(p => p.id === id);
            paths.splice(pathIdx, 1, paths[pathIdx].unload());
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
            const path = paths[pathIdx];
            const promise = this.extractDataPromises(props).find(promise => promise.name === path.measurementId);
            paths.splice(pathIdx, 1, path.load(promise));
            const toLoad = [...new Set(paths.filter(path => !(path.data && path.data.fulfilled)).map(path => path.measurementId))];
            toLoad.forEach(m => {
                this.props.fetchData(m)
            });
            return {paths: paths};
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
            paths.splice(pathIdx, 1, paths[pathIdx].updateParams(params));
            this.context.router.push(this.encodePathsToURL(paths));
            return {paths: paths};
        });
    };

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
        const namedPromises = this.extractDataPromises(nextProps);
        if (this.state.paths.find(p => !p.isComplete())) {
            this.setState((previousState, props) => {
                const decoratedPaths = previousState.paths.map((path) => {
                    const promise = namedPromises.find(promise => promise.name === path.measurementId);
                    if (promise && !path.unloaded) {
                        return path.load(promise);
                    } else {
                        return path;
                    }
                });
                return {paths: decoratedPaths};
            });
        }
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
        return this.state.paths.filter(p => p.isComplete());
    }

    renderLoaded() {
        let analysis = null;
        if (this.anyPathsIsComplete()) {
            const chartData = this.pathsToChartData();
            analysis = (
                <Panel bsStyle="info">
                    <ChartController range={calculateRange(chartData)}
                                     series={chartData}
                                     pathCount={this.state.paths.length}/>
                </Panel>
            );
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
        const dataByPath = this.state.paths.map(p => p.convertToChartData(++seriesIdx));
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
                        analysis: m.analysis,
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


/**
 * Extracts the x-y axis ranges from the generated data.
 * @param chartData
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
 */
export function calculateRange(chartData) {
    return {
        minX: Math.min(...chartData.map(k => k.minX)),
        minY: Math.min(...chartData.map(k => k.minY)),
        maxX: Math.max(...chartData.map(k => k.maxX)),
        maxY: Math.max(...chartData.map(k => k.maxY))
    };
}
