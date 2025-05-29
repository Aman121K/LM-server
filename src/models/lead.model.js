const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    emailId: {
        type: String,
        trim: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    callStatus: {
        type: String,
        default: ''
    },
    postingDate: {
        type: Date,
        default: Date.now
    },
    followup: {
        type: Date,
        required: true
    },
    remarks: {
        type: String,
        trim: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    unitType: {
        type: String,
        required: true
    },
    budget: {
        type: String,
        required: true
    },
    callBy: {
        type: String,
        required: true
    },
    submitOn: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema); 