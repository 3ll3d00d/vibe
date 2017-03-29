import React, {Component, PropTypes} from "react";
import {Button, ButtonGroup, ControlLabel, FormControl, FormGroup, Well} from "react-bootstrap";
import {connect} from "react-refetch";

class CreateTarget extends Component {
    static propTypes = {
        previewFunc: PropTypes.func.isRequired
    };

    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {name: '', hinge: ''};
        this.handleSubmit.bind(this);
        this.handleHinge.bind(this);
        this.handleName.bind(this);
    }

    handleSubmit = (event) => {
        this.props.previewFunc(null);
        this.props.createTarget(this.createTargetPayload());
        event.preventDefault();
    };

    createTargetPayload() {
        return {name: this.state.name, hinge: this.asHingePoints()};
    }

    handleName = (event) => {
        const value = event.target.value;
        this.setState((previousState, props) => {
            return {name: value}
        });
    };

    handleHinge = (event) => {
        const value = event.target.value;
        this.setState((previousState, props) => {
            return {hinge: value}
        });
    };

    isNotNumeric(hingePoint) {
        const h1 = hingePoint[0].trim();
        const h2 = hingePoint[1].trim();
        // TODO this doens't really work
        return (h1.length === 0 || h2.length === 0) || (Number.isNaN(h1) || Number.isNaN(h2))
    }

    isValidHinge(hingePoints) {
        if (hingePoints.length > 1) {
            const invalidHingePoints = hingePoints.filter(p => (p.length !== 2 || this.isNotNumeric(p)));
            return invalidHingePoints && invalidHingePoints.length === 0;
        }
        return false;
    }

    getHingeValidationState() {
        if (this.state.hinge) {
            const hingePoints = this.asHingePoints();
            if (hingePoints) {
                return this.isValidHinge(hingePoints) ? "success" : "error";
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    asHingePoints() {
        return this.state.hinge.split('\n').filter(p => p.length > 0).map(l => l.split(' '));
    }

    getSubmitButtons(validationState) {
        if (validationState === 'success' && this.state.name.length > 0) {
            return (
                <ButtonGroup>
                    <Button onClick={() => this.props.previewFunc(this.createTargetPayload())}>Preview</Button>
                    <Button type="submit">Add</Button>
                </ButtonGroup>
            );
        } else {
            return (
                <ButtonGroup>
                    <Button disabled>Preview</Button>
                    <Button disabled type="submit">Add</Button>
                </ButtonGroup>
            );
        }
    }

    render() {
        const validationState = this.getHingeValidationState();
        return (
            <Well>
                <form onSubmit={this.handleSubmit}>
                    <FormGroup>
                        <FormGroup controlId="name">
                            <ControlLabel>Name</ControlLabel>
                            <FormControl type="text"
                                         value={this.state.name}
                                         onChange={this.handleName}/>
                        </FormGroup>
                        <FormGroup controlId="details" validationState={validationState}>
                            <ControlLabel>Hinge Points</ControlLabel>
                            <FormControl componentClass="textarea"
                                         value={this.state.hinge}
                                         onChange={this.handleHinge}
                                         placeholder="Enter a set of hinge points&#10;Use dB<space>frequency format such as&#10;0 20&#10;5 40&#10;5 80&#10;4 120"/>
                        </FormGroup>
                    </FormGroup>
                    {this.getSubmitButtons(validationState)}
                </form>
            </Well>
        );
    }
}

export default connect((props, context) => ({
    createTarget: target => ({
        createTargetResponse: {
            url: `${context.apiPrefix}/targets/${target.name}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(target)
        }
    })
}))(CreateTarget);
