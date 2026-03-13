const mongoose = require('mongoose');
// const clientOfficeSchema = require('./clientOffice.model');

const ObjectId = mongoose.Schema.Types.ObjectId;

const clientUserSchema = new mongoose.Schema({
    prefix:
        {
            type: String,
            enum: ['Mr.', 'Mrs.', 'Ms.'],
            default: 'Mr.',
            required: true,
        },
    
    firstName: {
        required: true,
        type: String,
        minlength: [2, 'First Name is too short!'], //custom error message
        maxlength: 50
    },
    lastName: {
        required: true,
        type: String,
        minlength: [2, 'Last Name is too short!'], //custom error message
        maxlength: 50
    },
    organisationId:{
       type: mongoose.Schema.Types.ObjectId
    },
    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClientOffice", 
    },
    constituencyId:{
        type: mongoose.Schema.Types.ObjectId
    },
    email: {
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
    phone: {
        unique: true,
        required: true,
        type: Number,
        minlength: [10, 'Phone number is too short!'], //custom error message
        maxlength: 12
    },
    password: {
        required: true,
        type: String,
        minlength: 8,
        maxlength: 200
    },
    lastpasswordchangedate: {
        type: Date,
        default: new Date() + 7*24*60*60*1000
    },
    resetPasswordToken: {
        type: String,
        expireAfterSeconds: 3600,
        default: null
    },
    role: {
        type: String,
        enum: ['client', 'constituency_manager', 'cadre', 'office_manager','data_entry_operator', 'chief_of_staff']
    },
    department: {
        type: String
    },
    // office: [office],
    status: {
        type: String,
        enum: ['active', 'deactivate', 'deleted'],
        default: 'active'
    },
    subscription: [],
    // subscription: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true
    // },
    validityStart: {
        type: Date
    },
    validityEnd: {
        type: Date
    },
    profileImageLink: {
        type: {}
    },
    planDuration: {
        type: String,
        enum: ['quarterly', 'half_yearly', 'yearly'],
        default: 'yearly',
        required: true,
    },
    planAmount: {
        type: String,
        // required: true,
    },
    clientPassword: {
        type: String
    },
    bio: {
        type: String
    },
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId
    },
    otpObject: {
        otp: { type: String },
        createdAt: { type: Date }
    },
    customClientId: {
        type: Number,
        unique: true,
        sparse: true,  // Optional but useful to allow nulls without unique constraint errors
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
    surveyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SurveyData",
    },
    urbanRural:{
        type:String,
        enum: ['Urban', 'Rural'],
    },
    additionalComments:{
        type:String
    },
    powerBiLinks: [{
        // type: mongoose.Schema.Types.ObjectId,
        // ref: 'PowerBi',
    }],
    isFavourite:{
      type:Boolean,
      default:false,
      required: false
    }
},{
    timestamps: true
})

module.exports = mongoose.model('ClientUser', clientUserSchema)