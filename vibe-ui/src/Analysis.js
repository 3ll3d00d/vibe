import React, {Component} from "react";
import {connect} from "react-refetch";
import {Panel} from "react-bootstrap";
import Message from "./Message";
import ChartController from "./ChartController";
import AnalysisNavigator from "./AnalysisNavigator";

class Analysis extends Component {

    extractSeries(series) {
        const vals = [];
        for (let [idx, value] of series.freq.entries()) {
            if (value > 0) vals.push({x: value, y: series.val[idx], z: 1});
        }
        return vals;
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
                const selectedSeries = series.split("-");
                const data = Object.keys(input).filter((k) => selectedSeries.includes(k)).map((key) => {
                    return {[key]: this.extractSeries(input[key])};
                });
                return (
                    <div>
                        <AnalysisNavigator params={this.props.params} data={this.props.data.value}/>
                        <Panel bsStyle="info">
                            <ChartController data={Object.assign(...data)}/>
                        </Panel>
                    </div>
                );
            } else {
                return <AnalysisNavigator params={this.props.params} data={this.props.data.value}/>;
            }
        }
    }
}

export default connect(props => ({
    data: props.sourceURL
}))(Analysis);

// TODO move series into the URL
// TODO allow user to add additional measurements to compare against