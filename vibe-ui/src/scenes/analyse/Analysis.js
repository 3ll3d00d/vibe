import React, {Component} from "react";
import {Panel} from "react-bootstrap";
import ChartController from "./ChartController";

export default class Analysis extends Component {
    constructor(props) {
        super(props);
        this.state = {updateChartOnNavigatorChange: 1};
    }

    calculateRange() {
        return {
            minX: Math.min(...this.props.series.map(k => k.minX)),
            minY: Math.min(...this.props.series.map(k => k.minY)),
            maxX: Math.max(...this.props.series.map(k => k.maxX)),
            maxY: Math.max(...this.props.series.map(k => k.maxY))
        };
    }

    // componentWillReceiveProps(nextProps) {
    //     const {measurementId: nextMid, deviceId: nextDid, analyserId: nextAid, series: nextS} = nextProps.params;
    //     const {measurementId: thisMid, deviceId: thisDid, analyserId: thisAid, series: thisS} = this.props.params;
    //     if (nextMid && nextDid && nextAid && nextS && thisMid && thisDid && thisAid && thisS) {
    //         if (nextS !== thisS || nextAid !== thisAid) {
    //             this.setState((previousState, props) => {
    //                 return {updateChartOnNavigatorChange: (previousState.updateChartOnNavigatorChange + 1)};
    //             });
    //         }
    //     }
    // }

    render() {
        return (
            <Panel bsStyle="info">
                <ChartController range={this.calculateRange()}
                                 series={this.props.series}
                                 pathCount={this.props.pathCount}
                                 forceUpdate={this.state.updateChartOnNavigatorChange}/>
            </Panel>
        );
    }
}
