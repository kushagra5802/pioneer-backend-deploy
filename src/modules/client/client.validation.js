const { check } = require('express-validator');

const clientDataValidation = [
    check('headOffice').not().isEmpty()
        .withMessage('headOffice is required.'),
    check("headOffice.location").not().isEmpty()
        .withMessage('HeadOffice Location is required'),
    check("headOffice.contactNumber").not().isEmpty()
        .withMessage('HeadOffice ContactNumber is required'),
    check("headOffice.email").not().isEmpty()
    .withMessage('HeadOffice Email required.')
    .isEmail().withMessage('Not an email')
    .isLength({ min: 10, max: 100 })
    .withMessage('Email length should be 10 to 100 characters'),
    check('prefix').not().isEmpty()
    .withMessage('Prefix is required.'),
    check('adminFirstName').not().isEmpty()
        .withMessage('adminFirstName is required.'),

    check('adminLastName').not().isEmpty()
        .withMessage('adminLastName is required.'),

    check('adminEmail').not().isEmpty()
        .withMessage('adminEmail required.')
        .isEmail().withMessage('Not an email')
        .isLength({ min: 10, max: 100 })
        .withMessage('Email length should be 10 to 100 characters'),


    check('adminContact').not().isEmpty()
        .withMessage('adminContact number required.')
        .isLength({ min: 10, max: 10 })
        .withMessage('Phone number length should contains 10 digits'),
    
    check('planType').not().isEmpty()
        .withMessage('planType is required.'),

    check('validityStart').not().isEmpty()
        .withMessage('validityStart is required.'),
];

module.exports = clientDataValidation;