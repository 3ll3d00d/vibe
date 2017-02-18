import React, {Component} from "react";
import Analysis from "./Analysis";

export default class Analyse extends Component {
    render() {
        if (this.props.params.measurementId) {
            return (
                <Analysis sourceURL={`/measurements/${this.props.params.measurementId}/analyse`}/>
            );
        } else {
            return (
                <div>
                    Choose a measurement
                </div>
            )
        }
    }
}

