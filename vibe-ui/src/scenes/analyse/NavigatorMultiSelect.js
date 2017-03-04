import React, {Component} from "react";
import MultiSelect from "react-bootstrap-multiselect";

export default class NavigatorMultiSelect extends Component {
    constructor(props) {
        super(props);
        if (this.props.selected) {
            this.state = {selected: this.props.selected};
        } else {
            this.state = {selected: props.available.sort().join("-")};
        }
        this.handleChange.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.selected) {
            this.setState({selected: nextProps.selected});
        } else {
            this.setState({selected: nextProps.available.sort().join("-")});
        }
    }

    makeValues() {
        return this.props.available.sort().map((s) => {
            return {value: s, selected: this.isSelected(s)};
        });
    }

    isSelected(series) {
        return this.state.selected.split("-").includes(series);
    }

    handleChange = (element, checked) => {
        const selectedOption = element[0].value;
        this.setState((previousState, props) => {
            let previous = previousState.selected.split("-");
            if (previous.length === 1 && previous[0] === "") {
                previous = [];
            }
            const idx = previous.indexOf(selectedOption);
            if (idx >= 0 && !checked) {
                previous.splice(idx, 1);
            } else if (idx < 0 && checked) {
                previous.push(selectedOption);
            }
            const params = previous.sort().join("-");
            this.props.navigate(params);
            return {selected: params};
        });
    };

    render() {
        let bsStyle = "warning";
        if (this.props.selected === this.state.selected) {
            bsStyle = "success";
        }
        if (this.props.available.length > 0) {
            return (
                <MultiSelect key="e"
                             buttonClass={`btn btn-${bsStyle}`}
                             data={this.makeValues()}
                             multiple
                             onChange={this.handleChange}
                             nonSelectedText="Select 1 or more series"
                             allSelectedText={this.state.selected.split("-").join(", ")}
                             ref="ms" />
            );
        } else {
            return (
                <MultiSelect key="d"
                             buttonClass={`btn`}
                             data={this.makeValues()}
                             disabled="true"
                             multiple
                             onChange={this.handleChange}
                             nonSelectedText="Series... "
                             ref="ms" />
            );
        }
    }
}
