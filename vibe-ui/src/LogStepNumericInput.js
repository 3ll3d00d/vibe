import NumericInput from "react-numeric-input";
import React, {Component} from "react";

export default class LogStepNumericInput extends Component {

    constructor(props) {
        super(props);
        if (props.defaultPrecision) {
            this.state = {
                step: 10 ** -(props.defaultPrecision-1),
                precision: props.defaultPrecision
            };
        } else {
            const precision = this.calculatePrecision(this.props.value);
            this.state = {
                step: 10 ** -(precision),
                precision: precision
            };
        }
        this.handleStep = this.handleStep.bind(this);
    }

    calculatePrecision(val) {
        let precision = Math.floor(Math.log10(val));
        if (this.props.value < 1) {
            precision = -precision+1;
        }
        return precision;
    }

    handleStep = (valNum, valStr) => {
        const {step, precision} = this.state;
        // on the way down, the new value will always be zero (because down means -step and value=step)
        // so we need to recalculate the value to apply after we work out the new step
        if (valNum === 0) {
            if (valNum < this.props.value) {
                let newPrecision = precision;
                const newStep = step / 10;
                // if we go beyond the default precision then add another 0
                if (Math.abs(Math.log10(newStep)) > precision) newPrecision = precision + 1;
                valNum = this.props.value - newStep;
                this.setState({precision: newPrecision, step: newStep})
            }
        } else {
            // on the way up, leave precision as is and just recalculate the step
            const logOfVal = Math.log10(valNum);
            if (Number.isInteger(logOfVal)) {
                this.setState({step: 10 ** logOfVal});
            }
        }
        // pass the value up the chain to the parent
        this.props.handler(valNum);
    };

    round(number, precision) {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    }

    render() {
        return (
            <NumericInput step={this.state.step}
                          precision={this.state.precision}
                          value={this.round(this.props.value, this.state.precision)}
                          min={10e-12}
                          onChange={this.handleStep}
                          className="form-control"
                          style={false}/>
        );
    }
}