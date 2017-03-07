import React, {Component} from "react";
import MultiSelect from "react-bootstrap-multiselect";
import {NO_OPTION_SELECTED} from "../../constants";

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
            if (nextProps.selected === NO_OPTION_SELECTED) {
                this.setState({selected: ""});
            } else {
                this.setState({selected: nextProps.selected});
            }
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
            // if we don't use a magic value for "no options selected" in the navigator then it defaults back to all
            // being selected, we could remove this if we stop defaulting to all measurements being selected (or treat
            // this event as an auto eject)
            if (previous.length === 0) {
                this.props.navigate(NO_OPTION_SELECTED);
            } else {
                this.props.navigate(params);
            }
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
                <MultiSelect key={this.props.analyserId + '-e'}
                             buttonClass={`btn btn-${bsStyle}`}
                             data={this.makeValues()}
                             multiple
                             onChange={this.handleChange}
                             nonSelectedText="Select 1 or more series"
                             allSelectedText="All"
                             // the component doesn't seem to update this correctly when the options change underneath it
                             // allSelectedText={this.state.selected.split("-").join(", ")}
                             ref="ms" />
            );
        } else {
            return (
                <MultiSelect key={this.props.analyserId + '-d'}
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
