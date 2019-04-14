import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, ButtonGroup, Card, FormControl, FormGroup, FormLabel} from "react-bootstrap";
import {connect} from "react-refetch";
import {API_PREFIX} from "../../App";

class CreateTarget extends Component {
    static propTypes = {
        previewFunc: PropTypes.func.isRequired
    };

    render() {
        return (
            <Card className={'p-2'}>
                <HingeSelector previewFunc={this.props.previewFunc} createTarget={this.props.createTarget}/>
            </Card>
        );
    }
}

class HingeSelector extends Component {

    state = {name: '', hinge: ''};

    handleSubmit = (event) => {
        this.props.previewFunc(null);
        this.props.createTarget(this.createTargetPayload());
        event.preventDefault();
    };

    createTargetPayload = () => {
        return {name: this.state.name, hinge: this.asHingePoints()};
    };

    handleName = (event) => {
        const value = event.target.value;
        this.setState({name: value});
    };

    handleHinge = (event) => {
        const value = event.target.value;
        this.setState({hinge: value});
    };

    isInvalidNumericData = (hingePoint) => {
        const h1 = hingePoint[0].trim();
        const h2 = hingePoint[1].trim();
        // TODO this is a bit of a hack
        return ((h1.length === 0 || h2.length === 0) || (Number.isNaN(h1) || Number.isNaN(h2))) || h2 <= 0 || h2 >= 500;
    };

    isValidHinge = (hingePoints) => {
        if (hingePoints.length > 1) {
            const invalidHingePoints = hingePoints.filter(p => (p.length !== 2 || this.isInvalidNumericData(p)));
            if (invalidHingePoints && invalidHingePoints.length === 0) {
                const freqs = hingePoints.map(h => h[1]);
                const sortedFreqs = freqs.slice();
                sortedFreqs.sort((a,b) => a - b);
                return sortedFreqs.every((element, index, array) => freqs[index] === element);
            }
        }
        return false;
    };

    getHingeValidationState = () => {
        if (this.state.hinge) {
            const hingePoints = this.asHingePoints();
            if (hingePoints) {
                return this.isValidHinge(hingePoints);
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    asHingePoints = () => {
        return this.state.hinge.split('\n').filter(p => p.length > 0).map(l => l.split(' '));
    };

    getSubmitButtons = validationState => {
        if (validationState && this.state.name.length > 0) {
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
    };

    render() {
        const validationState = this.getHingeValidationState();
        const isValid = validationState !== null ? {isValid: validationState} : {};
        return (
            <form onSubmit={this.handleSubmit}>
                <FormGroup>
                    <FormGroup controlId="name">
                        <FormLabel>Name</FormLabel>
                        <FormControl type="text"
                                     value={this.state.name}
                                     onChange={this.handleName}/>
                    </FormGroup>
                    <FormGroup controlId="details">
                        <FormLabel>Hinge Points</FormLabel>
                        <FormControl as="textarea"
                                     value={this.state.hinge}
                                     onChange={this.handleHinge}
                                     rows={ 8 }
                                     placeholder="Enter a set of hinge points in dB<space>frequency format &#10;where 0 &lt; freq &lt; 500 e.g.&#10;4 1&#10;1 4&#10;1 8&#10;6 80"
                                     {...isValid}/>
                    </FormGroup>
                </FormGroup>
                {this.getSubmitButtons(validationState)}
            </form>
        );
    }
}

export default connect((props) => ({
    createTarget: target => ({
        createTargetResponse: {
            url: `${API_PREFIX}/targets/${target.name}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(target)
        }
    })
}))(CreateTarget);
