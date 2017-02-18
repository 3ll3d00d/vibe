import React, {PureComponent} from "react";
import {
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis
} from "recharts";

export default class Chart extends PureComponent {
    render() {
        // TODO add a measurement info box (or selector)
        // TODO add graph selector (or multiple boxes)
        // TODO add axis scale (range, lin/log)
        // TODO add data selector
        // colours (red, green, blue)
        const series = this.props.chartConfig.series.map((s) => {
            return <Scatter key={s} legendType='line' name={s} data={this.props.data[s]} line/>
        });
        return (
            <ResponsiveContainer width="100%" minHeight={600}>
                <ScatterChart margin={{top: 20, right: 80, bottom: 5, left: 50}}>
                    {series}
                    <CartesianGrid />
                    <XAxis dataKey={'x'} scale='log' label='Freq (Hz)'
                           allowDataOverflow={true}
                           domain={this.props.chartConfig.x}
                    />
                    <YAxis dataKey={'y'} scale='log'
                           allowDataOverflow={true}
                           domain={this.props.chartConfig.y}
                    />
                    <ZAxis dataKey={'z'} range={[1, 50]}/>
                    <Tooltip />
                    <Legend/>
                </ScatterChart>
            </ResponsiveContainer>
        )
    }
}
