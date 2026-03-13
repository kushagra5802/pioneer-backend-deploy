const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const clientRoleSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
        minlength: [3, 'Name is too short!'], //custom error message
        maxlength: 50
    },
    label: {
        required: true,
        type: String,
        minlength: [3, 'label is too short!'], //custom error message
        maxlength: 50
    },
    level: {
        required: true,
        type: Number,
        minlength: 1
    },
    root_level: {
        required: true,
        type: Boolean,
    },
    constituency_level: {
        required: true,
        type: Boolean
    },
    office_level: {
        required: true,
        type: Boolean,
    }
})

module.exports = mongoose.model('ClientRole', clientRoleSchema)