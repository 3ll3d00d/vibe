import NumericInput from "react-numeric-input";
import React, {Component} from "react";
import PropTypes from "prop-types";

export default class PreciseIntNumericInput extends Component {

    static propTypes = {
        step: PropTypes.number,
        precision: PropTypes.number,
        value: PropTypes.number,
        handler: PropTypes.func.isRequired,
        format: PropTypes.func,
        min: PropTypes.number,
        max: PropTypes.number
    };

    defaultProps = {
        step: 1,
        precision: 12,
        format: this.round
    };

    round = (number) => {
        return Math.round(number);
    };

    render() {
        const {handler, ...rest} = this.props;
        return (
            <NumericInput {...rest}
                          onChange={handler}
                          className="form-control"
                          style={false}/> // eslint-disable-line react/style-prop-object
        );
    }
}