import React, {Component} from "react";
import PropTypes from "prop-types";
import ChartController from "../../components/chart/ChartController";

export default class Preview extends Component {
    static propTypes = {
        series: PropTypes.array.isRequired,
        loadedAt: PropTypes.number.isRequired
    };

    shouldComponentUpdate = (nextProps, nextState) => {
        // only rerender if we have some new data to show otherwise the automatically refreshing table data causes the
        // the chart to update every 1s ignoring the update button
        return this.props.loadedAt !== nextProps.loadedAt;
    };

    render() {
        const {series} = this.props;
        const range = {
            minX: series.map(k => k.minX).reduce((r, n) => Math.min(r,n), Number.MAX_SAFE_INTEGER),
            minY: series.map(k => k.minY).reduce((r, n) => Math.min(r,n), Number.MAX_SAFE_INTEGER),
            maxX: series.map(k => k.maxX).reduce((r, n) => Math.max(r,n), Number.MIN_SAFE_INTEGER),
            maxY: series.map(k => k.maxY).reduce((r, n) => Math.max(r,n), Number.MIN_SAFE_INTEGER)
        };
        return <ChartController range={range} series={series}/>;
    }
}