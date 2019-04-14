import React, {Component} from "react";
import PropTypes from "prop-types";
import {SketchPicker} from 'react-color';
import {Tab, Tabs} from "react-bootstrap";

export default class StylePicker extends Component {
    static propTypes = {
        namedColours: PropTypes.object.isRequired,
        selectColour: PropTypes.func.isRequired
    };

    state = {
        active: this.props.namedColours.findKey(() => true)
    };

    activate = (key) => {
        this.setState({active: key});
    };

    render() {
        return (
            <Tabs activeKey={this.state.active}
                  transition={false}
                  onSelect={this.activate}
                  id="colour-picker"
                  className={'p-3'}
                  variant={'pills'}>
                {
                    this.props.namedColours.map((v, k) => {
                        return (
                            <Tab eventKey={k} title={k} key={k}>
                                <SketchPicker color={v}
                                              onChangeComplete={(colour) => this.props.selectColour(k, colour.rgb)}/>
                            </Tab>
                        );
                    }).toList().toJS()
                }
            </Tabs>
        );
    }
}