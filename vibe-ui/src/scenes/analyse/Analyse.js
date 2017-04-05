import React, {Component, PropTypes} from "react";
import {connect, PromiseState} from "react-refetch";
import {Panel} from "react-bootstrap";
import AnalysisNavigator from "./AnalysisNavigator";
import Message from "../../components/Message";
import ChartController from "./ChartController";
import {pathStore} from "../../components/path/PathStore";

class Analyse extends Component {
    static contextTypes = {
        router: PropTypes.object.isRequired,
        apiPrefix: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.state = {pathStore: pathStore.fromRouterPath(props.params)};
    }

    /** append a new measurement path. */
    addPath = () => {
        this.setState((previousState, props) => {
            return {pathStore: previousState.pathStore.addPath()};
        });
    };

    /**
     * Remove the measurement path with the given id.
     * @param id the path id.
     */
    removePath = (id) => {
        this.setState((previousState, props) => {
            const pathStore = previousState.pathStore.removePath(id);
            this.context.router.push(pathStore.toRouterPath());
            return {pathStore: pathStore};
        });
    };

    /**
     * Marks this path as unloaded so it doesn't show on the chart.
     * @param id the path id.
     */
    unloadPath = (id) => {
        this.setState((previousState, props) => {
            return {pathStore: previousState.pathStore.unloadPath(id)};
        });
    };

    /**
     * Triggers an analysis from the available paths.
     */
    triggerAnalysis = (id) => {
        this.setState((previousState, props) => {
            const toLoad = previousState.pathStore.load(id, this.extractDataPromises(props));
            toLoad.forEach(m => {
                this.props.fetchMeasurementData(m)
            });
            return {pathStore: previousState.pathStore};
        });
    };

    /**
     * Converts navigator events into routes (aka URLs).
     * @param id the id of the path that just changed.
     */
    navigate = (id) => (params) => {
        this.setState((previousState, props) => {
            const pathStore = previousState.pathStore.navigate(id, params);
            this.context.router.push(pathStore.toRouterPath());
            return {pathStore: pathStore};
        });
    };

    /**
     * Sets the reference series id.
     * @param event the event from the option.
     */
    handleReferenceSeries = (event) => {
        const val = event.target.value;
        this.setState((previousState, props) => {
            return {pathStore: previousState.pathStore.setReferenceSeriesId(val)};
        })
    };

    /**
     * Extracts promises for fetched data and converts them into a set of named objects.
     * @param props the props.
     * @returns {Array} the objects that wrap the data props.
     */
    extractDataPromises(props) {
        const md = Object.keys(props).filter(p => p.startsWith("fetchedMeasurementData_")).map(p => {
            return {
                name: p.substring(p.indexOf('_') + 1),
                type: 'measure',
                data: props[p]
            }
        });
        const td = Object.keys(props).filter(p => p.startsWith("fetchedTargetData_")).map(p => {
            return {
                name: p.substring(p.indexOf('_') + 1),
                type: 'target',
                data: props[p]
            }
        });
        return [...md, ...td];
    }

    /**
     * triggerAnalysis causes 1-n new props to appear as refetch issues the queries, these will appear as the arg to this
     * function which copies the promise into the associated path. This would be unnecessary if we just used fetch
     * directly (but then we'd have to roll some more error handling code etc).
     * @param nextProps the new props.
     */
    componentWillReceiveProps(nextProps) {
        if (nextProps.measurementMeta && nextProps.measurementMeta.fulfilled) {
            this.setState((previousState, props) => {
                const oldPath = pathStore.toRouterPath();
                const newStore = previousState.pathStore.storeMeta(nextProps.measurementMeta.value);
                const newPath = pathStore.toRouterPath();
                if (oldPath !== newPath) {
                    this.context.router.push(newPath);
                }
                return {pathStore: newStore};
            });
        }
        if (!this.state.pathStore.allPathsAreComplete()) {
            const namedPromises = this.extractDataPromises(nextProps);
            this.setState((previousState, props) => {
                return {pathStore: previousState.pathStore.updateData(namedPromises)};
            });
        }
    }

    renderLoaded() {
        let analysis = null;
        const {chartData, range} = this.state.pathStore.asChartData();
        if (chartData !== null && chartData.length > 0) {
            analysis = (
                <Panel bsStyle="info">
                    <ChartController range={range}
                                     series={chartData}
                                     pathCount={this.state.pathStore.getPathCount()}
                                     referenceSeriesId={this.state.pathStore.getReferenceSeriesId()}
                                     referenceSeriesHandler={this.handleReferenceSeries}/>
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

    renderNavigators() {
        // TODO should really decouple the navigator from the underlying path
        const pathCount = this.state.pathStore.getPathCount();
        return Array.from({length: pathCount}, (v, i) => {
            const isLast = i === (pathCount - 1);
            const isNotFirstAndOnly = i !== 0 || (pathCount > 1 && i === 0);
            const pathAtIdx = this.state.pathStore.getPathAtIdx(i);
            return <AnalysisNavigator key={pathAtIdx.id}
                                      type={pathAtIdx.type}
                                      measurementMeta={this.props.measurementMeta.value}
                                      targetMeta={this.props.targetMeta.value}
                                      path={pathAtIdx.path}
                                      addHandler={this.addPath}
                                      removeHandler={() => this.removePath(pathAtIdx.id)}
                                      unloadHandler={() => this.unloadPath(pathAtIdx.id)}
                                      analysisHandler={() => this.triggerAnalysis(pathAtIdx.id)}
                                      isLastPath={isLast}
                                      isNotFirstAndOnlyPath={isNotFirstAndOnly}
                                      navigator={this.navigate(pathAtIdx.id)}/>;
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
        const all = PromiseState.all([this.props.measurementMeta, this.props.targetMeta]);
        if (all.pending) {
            return this.renderLoading();
        } else if (all.rejected) {
            return this.renderRejected();
        } else if (all.fulfilled) {
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
    targetMeta: {
        url: `${context.apiPrefix}/targets`,
        then: (targets) => ({
            value: targets.map(t => t.name)
        })
    },
    fetchMeasurementData: (measurementId) => ({
        [`fetchedMeasurementData_${measurementId}`]: `${context.apiPrefix}/measurements/${measurementId}/analyse`
    }),
    fetchTargetData: (targetName) => ({
        [`fetchedTargetData_${targetName}`]: `${context.apiPrefix}/targets/${targetName}`
    })
}))(Analyse)
