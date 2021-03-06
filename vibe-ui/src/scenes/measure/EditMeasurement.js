import React, {PureComponent} from "react";
import {Button, Card, Form, FormControl, FormGroup, FormLabel, Modal} from "react-bootstrap";
import PropTypes from "prop-types";
import FontAwesome from "react-fontawesome";
import {connect} from "react-refetch";
import {API_PREFIX} from "../../App";

class EditMeasurement extends PureComponent {
    static propTypes = {
        selected: PropTypes.object,
        clearEditFunc: PropTypes.func.isRequired
    };

    makeEmptyState = () => {
        return {
            name: '',
            description: '',
            start: 0,
            end: 0,
            maxEnd: 0,
            showModal: false
        };
    };

    state = this.makeEmptyState();

    initState(props, onInit) {
        if (onInit) {
            if (props.selected) {
                return this.makeSelectedState(props);
            } else {
                return this.makeEmptyState();
            }
        } else {
            if (props.selected) {
                if (props.selected.name !== this.state.name || !this.state.showModal) {
                    return this.makeSelectedState(props);
                } else {
                    return this.state;
                }
            } else {
                return {showModal: false};
            }
        }
    }


    makeSelectedState = (props) => {
        let state = {
            name: props.selected.name,
            description: props.selected.description ? props.selected.description : '',
            start: 0,
            end: props.selected.duration,
            maxEnd: props.selected.duration,
            showModal: true,
        };
        let devices = Object.keys(props.selected.recordingDevices).map(k => {return {[k]: k}});
        return Object.assign(state, ...devices);
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.selected && !nextProps.selected) {
            this.setState(this.makeEmptyState());
        } else if (!this.props.selected && nextProps.selected) {
            this.setState(this.makeSelectedState(nextProps));
        } else if (this.props.selected && nextProps.selected) {

        }
    }

    getFs() {
        return this.props.selected ? this.props.selected.fs : 1;
    }

    handleName = (event) => {
        this.setState({name: event.target.value});
    };

    handleDescription = (event) => {
        this.setState({description: event.target.value});
    };

    handleStart = (event) => {
        this.setState({start: event.target.value});
    };

    handleEnd = (event) => {
        this.setState({end: event.target.value});
    };

    handleDevice = (device) => (event) => {
        this.setState({[device]: event.target.value});
    };

    handleSubmit = (event) => {
        const edit = this.createEdit();
        if (Object.keys(edit).length > 0) {
            this.props.submitEdit(Object.assign(edit, { id: this.props.selected.id }));
        } else {
            // nop
        }
        event.preventDefault();
    };

    createEdit() {
        let edit = {};
        if (this.props.selected) {
            if (this.state.name !== this.props.selected.name) {
                edit = Object.assign(edit, {name: this.state.name});
            }
            if (this.state.description === '' && this.props.selected.description === null) {
                // ignore
            } else if (this.state.description !== this.props.selected.description) {
                edit = Object.assign(edit, {description: this.state.description});
            }
            const devices = !this.props.selected ? null : Object.keys(this.props.selected.recordingDevices);
            if (devices) {
                const renames = devices.map(d => [d, this.state[d]]).filter(d => d[0] !== d[1]);
                if (renames.length > 0) {
                    edit = Object.assign(edit, {devices: renames});
                }
            }
            if (this.state.start !== 0 && this.state.start !== "0") {
                edit = Object.assign(edit, {start: this.state.start});
            }
            if (this.state.end !== this.props.selected.duration && this.state.end !== String(this.props.selected.duration)) {
                edit = Object.assign(edit, {end: this.state.end});
            }
        }
        return edit;
    }

    getSubmitButton() {
        const responseKey = this.props.selected && Object.keys(this.props).find(p => p === `submitEditResponse_${this.props.selected.id}`);
        if (responseKey) {
            const response = this.props[responseKey];
            if (response.pending) {
                return <Button variant="warning"><FontAwesome name="spinner" spin/> Updating</Button>;
            } else if (response.rejected) {
                return (
                    <Button variant="danger" disabled>Failed - {response.reason}
                        <FontAwesome name="exclamation-triangle"/>
                    </Button>
                );
            } else if (response.fulfilled) {
                return <Button variant="success" disabled><FontAwesome name="check"/>Updated</Button>;
            }
        } else {
            return (
                <Button type="submit" onClick={this.handleSubmit} disabled={Object.keys(this.createEdit()).length === 0}>
                    <FontAwesome name="play"/>&nbsp;Update
                </Button>
            );
        }
    }

    ignoreSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    render() {
        const deviceRenames = !this.props.selected ? null : Object.keys(this.props.selected.recordingDevices).map(d => {
            return (
                <FormGroup key={d} controlId={d}>
                    <FormLabel>Rename {d} to: </FormLabel>
                    {' '}
                    <FormControl type="text" value={this.state[d]} onChange={this.handleDevice(d)}/>
                </FormGroup>
            );
        });
        return (
            <Modal show={this.state.showModal} onHide={this.props.clearEditFunc}>
                <Modal.Header>
                    <Modal.Title>Edit Measurement</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Card bg="light">
                        <Form onSubmit={this.ignoreSubmit}>
                            <FormGroup controlId="name">
                                <FormLabel>Name: </FormLabel>
                                {' '}
                                <FormControl type="text" value={this.state.name} onChange={this.handleName}/>
                            </FormGroup>
                            <FormGroup controlId="desc">
                                <FormLabel>Description: </FormLabel>
                                {' '}
                                <FormControl as="textarea" value={this.state.description}
                                             onChange={this.handleDescription}/>
                            </FormGroup>
                            <FormGroup controlId="start">
                                <FormLabel>Start: </FormLabel>
                                {' '}
                                <FormControl type="number" min="0" max={this.state.end - (1 / this.getFs())}
                                             step={1 / this.getFs()}
                                             value={this.state.start} onChange={this.handleStart}/>
                            </FormGroup>
                            <FormGroup controlId="end">
                                <FormLabel>End: </FormLabel>
                                {' '}
                                <FormControl type="number" min={1 / this.getFs()} max={this.state.maxEnd}
                                             step={1 / this.getFs()}
                                             value={this.state.end} onChange={this.handleEnd}/>
                            </FormGroup>
                            {deviceRenames}
                            {this.getSubmitButton()}
                        </Form>
                    </Card>
                </Modal.Body>
            </Modal>
        );
    }
}

export default connect((props) => ( {
    submitEdit: (edit) => ({
        [`submitEditResponse_${edit.id}`]: {
            url: `${API_PREFIX}/measurements/${edit.id}`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(edit)
        }
    })
} ))(EditMeasurement)