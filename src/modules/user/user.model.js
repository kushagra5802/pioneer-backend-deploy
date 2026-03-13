const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
    alternativeEmail: {
        type: String,
        lowercase: true,
        validate: {
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,5})+$/.test(v);
            },
            message: "Please enter a valid email" //custom error message
        }
    },
    password: {
        type: String,
        minlength: 8,
        maxlength: 200
    },
    role: {
        type: String,
        enum: ['admin', 'superadmin', 'clientManager', 'accounts']
    },
    resetPasswordToken: {
        type: String,
        expireAfterSeconds: 3600,
        default: null
    },
    lastpasswordchangedate: {
        type: Date,
        default: new Date() + 7 * 24 * 60 * 60 * 1000
    },
    phone: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 12
    },
    userstatus: {
        type: String,
        enum: ['active', 'suspended'],
        default: "active"
    },
    profileImageLink: {
        type: {},
    },
    userPassword: {
        type: String
    },
    bio: {
        type: String
    },
    otpObject: {
        otp: { type: String },
        createdAt: { type: Date }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)