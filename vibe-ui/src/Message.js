import React, {Component} from "react";
import {Panel} from "react-bootstrap";

class Message extends Component {
    render() {
        let title = this.props.title ? this.props.title : "Info";
        return (
            <Panel header={title} bsStyle={this.props.type}>
                {this.props.message}
            </Panel>
        );
    }
}

export default Message;