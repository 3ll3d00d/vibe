import React, {Component} from "react";
import ChartController from "./ChartController";
import {Panel} from "react-bootstrap";

export default class ControllableChart extends Component {
    constructor(props) {
        super(props);
        this.state = { open: true };
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick = () => {
        this.setState({open: !this.state.open});
    };

    render() {
        // need a btton in the panel until https://github.com/react-bootstrap/react-bootstrap/pull/1769 is merged
        //  onClick={this.handleClick}
        return (
            <Panel header={this.props.name} bsStyle="info" eventKey="1" expanded={this.state.open} collapsible>
                <ChartController data={this.props.data}/>
            </Panel>
        );
    }
}

