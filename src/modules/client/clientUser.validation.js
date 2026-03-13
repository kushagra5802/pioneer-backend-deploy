const { check } = require('express-validator');

const clientUserDataValidation = 
    [
        check('prefix').not().isEmpty()
            .withMessage('Prefix is required.'),
        check('firstName').not().isEmpty()
            .withMessage('First Name required.')
            .isLength({ min: 2, max: 50 })
            .withMessage('First Name length should be 2 to 50 characters'),
        check('lastName').not().isEmpty()
            .withMessage('Last Name required.')
            .isLength({ min: 2, max: 50 })
            .withMessage('Last Name length should be 2 to 50 characters'),
        check('organisationId').not().isEmpty()
            .withMessage('OrganisationId is required.'),
        check('reportsTo').not().isEmpty()
            .withMessage('ReportsTo is required.'),
        check('email').not().isEmpty()
            .withMessage('Email required.')
            .isEmail().withMessage('Not an email')
            .isLength({ min: 10, max: 100 })
            .withMessage('Email length should be 10 to 100 characters'),
        check('phone').not().isEmpty()
            .withMessage('Phone number required.')
            .isLength({ min: 10, max: 10 })
            .withMessage('Phone number length should contains 10 digits'),
        check('password').not().isEmpty()
            .withMessage('Password required.')
            .isLength({ min: 3, max: 50 })
            .withMessage('Password length should be 8 to 200 characters'),
        check('role').not().isEmpty()
            .withMessage('role is required.'),
    ];

module.exports = clientUserDataValidation;