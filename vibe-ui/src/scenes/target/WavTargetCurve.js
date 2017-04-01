import React, {Component, PropTypes} from "react";
import {Panel} from "react-bootstrap";
import LineChart from "../../components/chart/LineChart";
import {getAnalysisChartConfig} from "../../components/chart/ConfigGenerator";

export default class WavTargetCurve extends Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        data: PropTypes.object.isRequired
    };

    render() {
        const {data, name} = this.props;
        const xRange = [Math.max(5, Math.round(data.minX)), Math.min(Math.round(data.maxX), 1000)];
        const config = getAnalysisChartConfig(xRange, [data.minY, data.maxY], true, false);
        const series = Object.assign(data, {
            id: name,
            series: '',
            seriesIdx: 1,
        });
        return (
            <Panel>
                <LineChart series={[series]} config={config}/>
            </Panel>
        );
    }
}