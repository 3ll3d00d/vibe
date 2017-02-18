import React, {Component} from "react";
import {connect} from "react-refetch";
import Message from "./Message";
import ControllableChart from "./ControllableChart";

class Analysis extends Component {
    constructor(props) {
        super(props);
        this.state = {
            open: true
        }
    }

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
            // TODO repeat for each measurement available
            const input = this.props.data.value.mpu6050.spectrum;
            // TODO do this dynamically based on the available datasets
            const x = this.extractSeries(input.x);
            const y = this.extractSeries(input.y);
            const z = this.extractSeries(input.z);
            const data = {x: x, y: y, z: z};
            return (
                <ControllableChart data={data} name="mpu6050 - spectrum"/>
            );
        }
    }
}

// TODO work out multiple charts, chart controller
export default connect(props => ({
    data: props.sourceURL
}))(Analysis);
