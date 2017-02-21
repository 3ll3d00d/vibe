import React, {Component} from "react";
import {connect} from "react-refetch";
import {Panel} from "react-bootstrap";
import Message from "./Message";
import ChartController from "./ChartController";
import AnalysisNavigator from "./AnalysisNavigator";

class Analysis extends Component {

    constructor(props) {
        super(props);
        this.state = {updateChartOnNavigatorChange: 1};
    }

    extractSeries(series) {
        const vals = [];
        for (let [idx, value] of series.freq.entries()) {
            if (value > 0) vals.push({x: value, y: series.val[idx], z: 1});
        }
        return vals;
    }

    calculateRange(data) {
        const series = Object.keys(data);
        return {
            minX: Math.min(...series.map((s) => Math.min(...data[s].map(x => x.x)))),
            minY: Math.min(...series.map((s) => Math.min(...data[s].map(x => x.y)))),
            maxX: Math.max(...series.map((s) => Math.max(...data[s].map(x => x.x)))),
            maxY: Math.max(...series.map((s) => Math.max(...data[s].map(x => x.y))))
        };
    }

    componentWillReceiveProps(nextProps) {
        const {measurementId: nextMid, deviceId: nextDid, analyserId: nextAid, series: nextS} = nextProps.params;
        const {measurementId: thisMid, deviceId: thisDid, analyserId: thisAid, series: thisS} = this.props.params;
        if (nextMid && nextDid && nextAid && nextS && thisMid && thisDid && thisAid && thisS) {
            if (nextS !== thisS || nextAid !== thisAid) {
                this.setState((previousState, props) => {
                    return {updateChartOnNavigatorChange: (previousState.updateChartOnNavigatorChange+1)};
                });
            }
        }
    }

    render() {
        // TODO extract a HOC for this loading pattern
        if (this.props.data.pending) {
            return (
                <div>
                    <Message type="info" message="Loading"/>
                </div>
            );
        } else if (this.props.data.rejected) {
            return (
                <div>
                    <Message title="Unable to fetch data" type="danger" message={this.props.data.reason.toString()}/>
                </div>
            );
        } else if (this.props.data.fulfilled) {
            const {measurementId, deviceId, analyserId, series} = this.props.params;
            if (measurementId && deviceId && analyserId && series) {
                const input = this.props.data.value[deviceId][analyserId];
                const data = this.convertSelectedSeriesToChartData(input, series.split("-"));
                const range = this.calculateRange(data);
                return (
                    <div>
                        <AnalysisNavigator params={this.props.params} data={this.props.data.value}/>
                        <Panel bsStyle="info">
                            <ChartController range={range} data={data}
                                             forceUpdate={this.state.updateChartOnNavigatorChange}/>
                        </Panel>
                    </div>
                );
            } else {
                return <AnalysisNavigator params={this.props.params} data={this.props.data.value}/>;
            }
        }
    }

    convertSelectedSeriesToChartData(input, selectedSeries) {
        return Object.assign(...Object.keys(input).filter((k) => selectedSeries.includes(k)).map((key) => {
            return {[key]: this.extractSeries(input[key])};
        }));
    }
}

export default connect(props => ({
    data: props.sourceURL
}))(Analysis);

// TODO allow user to add additional measurements to compare against