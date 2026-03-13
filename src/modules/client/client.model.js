const mongoose = require("mongoose");

const client = mongoose.Schema({
    organisationName: {
        type: String
    },
    prefix:
        {
            type: String,
            enum: ['Mr.', 'Mrs.', 'Ms.'],
            default: 'Mr.',
            required: true,
        },
    adminFirstName: {
        required: true,
        type: String,
        minlength: [2, 'First Name is too short!'], //custom error message
        maxlength: 50
    },
    adminLastName: {
        required: true,
        type: String,
        minlength: [2, 'Last Name is too short!'], //custom error message
        maxlength: 50
    },
    adminEmail: {
        required: true,
        type: String,
        lowercase: true,
        validate: {
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,5})+$/.test(v);
            },
            message: "Please enter a valid email" //custom error message
        },
        required: [true, "Email required"] //custom error message
    },
    adminContact: {
        unique: true,
        type: String,
        required: true,
        minlength: 10,
        maxlength: 12
    },
    planDuration: {
        type: String,
        enum: ['quarterly', 'half_yearly', 'yearly'],
        default: 'yearly',
        required: true,
    },
    planAmount: {
        type: String,
        required: true,
    },
    office: [],
    // planType: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true
    // },
    planType: [],
    validityStart: {
        type: Date
    },
    validityEnd: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'deactivate', 'deleted'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['client', 'chief_of_staff'],
        default: 'client'
    },
    users: [],
    clientPassword: {
        type: String
    },
    customClientId: {
        type: Number,
        unique: true,
        sparse: true 
    },
    categoryIds:{
        type:[mongoose.Schema.Types.ObjectId]
    },
    autoAssignAccess:{
        type:Boolean,
        default:false
    },
    medicalCamp:{
        type:Boolean,
        default:false
    },
    gmsAnalytics:{
        type:Boolean,
        default:false
    },
    urbanRural:{
        type:String,
        enum: ['Urban', 'Rural'],
    },
    powerBiLinks: [{
        // type: mongoose.Schema.Types.ObjectId,
        // ref: 'PowerBi',
    }]
}, {
    timestamps: true
})

module.exports = mongoose.model('Client', client);
