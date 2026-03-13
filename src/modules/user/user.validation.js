const { check } = require('express-validator');


const userDataValidation = [
    check('firstName').not().isEmpty()
        .withMessage('First Name required.')
        .isLength({ min: 2, max: 50 })
        .withMessage('First Name length should be 2 to 50 characters'),
    check('lastName').not().isEmpty()
        .withMessage('Last Name required.')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last Name length should be 2 to 50 characters'),
    check('email').not().isEmpty()
        .withMessage('Email required.')
        .isEmail().withMessage('Not an email')
        .isLength({ min: 10, max: 100 })
        .withMessage('Email length should be 10 to 100 characters'),
    check('phone').not().isEmpty()
        .withMessage('Phone number required.')
        .isLength({ min: 10, max: 12 })
        .withMessage('Phone number length should be 10 to 12 number'),
    // check('password').not().isEmpty()
    //     .withMessage('Password required.')
    //     .isLength({ min: 3, max: 50 })
    //     .withMessage('Password length should be 8 to 200 characters'),
    check('role').not().isEmpty()
        .withMessage('Role required.')
        .isString()
        .withMessage("Role value must be a string"),
    // check('address').not().isEmpty()
    //     .withMessage('Address required.')
    //     .isString()
    //     .withMessage("Address value must be a string")
    //     .isLength({ min: 3, max: 200 })
    //     .withMessage('Address length should be 3 to 200 characters'),
    // check('city').not().isEmpty()
    //     .withMessage('City required.')
    //     .isString()
    //     .withMessage("City value must be a string")
    //     .isLength({ min: 3, max: 100 })
    //     .withMessage('City length should be 3 to 100 characters'),
    // check('state').not().isEmpty()
    //     .withMessage('State required.')
    //     .isString()
    //     .withMessage("state value must be a string")
    //     .isLength({ min: 3, max: 100 })
    //     .withMessage('State length should be 3 to 100 characters')
];

module.exports = userDataValidation;