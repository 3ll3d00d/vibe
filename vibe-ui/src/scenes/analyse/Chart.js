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
    defaultColours = {
        x: [
            '#00ff00',
            '#009900',
            '#99ff99',
            '#ccffcc',
            '#006600',
            '#004c00',
        ],
        y: [
            '#ff0000',
            '#990000',
            '#ff6666',
            '#ff9999',
            '#660000',
            '#4c0000',
        ],
        z: [
            '#0000ff',
            '#000099',
            '#4c4cff',
            '#7f7fff',
            '#000066',
            '#00004c',
        ],
        sum: [
            '#ff00ff',
            '#990099',
            '#ff66ff',
            '#ff99ff',
            '#660066',
            '#4c004c',
        ],
        unknown: [
            '#000000',
            '#323232',
            '#4c4c4c',
            '#666666',
            '#7f7f7f',
            '#cccccc'
        ]
    };

    constructor(props) {
        super(props);
        this.state = {height: window.innerHeight - (235+(this.props.pathCount*33))};
    }

    updateHeight() {
        this.setState({height: window.innerHeight - (235+(this.props.pathCount*33))});
    }

    componentDidMount() {
        this.updateHeight();
        window.addEventListener("resize", this.updateHeight.bind(this));
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.updateHeight.bind(this));
    }

    // credit to https://www.paulirish.com/2009/random-hex-color-code-snippets/
    generateRandomColour() {
        return '#' + ~~(Math.random() * (1 << 24)).toString(16);
    }

    render() {
        const series = this.props.series.map((s) => {
            let colour;
            if (this.defaultColours[s.series]) {
                if (s.seriesIdx < this.defaultColours[s.series].length) {
                    colour = this.defaultColours[s.series][s.seriesIdx];
                }
            } else {
                if (s.seriesIdx < this.defaultColours.unknown.length) {
                    colour = this.defaultColours.unknown[s.seriesIdx];
                }
            }
            if (!colour) colour = this.generateRandomColour();
            return <Scatter key={s} legendType='line' name={s.id + '/' + s.series} data={s.xyz} fill={colour}
                            line={{stroke: colour, strokeWidth: 1}}/>
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
