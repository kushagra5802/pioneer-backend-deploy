const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

//sub-document: office
const clientOfficeSchema = new mongoose.Schema({
    officeName: {
        required: true,
        type: String,
    },
    organizationID: {
        type: ObjectId,
    },
    constituencyID: {
        type: ObjectId,
    },
    constituencyName: {
        required: false,
        type: String,
        minlength: [3, 'Name is too short!'], //custom error message
        maxlength: 50
    },
    officeLocation: {
        required: true,
        type: String,
        minlength: [3, 'address is too short!'], //custom error message
        maxlength: 50
    },
    planType: [],
    // planType: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true
    // },
    planStart: {
        type: Date
    },
    planEnd: {
        type: Date
    },
},{
    timestamps: true
})

module.exports = mongoose.model('ClientOffice', clientOfficeSchema);