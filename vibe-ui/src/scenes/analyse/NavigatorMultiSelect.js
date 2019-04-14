import React, {Component} from "react";
import {NO_OPTION_SELECTED} from "../../constants";
import Select from 'react-select';

export default class NavigatorMultiSelect extends Component {

    makeValues() {
        return this.props.available.sort().map((s) => {
            return {value: s, label: s};
        });
    }

    isSelected(series) {
        return this.props.selected.split("-").includes(series);
    }

    handleChange = (values, action) => {
        const params = values.map(v => v.value).sort().join("-");
        // if we don't use a magic value for "no options selected" in the navigator then it defaults back to all
        // being selected, we could remove this if we stop defaulting to all measurements being selected (or treat
        // this event as an auto eject)
        if (params.length === 0) {
            this.props.navigate(NO_OPTION_SELECTED);
        } else {
            this.props.navigate(params);
        }
    };

    render() {
        const options = this.makeValues();
        if (this.props.available.length > 0) {
            return (
                <Select key={this.props.analyserId + '-e'}
                        options={options}
                        value={options.filter(({value}) => this.isSelected(value))}
                        isMulti
                        onChange={this.handleChange}
                        placeholder="Select 1 or more series"
                        ref="ms"/>
            );
        } else {
            return (
                <Select key={this.props.analyserId + '-d'}
                        options={options}
                        value={options.filter(({value}) => this.isSelected(value))}
                        disabled={true}
                        isMulti
                        onChange={this.handleChange}
                        placeholder="Series... "
                        ref="ms"/>
            );
        }
    }
}
