import React, {Component} from "react";
import PropTypes from "prop-types";
import {Card} from "react-bootstrap";

class Message extends Component {
    static propTypes = {
        title: PropTypes.string,
        type: PropTypes.string,
        message: PropTypes.string
    };

    render() {
        let title = this.props.title ? this.props.title : "Info";
        return (
            <Card>
                <Card.Header as={'h6'} className={`bg-${this.props.type}`}>{title}</Card.Header>
                {this.props.message}
            </Card>
        );
    }
}

export default Message;