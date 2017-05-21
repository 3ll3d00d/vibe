import NumericInput from "react-numeric-input";
import React, {Component} from "react";

export default class PreciseIntNumericInput extends Component {

    round = (number) => {
        return Math.round(number);
    };

    render() {
        return (
            <NumericInput step={1}
                          precision={12}
                          value={this.props.value}
                          format={this.round}
                          onChange={this.props.handler}
                          className="form-control"
                          style={false}/> // eslint-disable-line react/style-prop-object
        );
    }
}