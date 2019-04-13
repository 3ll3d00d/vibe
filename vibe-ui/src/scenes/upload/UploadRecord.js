import React from "react";
import {ProgressBar} from "react-bootstrap";
import {List, Map} from "immutable";
import FontAwesome from "react-fontawesome";

export default class UploadRecord {
    constructor(file, chunkCount) {
        this.name = file.name;
        this.size = file.size;
        this.startTime = Date.now();
        this.endTime = 0;
        this.chunkCount = chunkCount;
        this.progress = new Map();
        this.statusCodes = new Map();
        this.errors = new List();
        this.elapsedTime = 0;
        this.uploadSpeed = 0;
        this.mergeState = null;
    }

    completeChunk = (idx, statusCode) => {
        this.statusCodes = this.statusCodes.set(idx, statusCode);
        this.endTime = Date.now();
    };

    failChunk = (idx, statusCode, text) => {
        this.statusCodes = this.statusCodes.set(idx, statusCode);
        this.errors = this.errors.push(text);
        this.endTime = Date.now();
    };

    completeMerge = () => {
        this.mergeState = 200;
    };

    failMerge = (error) => {
        this.mergeState = error;
    };

    isComplete = () => {
        return this.allChunksComplete() && this.mergeState !== null;
    };

    allChunksComplete = () => {
        return this.statusCodes.size === this.chunkCount;
    };

    allChunksSuccessful = () => {
        return this.allChunksComplete() && this.statusCodes.every(s => s === 200);
    };

    isSuccess = () => {
        return this.allChunksSuccessful() && this.mergeState === 200;
    };

    isFail = () => {
        return this.isComplete() && (this.statusCodes.valueSeq().some(s => s !== 200) || this.mergeState !== 200);
    };

    updateChunkProgress = (idx, totalInBytes) => {
        this.progress = this.progress.set(idx, totalInBytes);
    };

    updateCachedRate = () => {
        let elapsedTimeMillis = (this.endTime > 0 ? this.endTime : Date.now()) - this.startTime;
        if ((elapsedTimeMillis - this.elapsedTime) > 50) { // ~20Hz refresh rate
            this.elapsedTime = elapsedTimeMillis;
            const mbUploaded = this.getTotalBytesUploaded() / 1000000;
            const elapsedTimeSeconds = this.elapsedTime / 1000;
            const rate = mbUploaded / elapsedTimeSeconds;
            this.uploadSpeed = Math.round(rate * 100) / 100;
        }
    };

    getElapsedTimeMillis = () => {
        return this.elapsedTime;
    };

    getStatus = () => {
        if (this.isSuccess()) {
            return <FontAwesome name="check" size="lg"/>;
        } else if (this.isFail()) {
            return <FontAwesome name="times" size="lg"/>;
        } else if (this.progress.valueSeq().reduce((a, b) => a + b, 0)) {
            return <FontAwesome name="spinner" size="lg" spin/>;
        } else {
            return <FontAwesome name="question" size="lg"/>;
        }
    };

    getProgress = () => {
        let totalBytesUploaded = this.getTotalBytesUploaded();
        let percentComplete = (totalBytesUploaded / this.size) * 100;
        if (this.progress.size > 0) {
            return <ProgressBar variant="success" now={percentComplete} key={1}/>
        }
        return null;
    };

    getTotalBytesUploaded() {
        return this.progress.valueSeq().reduce((a, b) => a + b, 0);
    }

    getUploadSpeed = () => {
        return this.uploadSpeed;
    };

    asRow = () => {
        this.updateCachedRate();
        return (
            <tr key={this.name}>
                <td>{this.getStatus()}</td>
                <td>{this.name}</td>
                <td>{Math.round(this.size / 1000) / 1000}</td>
                <td>{this.getProgress()}</td>
                <td>{this.getElapsedTimeMillis() / 1000}</td>
                <td>{this.getUploadSpeed()}</td>
                <td>{[...new Set(this.errors)].sort().join("|")}</td>
            </tr>
        );
    };
}

