import React, {Component} from "react";
import MultiSelect from "react-bootstrap-multiselect";
import {NO_OPTION_SELECTED} from "../../constants";

export default class NavigatorMultiSelect extends Component {

    makeValues() {
        return this.props.available.sort().map((s) => {
            return {value: s, selected: this.isSelected(s)};
        });
    }

    isSelected(series) {
        return this.props.selected.split("-").includes(series);
    }

    handleChange = (element, checked) => {
        const selectedOption = element[0].value;
        let selected = this.props.selected.split("-");
        if (selected.length === 1 && selected[0] === "") {
            selected = [];
        }
        const idx = selected.indexOf(selectedOption);
        if (idx >= 0 && !checked) {
            selected.splice(idx, 1);
        } else if (idx < 0 && checked) {
            selected.push(selectedOption);
        }
        const params = selected.sort().join("-");
        // if we don't use a magic value for "no options selected" in the navigator then it defaults back to all
        // being selected, we could remove this if we stop defaulting to all measurements being selected (or treat
        // this event as an auto eject)
        if (selected.length === 0) {
            this.props.navigate(NO_OPTION_SELECTED);
        } else {
            this.props.navigate(params);
        }
    };

    render() {
        if (this.props.available.length > 0) {
            return (
                <MultiSelect key={this.props.analyserId + '-e'}
                             buttonClass={'btn btn-success'}
                             data={this.makeValues()}
                             multiple
                             onChange={this.handleChange}
                             nonSelectedText="Select 1 or more series"
                             allSelectedText="All"
                             // the component doesn't seem to update this correctly when the options change underneath it
                             // allSelectedText={this.props.available.split("-").join(", ")}
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
