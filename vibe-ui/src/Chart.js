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
import {format} from "d3-format";

export default class Chart extends PureComponent {
    constructor(props) {
        super(props);
        this.state = { height: 600 }
    }

    updateHeight() {
        this.setState({ height: window.innerHeight-250});
    }

    componentDidMount() {
        this.updateHeight();
        window.addEventListener("resize", this.updateHeight.bind(this));
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.updateHeight().bind(this));
    }

    render() {
        const defaultColours = {
            x: 'green',
            y: 'red',
            z: 'blue',
            sum: 'black'
        };
        const series = this.props.chartConfig.series.map((s) => {
            const colour = defaultColours[s] || 'grey';
            return <Scatter key={s} legendType='line' name={s} data={this.props.data[s]} fill={colour} line/>
        });
        const zRange = this.props.chartConfig.showDots ? [20, 20] : [1, 1];
        const yFormat = format(",.1g");
        const xLinLog = this.props.chartConfig.xLog ? "log" : "linear";
        const yLinLog = this.props.chartConfig.yLog ? "log" : "linear";
        return (
            <ResponsiveContainer width="100%" minHeight={200} height={this.state.height}>
                <ScatterChart margin={{top: 20, right: 50, bottom: 5, left: 0}}>
                    {series}
                    <CartesianGrid />
                    <XAxis dataKey={'x'} scale={xLinLog} label='Freq'
                           allowDataOverflow={true}
                           domain={this.props.chartConfig.x}
                    />
                    <YAxis dataKey={'y'} scale={yLinLog}
                           allowDataOverflow={true}
                           domain={this.props.chartConfig.y}
                           tickFormatter={yFormat}
                    />
                    <ZAxis dataKey={'z'} range={zRange} fillOpacity={0.10}/>
                    <Tooltip />
                    <Legend/>
                </ScatterChart>
            </ResponsiveContainer>
        )
    }
}
