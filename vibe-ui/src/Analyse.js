import React, {Component} from "react";
import Analysis from "./Analysis";
import AnalysisNavigator from "./AnalysisNavigator";

export default class Analyse extends Component {
    render() {
        if (this.props.params.measurementId) {
            return (
                <Analysis sourceURL={`/measurements/${this.props.params.measurementId}/analyse`}
                          params={this.props.params}/>
            );
        } else {
            return (
                <AnalysisNavigator params={this.props.params}/>
            )
        }
    }
}
