import React, {PureComponent} from "react";
import {
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis
} from "recharts";
import {format} from "d3-format";

export default class Chart extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {height: 600}
    }

    updateHeight() {
        this.setState({height: window.innerHeight - 250});
    }

    componentDidMount() {
        this.updateHeight();
        window.addEventListener("resize", this.updateHeight.bind(this));
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.updateHeight.bind(this));
    }

    render() {
        const defaultColours = {
            x: 'green',
            y: 'red',
            z: 'blue',
            sum: 'black'
        };
        const series = Object.keys(this.props.data).sort().map((s) => {
            const colour = defaultColours[s] || 'grey';
            return <Scatter key={s} legendType='line' name={s} data={this.props.data[s]} fill={colour} line/>
        });
        const zRange = this.props.config.showDots ? [20, 20] : [1, 1];
        let yFormat = null;
        if (this.props.config.y[0] < 0.001) {
            yFormat = format("0.0e");
        } else {
            yFormat = format("0.0g");
        }
        const xLinLog = this.props.config.xLog ? "log" : "linear";
        const yLinLog = this.props.config.yLog ? "log" : "linear";
        return (
            <ResponsiveContainer width="100%" minHeight={200} height={this.state.height}>
                <ScatterChart margin={{top: 20, right: 50, bottom: 5, left: 0}}>
                    {series}
                    <CartesianGrid />
                    <XAxis dataKey={'x'} scale={xLinLog} label='Freq'
                           allowDataOverflow={true}
                           domain={this.props.config.x}
                    />
                    <YAxis dataKey={'y'} scale={yLinLog}
                           allowDataOverflow={true}
                           domain={this.props.config.y}
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
