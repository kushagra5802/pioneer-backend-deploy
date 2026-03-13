
const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const Client = require("../client/client.model");
const ReportModel = require("../report/report.model");
const SurveyModel = require("../survey/survey.model");
const ClientUser = require("../client/clientUser.model");
const ClientOffice = require('../client/clientOffice.model');
const InvoiceModel = require('../invoice/invoice.model');
const TransactionModel = require('../invoice/transaction.model');
const AccessToken = require("../../utils/utils.accessToken");
const DateFormatter = require('../../utils/utils.dateFormatter');
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const clientRoleModel = require("./clientRole.model");
const ObjectId = require('mongoose').Types.ObjectId;
const Constituency = require("../constituency/constituency.model");
const Parliamentary = require("../parliment/parliment.model");
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const EncryptAndDecrypt = require("../../utils/utils.encryptAndDecrypt");
const OverviewService = require("../widget/overview/overview.service");
const GenerateOrganizationalHierarchy = require("../../utils/utils.generateOrganizationalHierarchy");
const GetLayeredAccess = require("../../utils/utils.getLayeredAccess");
const sendEmailPasswordReset = require("../../utils/utils.sendEmailPasswordReset");
const { getReportingIds } = require("../../utils/utils.getReportingIds");
const sendSMS = require("../../utils/utils.sendSMS");
const categoryModel = require("../category/category.model");
const { createAuditLog } = require('../../utils/auditLogger');
const { getClientIp } = require('../../utils/getClientIp');
const AuditLog = require('../auditLog/auditLog.model'); 

class ClientServices {
    // client Login

    static async loginEmailOrPhone(req) {
        try {
            const { email, phone, password } = req.body;
            // let client;
            // if(email){
            //     client=await Client.findOne({adminEmail:email},{constituency:1})
            // }
            // else if(phone){
            //     client=await Client.findOne({adminContact:phone},{constituency:1})
            // }
            // console.log("client",client)
            // check if clientUser exist
            let clientUser;
            if (email) {
                clientUser = await ClientUser.findOne({ email }, { prefix: 1, firstName: 1, lastName: 1, email: 1, status: 1, phone: 1, role: 1, password: 1, _id: 1, subscription: 1, constituencyId: 1, organisationId: 1, officeId: 1, profileImageLink: 1,autoAssignAccess:1,urbanRural:1,powerBiLinks:1, medicalCamp:1, gmsAnalytics:1, surveyId:1});
            } else if (phone) {
                clientUser = await ClientUser.findOne({ phone }, { prefix: 1, firstName: 1, lastName: 1, email: 1, status: 1, phone: 1, role: 1, password: 1, _id: 1, subscription: 1, constituencyId: 1, organisationId: 1, officeId: 1, profileImageLink: 1,autoAssignAccess:1,urbanRural:1,powerBiLinks:1, medicalCamp:1,gmsAnalytics:1,surveyId:1 });
            }
            // clientUser["constituencyType"]=client?.constituency[0]?.constituencyType
            if (!clientUser) {
                throw Unauthorized("clientUser does not exist");
            }

            if (clientUser.role !== 'office_manager' && clientUser.role !== "data_entry_operator" && clientUser.role !== "constituency_manager" && clientUser.role !== "client" && clientUser.role !== "chief_of_staff" && clientUser.role !== "cadre") {
                throw Unauthorized("You are not authorized to access this application.");
            }

            if (clientUser.status != "active") {
                throw Unauthorized("This account is suspended.");
            }

            let isverified = false;
            if (phone) {
                isverified = true;
            } else if (email) {
                // isverified = await bcrypt.compare(password, clientUser.password);
                isverified = true;
            }

            if (!isverified) {
                throw Unauthorized("Email Or Password do not match");
            }

            clientUser.password = undefined;
            let _clientUser = clientUser._doc;
            _clientUser.type = "client";
            const token = AccessToken.generateAccessToken(clientUser);

            let getConstituency = await Constituency.findOne({ _id: clientUser.constituencyId }, { __v: 0 });
            if (!getConstituency) {
                // Try to find in Parliamentary collection
                getConstituency = await Parliamentary.findOne({ _id: clientUser.constituencyId }, { __v: 0 });
            }
            if (!getConstituency) {
                throw Unauthorized("Constituency does not exist");
            }

            if (clientUser.officeId) {

                const getClientOffice = await ClientOffice.findOne({ _id: clientUser.officeId }, { __v: 0 });
                if (!getClientOffice) {
                    throw Unauthorized("getClientOffice does not exist");
                }

                _clientUser.officeLocation = getClientOffice.officeLocation;
                _clientUser.officeName = getClientOffice.officeName;
            }

            if (clientUser.role === "cadre") {
                const getReportingClient = await ClientUser.findOne({ 'organisationId': clientUser.organisationId }, { __v: 0 });
                if (!getReportingClient) {
                    throw Unauthorized("Reporting Client does not exist");
                }
                _clientUser.reportingTo = getReportingClient.firstName + " " + getReportingClient.lastName;
            }

            _clientUser.constituencyName = getConstituency.name;
            _clientUser.constituencyType = getConstituency.type;

            if (clientUser.profileImageLink?.key) {

                const params = {
                    Bucket: process.env.BUCKET,
                    Key: clientUser.profileImageLink.key
                };

                const command = new GetObjectCommand(params);
                let accessKeyId = process.env.ACCESS_KEY;
                let secretAccessKey = process.env.ACCESS_SECRET;
                const s3Client = new S3Client({ credentials: { accessKeyId, secretAccessKey }, region: process.env.REGION });
                let getUrl = await getSignedUrl(s3Client, command, { expiresIn: 180000 });
                _clientUser.profileImageLink.publicUrl = getUrl;
            }

            if (_clientUser.role === "cadre") {
                _clientUser.cadreToken = AccessToken.generateAccessToken(_clientUser)
            }

            if (process.env.CLIENT_TWO_FACTOR_LOGIN === 'true' && phone) {

                console.log("generating otp >>>>>>>>>>");
                const OTP = await crypto.randomInt(1000, 9999);

                console.log("OTP >>>>>>>>>>", OTP);
                const twilioResponse = await sendSMS(`One Time Password: ${OTP}`, clientUser.phone);

                if (clientUser.phone) {
                    await ClientUser.updateOne({ phone: clientUser.phone }, { $set: { otpObject: { otp: OTP, createdAt: new Date() } } });
                } else if (clientUser.email) {
                    await ClientUser.updateOne({ email: clientUser.email }, { $set: { otpObject: { otp: OTP, createdAt: new Date() } } });
                }

                return {
                    status: true,
                    data: null,
                    message: "OTP sent on registered mobile number",
                    error: null
                };
            }

            await OverviewService.increaseDashboardVisitCounter();
            return {
                status: true,
                data: {
                    clientUser,
                    token
                },
                message: "Login successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async loginPhoneVerifyOtp(req) {
        try {
            const { email, phone, otp } = req.body;

            let clientUser;

            if (email) {
                clientUser = await ClientUser.findOne({ email }, { prefix: 1, firstName: 1, lastName: 1, email: 1, status: 1, phone: 1, role: 1, password: 1, _id: 1, subscription: 1, constituencyId: 1, organisationId: 1, officeId: 1, profileImageLink: 1, otpObject: 1 });
            } else if (phone) {
                clientUser = await ClientUser.findOne({ phone }, { prefix: 1, firstName: 1, lastName: 1, email: 1, status: 1, phone: 1, role: 1, password: 1, _id: 1, subscription: 1, constituencyId: 1, organisationId: 1, officeId: 1, profileImageLink: 1, otpObject: 1 });
            }


            if (!clientUser) {
                throw Unauthorized("clientUser does not exist");
            }

            if (clientUser.role !== 'office_manager' && clientUser.role !== "data_entry_operator" && clientUser.role !== "constituency_manager" && clientUser.role !== "client" && clientUser.role !== "chief_of_staff") {
                throw Unauthorized("You are not authorized to access this application.");
            }

            if (clientUser.status != "active") {
                throw Unauthorized("This account is suspended.");
            }


            // 1. Check OTP is provided or not 
            // 2. Check it provided OTP matches
            // 3. Check OTP should be within 1 minutes of range else throw timeout error
            if (!otp) {
                throw Unauthorized("OTP is required");
            } else if (clientUser?.otpObject?.otp !== otp) {
                throw Unauthorized("Incorrect OTP. Please try again.");
                // return {
                //     "status": true,
                //     "message": "Incorrect OTP. Please try again.",
                //     "data": null,
                //     "error": {
                //         "message": "Incorrect OTP. Please try again."
                //     }
                // }
            } else if (((new Date() - new Date(clientUser?.otpObject?.createdAt)) / 1000) > 60) {
                throw Unauthorized("Timeout. Please try again.");
            }

            clientUser.password = undefined;
            let _clientUser = clientUser._doc;
            _clientUser.type = "client";
            const token = AccessToken.generateAccessToken(clientUser);

            let getConstituency = await Constituency.findOne({ _id: clientUser.constituencyId }, { __v: 0 });
            if (!getConstituency) {
                // throw Unauthorized("Constituency does not exist");
                getConstituency = await Parliamentary.findOne({ _id: clientUser.constituencyId }, { __v: 0 });
            }
            if (!getConstituency) {
                throw Unauthorized("Constituency or Parliamentry does not exist");
            }

            if (clientUser.officeId) {

                const getClientOffice = await ClientOffice.findOne({ _id: clientUser.officeId }, { __v: 0 });
                if (!getClientOffice) {
                    throw Unauthorized("getClientOffice does not exist");
                }

                _clientUser.officeLocation = getClientOffice.officeLocation;
                _clientUser.officeName = getClientOffice.officeName;
            }

            if (clientUser.role === "cadre") {
                const getReportingClient = await ClientUser.findOne({ 'organisationId': clientUser.organisationId }, { __v: 0 });
                if (!getReportingClient) {
                    throw Unauthorized("Reporting Client does not exist");
                }
                _clientUser.reportingTo = getReportingClient.firstName + " " + getReportingClient.lastName;
            }

            _clientUser.constituencyName = getConstituency.name;

            if (clientUser.profileImageLink?.key) {

                const params = {
                    Bucket: process.env.BUCKET,
                    Key: clientUser.profileImageLink.key
                };

                const command = new GetObjectCommand(params);
                let accessKeyId = process.env.ACCESS_KEY;
                let secretAccessKey = process.env.ACCESS_SECRET;
                const s3Client = new S3Client({ credentials: { accessKeyId, secretAccessKey }, region: process.env.REGION });
                let getUrl = await getSignedUrl(s3Client, command, { expiresIn: 180000 });
                _clientUser.profileImageLink.publicUrl = getUrl;
            }

            if (_clientUser.role === "cadre") {
                _clientUser.cadreToken = AccessToken.generateAccessToken(_clientUser)
            }

            await OverviewService.increaseDashboardVisitCounter();
            return {
                status: true,
                data: {
                    clientUser,
                    token
                },
                message: "Login successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    // Create client
    static async createClient(payload) {
        try {
            if (payload.authData.user.type === "superadmin") {

                const { organisationName,
                    constituency,
                    headOffice,
                    prefix,
                    adminFirstName,
                    adminLastName,
                    adminEmail,
                    adminContact,
                    office,
                    categoryIds,
                    autoAssignAccess,
                    urbanRural,
                    medicalCamp,
                    gmsAnalytics,
                    planType,
                    validityStart,
                    users,
                    planDuration,
                    planAmount,
                    clientPassword,
                    password } = payload.body;

                    // console.log("Payload",payload.body)
                const checkClient = await Client.findOne({ adminEmail });
                // check if client email exist in DB
                if (checkClient) {
                    throw Forbidden("client with this email address exists");
                }

                const checkClientPhone = await Client.findOne({ adminContact });

                // check if client contact exist in DB
                if (checkClientPhone) {
                    throw Forbidden("client with this contact number exists");
                }

                const checkClientUser = await ClientUser.findOne({ email: adminEmail });

                // check if client email exist in DB
                if (checkClientUser) {
                    throw Forbidden("client with this email address exists");
                }

                const checkClientUserPhone = await ClientUser.findOne({ phone: adminContact });
                // check if client contact exist in DB
                if (checkClientUserPhone) {
                    throw Forbidden("client with this contact number exists");
                }

                let validityEnd = DateFormatter.addMonthsToDate(validityStart, planDuration)
                // save client into the DB
                const client = await Client.create({
                    organisationName,
                    constituency,
                    headOffice,
                    prefix,
                    adminFirstName,
                    adminLastName,
                    adminEmail,
                    adminContact,
                    office,
                    planType,
                    validityStart,
                    validityEnd,
                    status: "active",
                    role: "client",
                    users,
                    planDuration,
                    planAmount,
                    categoryIds,
                    autoAssignAccess,
                    urbanRural,
                    medicalCamp,
                    gmsAnalytics,
                    clientPassword
                });
                if (!client) {
                    throw InternalServerError("Unable to save client's data");
                }

                //save client ids in category document
                if (categoryIds?.length > 0) {
                    for (const catId of categoryIds) {
                        await categoryModel.findByIdAndUpdate(catId, {
                        $addToSet: { clientIds: client._id }
                        });
                    }
                }
                //function to create "clientOffice" with office objects
                let created_office = [];
                let officeDetails = [];
                let clientAdmin;

                let createHeadOffice = await ClientOffice.create({
                    officeName: headOffice?.officeName,
                    constituencyName: client.constituency[0]?.constituencyName,
                    officeLocation: headOffice?.location,
                    organizationID: client._id,
                    officeConstituencyName: client.constituency[0]?.constituencyId,
                    planType: client.planType,
                    planStart: client.validityStart,
                    planEnd: client.validityEnd,
                    state: headOffice.state,
                    city: headOffice.city
                })

                if (!createHeadOffice) {
                    throw InternalServerError("Unable to save headOffice's data");
                }

                client.headOffice = {
                    officeId: createHeadOffice._id,
                    officeName: createHeadOffice.officeName,
                    officeConstituencyID: createHeadOffice.constituencyID,
                    officeConstituencyName: createHeadOffice.constituencyName,
                    location: headOffice?.location,
                    contactNumber: headOffice.contactNumber,
                    email: headOffice.email,
                    state: headOffice.state,
                    city: headOffice.city
                }
                await new Promise((resolve, reject) => {
                    const populateOffice = async () => {
                        let officeCount = client.office?.length
                        for (let i = 0; i < officeCount; i++) {
                            let office = await ClientOffice.create({
                                officeName: client.office[i],
                                constituencyName: client.constituency[0]?.constituencyName,
                                officeLocation: headOffice?.location,
                                organizationID: client._id,
                                constituencyID: client.constituency[0]?.constituencyId,
                                planType: client.planType,
                                planStart: client.validityStart,
                                planEnd: client.validityEnd,
                            })
                            if (office._id) {
                                officeDetails.push({
                                    officeId: office._id,
                                    officeName: office.officeName,
                                    officeConstituencyID: office.constituencyID,
                                    constituencyName: office.constituencyName
                                })
                                created_office.push(office._id);
                            }
                        }


                        clientAdmin = await ClientUser.create({
                            prefix: prefix,
                            firstName: adminFirstName,
                            lastName: adminLastName,
                            organisationId: client._id,
                            officeId: client.headOffice.officeId,
                            // officeId: (created_office[0]) ? created_office[0] : null,  //needs to be changed to officeID
                            constituencyId: client.constituency[0].constituencyId,    // array of id's, just for temporary use,This needs to be changed to constituency Id
                            email: adminEmail,
                            phone: headOffice.contactNumber,
                            password,
                            autoAssignAccess,
                            urbanRural,
                            medicalCamp,
                            gmsAnalytics,
                            role: "client",
                            status: "active",
                            subscription: planType,
                            validityStart,
                            validityEnd,
                            planDuration,
                            planAmount,
                            clientPassword
                        });
                        console.log("clientAdmin>>>>>>>>", clientAdmin);
                        if (!clientAdmin) {
                            throw InternalServerError("Unable to save clientAdmin in clientUser");
                        }
                        clientAdmin.password = undefined;
                        resolve();
                    }

                    populateOffice();
                });


                client.office = officeDetails;

                 await createAuditLog({
                    userId: payload.authData?.user?._id,
                    userName: payload.authData?.user?.firstName + " " + payload.authData?.user?.lastName,
                    userRole: payload.authData?.user?.role,
                    action: 'CLIENT_CREATED',
                    details: `Client ${adminFirstName} ${adminLastName} has been created by ${payload.authData?.user?.firstName}`,
                    // ipAddress: userIp
                });

                return {
                    status: true,
                    data: { clientAdmin, client },
                    message: "Client create successfull",
                    error: null
                };

            }
            if (payload.authData.user.type === "client") {

                const checkClientUser = await ClientUser.findOne({ email: payload.body.email });

                // check if client email exist in DB
                if (checkClientUser) {
                    throw Forbidden("clientUser with this email address exists");
                }

                const checkClientUserPhone = await ClientUser.findOne({ phone: payload.body.phone });

                // check if client phone number exist in DB
                if (checkClientUserPhone) {
                    throw Forbidden("clientUser with this phone number exists");
                }

                const client = await Client.findOne({ _id: payload.authData.user.organisationId });
                if (!client) {
                    return {
                        status: false,
                        data: null,
                        message: "Organisation does not exists",
                        error: {
                            message: "Organisation does not exists"
                        }
                    };
                }

                payload.body["subscription"] = client.planType;
                payload.body["validityStart"] = client.validityStart;
                payload.body["validityEnd"] = client.validityEnd;
                payload.body["constituencyId"] = payload.authData.user.constituencyId
                payload.body["autoAssignAccess"] = client.autoAssignAccess;
                payload.body["urbanRural"] = client.urbanRural;
                payload.body["medicalCamp"] = client.medicalCamp;
                payload.body["gmsAnalytics"] = client.gmsAnalytics;

                const clientUser = await ClientUser.create(
                    payload.body
                );
                if (!clientUser) {
                    throw InternalServerError("Unable to save in clientUser");
                }
                clientUser.password = undefined;
                return {
                    status: true,
                    data: { clientUser },
                    message: "ClientUser create successfull",
                    error: null
                };

            }


        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    //create client office
    static async clientOfficeCreate(payload, id) {
        let client;
        try {
            try {
                client = await Client.findById({ _id: id }, {});
                if (!client) {
                    throw Unauthorized("Client does not exist; Login as Client");
                }
            } catch (error) {
                return {
                    message: error.message,
                    error
                };
            }
            const { officeName, officeLocation, constituencyName, constituencyID } = payload;
            // save Office into the DB
            const Office = await ClientOffice.create({
                officeName,
                constituencyName: (constituencyName) ? constituencyName : client.constituency[0]?.constituencyName,
                officeLocation,
                organizationID: client?._id,
                constituencyID: (constituencyID) ? constituencyID : client.constituency?.[0]?.constituencyId,
                planType: client.planType,
                planStart: client.validityStart,
                planEnd: client.validityEnd,
            });
            if (!Office) {
                throw InternalServerError("Unable to save office's data");
            }
            return {
                status: true,
                data: Office,
                message: "office created successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    };

    //get single office summary
    static async officeSummary(req) {
        try {
            const id = req.params.id;
            const office_manager = await ClientUser.count({ organisationId: req.authData.user.organisationId, officeId: id, role: "office_manager" }).then(count => { return count });
            const cadreCount = await ClientUser.count({ organisationId: req.authData.user.organisationId, officeId: id, role: "cadre" }).then(count => { return count });
            const data_entry_operator = await ClientUser.count({ organisationId: req.authData.user.organisationId, officeId: id, role: "data_entry_operator" }).then(count => { return count });
            const users = await ClientUser.find(
                { officeId: id },
                {
                    "firstName": 1,
                    "lastName": 1,
                    "role": 1,
                    "status": 1
                },
            );
            if (users?.length === 0) {
                throw Unauthorized("summary does not exist");
            }
            return {
                status: true,
                data: {
                    users,
                    count: { office_manager: office_manager, cadre: cadreCount, data_entry_operator: data_entry_operator }
                },
                message: "Got office summary successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    //search Office with keyword
    static async searchOfficeWithKeyword(req, id) {
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        const keyword = req.query.keyword;
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;
        let totalOffices;
        let totalPages;

        try {

            if (keyword === "") {
                return {
                    status: false,
                    data: [],
                    currentPage: current_page_number,
                    totalPages,
                    message: "Pls add keyword or search string to search user",
                    error: "Pls add keyword or search string to search user"
                };
            }

            const foundOffice = await ClientOffice.aggregate([
                { $match: { "organizationID": ObjectId(req.authData.user.organisationId) } },
                {
                    $match: {
                        $or: [
                            { 'officeName': { '$regex': keyword, '$options': 'i' } },
                            { 'officeLocation': { '$regex': keyword, '$options': 'i' } }
                        ]
                    }
                },
                {
                    "$lookup": {
                        "from": "clientusers",
                        "localField": "_id",
                        "foreignField": "officeId",
                        "as": "office_info"
                    }
                },
                {
                    $project: {
                        assigned_users_count: { $size: "$office_info" },
                        officeName: 1,
                        organizationID: 1,
                        constituencyID: 1,
                        constituencyName: 1,
                        officeLocation: 1,
                        planType: 1,
                        planStart: 1,
                        planEnd: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                { $sort: sort },
                { $skip: no_of_docs_each_page * (current_page_number - 1) },
                { $limit: no_of_docs_each_page }
            ])

            totalOffices = await ClientOffice.countDocuments({
                'organizationID': req.authData.user.organisationId,
                '$or': [
                    { 'officeName': { '$regex': keyword, '$options': 'i' } },
                    { 'officeLocation': { '$regex': keyword, '$options': 'i' } }]
            });
            totalPages = Math.ceil(totalOffices / no_of_docs_each_page);

            if (endIndex < totalOffices) {
                nextPage = current_page_number + 1;
            }
            if (startIndex > 0) {
                previousPage = current_page_number - 1;
            }

            if (totalOffices.length != 0) {
                return {
                    status: true,
                    data: foundOffice,
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalOffices,
                    message: "Office found",
                    error: null
                };
            }
            else {
                return {
                    status: true,
                    data: foundOffice,
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalOffices,
                    message: "Office found",
                    error: null
                };
            }

        }
        catch (error) {

            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching user",
                error
            };
        }
    }

    //search clientUser with keyword
    static async searchClientUserWithKeyword(req) {
        const no_of_docs_each_page = parseInt(req.query.size) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        const startIndex = (current_page_number - 1) * no_of_docs_each_page;
        const keyword = req.query.keyword;
        const matchQuery = [{
            '$lookup': {
                'from': 'clientoffices',
                'let': {
                    'officeId': '$officeId'
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$_id', '$$officeId'
                                ]
                            }
                        }
                    }, {
                        '$project': {
                            '_id': 1,
                            'officeName': 1
                        }
                    }
                ],
                'as': 'officeDetails'
            }
        }];
        try {
            if (!keyword) {
                return {
                    status: false,
                    data: [],
                    currentPage: current_page_number,
                    totalPages,
                    message: "Pls add keyword or search string to search client user",
                    error: "Pls add keyword or search string to search client user"
                };
            }
            let numericKeyword = parseInt(keyword);
            const isNumericKeyword = !isNaN(numericKeyword);

            if (req.authData.user.role === "office_manager" || req.authData.user.role === "constituency_manager" || req.authData.user.role === "chief_of_staff") {
                const reportsToData = await getReportingIds(req.authData.user._id);
                matchQuery.unshift({
                    "$match": {
                        "_id": { $in: [ObjectId(req.authData.user._id), ...reportsToData] }
                    }
                })
            } else {
                matchQuery.unshift({
                    "$match": {
                        organisationId: ObjectId(req.authData.user.organisationId)
                    }
                })
            }

            matchQuery[0]["$match"]["$or"] = [
                { 'email': { '$regex': keyword, '$options': 'i' } },
                { 'role': { '$regex': keyword, '$options': 'i' } },
                { 'status': { '$regex': keyword, '$options': 'i' } },
                { 'firstName': { '$regex': keyword, '$options': 'i' } },
                { 'lastName': { '$regex': keyword, '$options': 'i' } },
                ...(isNumericKeyword ? [{ customClientId: numericKeyword }] : [])   //Updated
            ]

            if (Number(keyword)) {
                matchQuery[0]["$match"]["$or"].push(
                    { phone: { $eq: Number(keyword) } }
                )
            }

            //find user with firstname, lastname and email with pagination
            const foundUser = await ClientUser.aggregate([...matchQuery, {
                '$sort': {
                    'createdAt': -1
                }
            }, {
                '$skip': startIndex
            }, {
                '$limit': no_of_docs_each_page
            }]);

            let totaldocuments = await ClientUser.aggregate([...matchQuery, { '$count': "records" }]);
            var totalPages = Math.ceil(totaldocuments[0].records / no_of_docs_each_page);

            if (foundUser.length != 0) {
                return {
                    status: true,
                    data: foundUser,
                    currentPage: current_page_number,
                    totalPages,
                    message: "User found",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: 0,
                    totalPages: 0,
                    message: "User Not found",
                    error: "User Not found"
                };
            }

        }
        catch (error) {

            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching user",
                error
            };
        }
    }

    //filter by query string
    static async getFilteredClientUser(payload, field) {
        const no_of_docs_each_page = parseInt(payload.query.size) || 10; // 10 docs in single page
        const current_page_number = parseInt(payload.query.page) || 1; // 1st page
        let sort = payload.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;
        let totalclients = 0;

        try {

            let keyword = payload.query.keyword;
            let clientUser;
            if (payload.authData.user.type === "superadmin") {
                let matchObj = {};
                matchObj[field] = keyword;
                clientUser = await Client.aggregate([
                    { $match: matchObj },
                    // {
                    //     "$lookup": {
                    //         "from": "plans",
                    //         "localField": "planType",
                    //         "foreignField": "_id",
                    //         "as": "planDetails",
                    //     }
                    // },
                    {
                        "$lookup": {
                            "from": "grievances",
                            "localField": "_id",
                            "foreignField": "clientId",
                            "as": "grievancesDetails"
                        }
                    },
                    // {
                    //     $unwind: "$planDetails" // Unwind the planDetails array
                    // },
                    // {
                    //     $addFields: {
                    //         filteredServices: {
                    //             $filter: {
                    //                 input: "$planDetails.services", // Input array to filter
                    //                 as: "service", // Variable name for each service in the array
                    //                 cond: true
                    //             }
                    //         }
                    //     }
                    // },
                    {
                        $project: {
                            grievances_count: { $size: "$grievancesDetails" },
                            _id: 1,
                            organisationName: 1,
                            constituency: 1,
                            headOffice: 1,
                            prefix: 1,
                            adminFirstName: 1,
                            adminLastName: 1,
                            adminEmail: 1,
                            adminContact: 1,
                            office: 1,
                            planType: 1,
                            // planDetails: "$planDetails",
                            validityStart: 1,
                            validityEnd: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            users: 1,
                            status: 1
                        }
                    },
                    { $sort: sort },
                    { $skip: no_of_docs_each_page * (current_page_number - 1) },
                    { $limit: no_of_docs_each_page },
                ]);

                const totalClient = await Client.aggregate([
                    { $match: matchObj },
                    // {
                    //     "$lookup": {
                    //         "from": "plans",
                    //         "localField": "planType",
                    //         "foreignField": "_id",
                    //         "as": "planDetails",
                    //     }
                    // },
                    {
                        "$lookup": {
                            "from": "grievances",
                            "localField": "_id",
                            "foreignField": "clientId",
                            "as": "grievancesDetails"
                        }
                    },
                    // {
                    //     $unwind: "$planDetails" // Unwind the planDetails array
                    // },
                    // {
                    //     $addFields: {
                    //         filteredServices: {
                    //             $filter: {
                    //                 input: "$planDetails.services", // Input array to filter
                    //                 as: "service", // Variable name for each service in the array
                    //                 cond: true
                    //             }
                    //         }
                    //     }
                    // },

                ]);


                if (clientUser?.length === 0 || !clientUser) {
                    return {
                        status: false,
                        data: clientUser,
                        currentPage: current_page_number,
                        totalPages,
                        totalclients,
                        message: "Client not found",
                        error: null
                    };
                }
                // if (!clientUser) {
                //     throw Unauthorized("Client User does not exist");
                // }
                totalclients = totalClient.length;
                var totalPages = Math.ceil(totalclients / no_of_docs_each_page);
                if (endIndex < totalclients) {
                    nextPage = current_page_number + 1;
                }
                if (startIndex > 0) {
                    previousPage = current_page_number - 1;
                }
                if (clientUser.length != 0) {
                    return {
                        status: true,
                        data: clientUser,
                        currentPage: current_page_number,
                        totalPages,
                        nextPage,
                        previousPage,
                        totalclients: totalclients,
                        message: "Client found",
                        error: null
                    };
                }

            } else {
                if (field === 'subscription') {
                    clientUser = await ClientUser.aggregate([{ $match: { subscription: keyword } }])
                }
                if (field === 'role') {
                    clientUser = await ClientUser.aggregate([{ $match: { role: keyword } }])
                }
                if (field === 'status') {
                    clientUser = await ClientUser.aggregate([{ $match: { status: keyword } }])
                }
                if (clientUser?.length === 0 || !clientUser) {
                    throw Unauthorized("Client User does not exist");
                }
                if (!clientUser) {
                    throw Unauthorized("Client User does not exist");
                }
            }
            return {
                status: true,
                data: clientUser,
                message: "Get filtered Client User successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    //get one client
    static async getOneclientUser(req) {
        try {

            const id = req.params.id;
            let query = req.query || { _id: id }
            // const result = await ClientUser.findById({ _id: id }, {});
            // const result = await ClientUser.findById(query, { firstName: 1, lastName: 1, email: 1, role: 1, phone: 1, clientPassword: 1 });
            // if (!result) {
            //     throw Unauthorized("Client User does not exist");
            // }

            const result = await ClientUser.aggregate([
                {
                    $match: {
                        "_id": ObjectId(id)
                    }
                },
                {
                    $lookup: {
                        from: "clientoffices",
                        localField: "officeId",
                        foreignField: "_id",
                        as: "officeData"
                    }
                },
                {
                    $addFields: {
                        officeData: {
                            $arrayElemAt: ["$officeData", 0]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "constituencies",
                        localField: "constituencyId",
                        foreignField: "_id",
                        as: "constituencyData"
                    }
                },
                {
                    $addFields: {
                        constituencyData: {
                            $arrayElemAt: ["$constituencyData", 0]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "clientusers",
                        localField: "reportsTo",
                        foreignField: "_id",
                        as: "reporting"
                    }
                },
                {
                    $addFields: {
                        reporting: {
                            $arrayElemAt: ["$reporting", 0]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "clientusers",
                        localField: "reportsTo",
                        foreignField: "_id",
                        as: "reporting"
                    }
                },
                {
                    $addFields: {
                        reporting: {
                            $arrayElemAt: ["$reporting", 0]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        prefix: 1,
                        firstName: 1,
                        lastName: 1,
                        description: 1,
                        organisationId: 1,
                        reportsTo: 1,
                        reporting: { $concat: ['$reporting.firstName', ' ', '$reporting.lastName'] },
                        email: 1,
                        phone: 1,
                        role: 1,
                        department: 1,
                        additionalComments:1,
                        status: 1,
                        clientPassword: 1,
                        officeId: 1,
                        constituencyId: 1,
                        officeName: '$officeData.officeName',
                        constituencyName: '$constituencyData.name'
                    }
                },
            ]);

            if (!result) {
                throw Unauthorized("Client User does not exist");
            }
            result[0].clientPassword = EncryptAndDecrypt.decrypt(result[0].clientPassword)

            return {
                status: true,
                data: result[0],
                message: "Got client User successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    // Update Client
    static async clientUserUpdateService(payload) {
        try {
            // update client
            const id = payload.params.id;
            const updatedData = payload.body;
            const options = { new: true };
            let { email } = updatedData;
            let updateObject = {};

            const result = await ClientUser.findOne({ email: email });
            // check if client email exist in DB
            if (!result) {
                throw Forbidden("client User with this email address does not exists");
            }
            if (result.role == "constituency_manager") {
                updateObject["prefix"] = updatedData.prefix;
                updateObject["firstName"] = updatedData.firstName;
                updateObject["lastName"] = updatedData.lastName;
                updateObject["role"] = updatedData.role;
                updateObject["constituencyId"] = updatedData.constituencyId;
                updateObject["password"] = updatedData.password;
                updateObject["phone"] = updatedData.phone;
                updateObject["clientPassword"] = updatedData.clientPassword;
                updateObject["status"] = updatedData.status;
                updateObject["reportsTo"] = updatedData.reportsTo;
                updateObject["officeId"] = updatedData.role === 'chief_of_staff' ? null : updatedData.officeId;
                updateObject["additionalComments"]=updatedData.additionalComments
            }

            if (result.role == "chief_of_staff") {
                updateObject["prefix"] = updatedData.prefix;
                updateObject["firstName"] = updatedData.firstName;
                updateObject["lastName"] = updatedData.lastName;
                updateObject["role"] = updatedData.role;
                updateObject["password"] = updatedData.password;
                updateObject["phone"] = updatedData.phone;
                updateObject["clientPassword"] = updatedData.clientPassword;
                updateObject["status"] = updatedData.status;
                updateObject["reportsTo"] = updatedData.reportsTo;
                updateObject["officeId"] = updatedData.officeId;
                updateObject["additionalComments"]=updatedData.additionalComments
            }

            if (result.role == "office_manager") {
                updateObject["prefix"] = updatedData.prefix;
                updateObject["firstName"] = updatedData.firstName;
                updateObject["lastName"] = updatedData.lastName;
                updateObject["role"] = updatedData.role;
                updateObject["officeId"] = updatedData.role === 'chief_of_staff' ? null : updatedData.officeId;
                updateObject["password"] = updatedData.password;
                updateObject["phone"] = updatedData.phone;
                updateObject["clientPassword"] = updatedData.clientPassword;
                updateObject["status"] = updatedData.status;
                updateObject["reportsTo"] = updatedData.reportsTo;
                updateObject["additionalComments"]=updatedData.additionalComments
            }

            if (result.role == "cadre") {
                updateObject["prefix"] = updatedData.prefix;
                updateObject["firstName"] = updatedData.firstName;
                updateObject["lastName"] = updatedData.lastName;
                updateObject["role"] = updatedData.role;
                updateObject["officeId"] = updatedData.role === 'chief_of_staff' ? null : updatedData.officeId;
                updateObject["password"] = updatedData.password;
                updateObject["phone"] = updatedData.phone;
                updateObject["clientPassword"] = updatedData.clientPassword;
                updateObject["status"] = updatedData.status;
                updateObject["reportsTo"] = updatedData.reportsTo;
                updateObject["additionalComments"]=updatedData.additionalComments
            }

            if (result.role == "data_entry_operator") {
                updateObject["prefix"] = updatedData.prefix;
                updateObject["firstName"] = updatedData.firstName;
                updateObject["lastName"] = updatedData.lastName;
                updateObject["role"] = updatedData.role;
                updateObject["officeId"] = updatedData.role === 'chief_of_staff' ? null : updatedData.officeId;
                updateObject["password"] = updatedData.password;
                updateObject["phone"] = updatedData.phone;
                updateObject["clientPassword"] = updatedData.clientPassword;
                updateObject["status"] = updatedData.status;
                updateObject["reportsTo"] = updatedData.reportsTo;
                updateObject["additionalComments"]=updatedData.additionalComments
            }

            const data = await ClientUser.findByIdAndUpdate(
                id, updateObject, options
            );

            if (!data) {
                throw Unauthorized("Couldn't update Client User");
            }
            data.password = undefined;

            return {
                status: true,
                data: data,
                message: "Client user updated successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async clientUserDeleteService(payload) {
        try {

            let result;
            let deletedClient;
            let updateReport;
            const id = payload.params.id;
            if (payload.authData.user.type === "superadmin") {
                let getClient = await Client.findOne({ _id: id });
                if (getClient) {

                    updateReport = await ReportModel.updateMany(
                        {
                            "subscribers": {
                                $elemMatch: { "_id": getClient._id.toString() }
                            }
                        },
                        {
                            $pull: { "subscribers": { "_id": getClient._id.toString() } }
                        }
                    );

                    updateReport = await SurveyModel.updateMany(
                        {
                            "subscribers": {
                                $elemMatch: { "_id": getClient._id.toString() }
                            }
                        },
                        {
                            $pull: { "subscribers": { "_id": getClient._id.toString() } }
                        }
                    );

                    const fetchAllInvoicesByClientId = await InvoiceModel.find({ clientId: id }, { _id: 1 });
                    // Delete client from all categories (remove from clientIds array)
                    await categoryModel.updateMany(
                    { clientIds: getClient._id },
                    { $pull: { clientIds: getClient._id } }
                    );
                    await ClientUser.deleteMany({ organisationId: getClient._id });
                    // await InvoiceModel.deleteMany({ clientId: id });
                    // await TransactionModel.deleteMany({ invoiceId: { $in: fetchAllInvoicesByClientId } });

                    deletedClient = await Client.deleteOne({ _id: id });
                    if (deletedClient.deletedCount === 0) {
                        throw Unauthorized("ClientUser does not exist");
                    }
                } else {
                    throw Unauthorized("ClientUser does not exist");
                }
                await createAuditLog({
                    userId: payload.authData?.user?._id,
                    userName: payload.authData?.user?.firstName + " " + payload.authData?.user?.lastName,
                    userRole: payload.authData?.user?.role,
                    action: 'CLIENT_DELETED',
                    details: `Client ${getClient?.adminFirstName} ${getClient?.adminLastName} has been deleted by ${payload.authData?.user?.firstName}`,
                    // ipAddress: userIp
                });
                return {
                    status: true,
                    data: {
                        updateReport
                    },
                    message: "ClientUser Delete successfully",
                    error: null
                };

            } else {
                const findClientUser = await ClientUser.findOne({ _id: id })
                if (!findClientUser) {
                    throw Unauthorized("ClientUser does not exist")
                }

                if (findClientUser?.reportsTo) {
                    const userReportingToDeletedUser = await ClientUser.find({ reportsTo: findClientUser._id }, { _id: 1 });
                    if (userReportingToDeletedUser?.length) {
                        for await (const clientUser of userReportingToDeletedUser) {
                            await ClientUser.updateOne({ _id: clientUser._id }, { $set: { reportsTo: findClientUser.reportsTo } });
                        }
                    }
                }
                result = await ClientUser.deleteOne({ _id: id });
                return {
                    status: true,
                    data: {
                        result
                    },
                    message: "ClientUser Delete successfully",
                    error: null
                };
            }

        } catch (error) {
            console.log("error ----------- ", error);
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async searchClientWithKeyword(req) {
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        let totalPages;
        try {

            const keyword = req.query.keyword;
            if (keyword === "") {
                return {
                    status: false,
                    data: [],
                    currentPage: current_page_number,
                    totalPages,
                    message: "Pls add keyword or search string to search client",
                    error: "Pls add keyword or search string to search client"
                };
            }

            let query;
            if (ObjectId.isValid(keyword)) {
                query = {
                    '$or': [
                        { 'officeId': ObjectId(keyword) },
                        { 'organisationId': ObjectId(keyword) }
                    ]
                }
            } else {
                query = {
                    '$or': [
                        { 'role': { $regex: keyword, $options: 'i' } },
                        { 'firstName': { $regex: keyword, $options: 'i' } },
                        { 'lastName': { $regex: keyword, $options: 'i' } },
                        { 'email': { $regex: keyword, $options: 'i' } }
                    ]
                }
            }

            const foundGClient = await ClientUser.find(query, { "__v": 0 })
                .skip(no_of_docs_each_page * (current_page_number - 1))
                .limit(no_of_docs_each_page);

            totalPages = Math.ceil(foundGClient.length / no_of_docs_each_page);

            if (foundGClient.length != 0) {
                return {
                    status: true,
                    data: foundGClient,
                    currentPage: current_page_number,
                    totalPages,
                    message: "Client found",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: 0,
                    totalPages: 0,
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }
        }
        catch (error) {
            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching Clients",
                error
            };
        }
    }

    // client reset password 
    //finds user then adds token and sends mail to user with reset password link
    // static async requestPasswordReset(email) {

    //     const user = await Client.findOne({ email });
    //     if (!user) return(
    //         {
    //             status: false,
    //             message:"user not found",
    //             data:user
    //         }
    //     )
    //     const id = user.id;
    //     const options = { new: true };
    //      //throw new Error("User does not exist");
    //      //find the user with resetpasswordtoken field
    //     let founduser = await Client.findOne({ resetPasswordToken: user.resetPasswordToken });
    //     //if token is alredy present then replace with the latest password generated
    //     if (founduser.resetPasswordToken){
    //         await Client.findByIdAndUpdate(
    //             id, {resetPasswordToken:null}, options
    //         );

    //     } 
    //     //console.log("resetPasswordToken after : ",resetPasswordToken);
    //     let resetToken = crypto.randomBytes(32).toString("hex");
    //     const hash = await bcrypt.hash(resetToken, Number(process.env.BCRYPT_SALT));
    //     //add the hashed token to the user
    //         const updateduser = await Client.findByIdAndUpdate(
    //             id, {resetPasswordToken:hash}, options
    //         );
    //         //if user is not found
    //         if (!updateduser) {
    //             return({status: false, message:"user does not exist",data:updateduser})
    //         }
    //         //generate a link with token and userid
    //     const link = `${process.env.CLIENT_URL}/passwordReset?token=${resetToken}&id=${user._id}`;
    //     //sends mail to user with password reset link
    //     sendEmail(user.email, "Password Reset Request", {data:`<p>Click <a href=${link}>here</a> to reset your password</p>`});
    //     //if everything went well the return status as true
    //     return {
    //         status: true,
    //         data: link,
    //         message: "token added successfully",
    //     }
    // };

    //     //this function gets called when link gets clicked from users email to match user and reset password
    // static async resetPassword(userId, token, password) {

    //     let foundUser = await Client.findOne({ _id:userId });
    //     if (!foundUser) {
    //         return({status: false,message:"user not found for password update",data:foundUser})
    //     }

    //     let passwordResetToken = foundUser.resetPasswordToken;

    //     if (!passwordResetToken) {
    //         return({status: false,message:"password reset token is not valid",data:passwordResetToken})
    //     }
    //     const isValid = await bcrypt.compare(token, passwordResetToken);
    //     if (!isValid) {
    //         return({status: false,message:"token doesn't match",data:isValid})
    //     }
    //     const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));
    //     await Client.updateOne(
    //         { _id: userId },
    //         { $set: { password: hash, lastpasswordchangedate: new Date()} },
    //         { new: true }
    //     );
    //     const user = await Client.findById({ _id: userId });
    //     sendEmail(
    //         user.email,
    //         "Password Reset Successfully",
    //         {data:"Your Password was changed Successfully on Polstrat"}
    //     );
    //     //after reseting the password reset the token 
    //     const updateduser = await Client.findByIdAndUpdate(
    //         userId, {resetPasswordToken:null}
    //     );

    //     return({status: true,message:"password updated sucessfully",data:updateduser})
    // };


    //search clientUser with keyword
    static async getAllClientAdminByType(req) {
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        let status = req.query.status;
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;
        let servicesName = req.params.type
        let clientQuery = { "planType.name": servicesName }
        try {

            if (status) {
                clientQuery['status'] = status
            }

            //lookup is for getting the planName from Plans collection using planType(id) in client
            const foundClient = await Client.aggregate([
                {
                    $match: clientQuery
                },
                // {
                //     "$lookup": {
                //         "from": "plans",
                //         "localField": "planType",
                //         "foreignField": "_id",
                //         "pipeline": [
                //             {
                //                 "$match": {
                //                     "name": servicesName
                //                 }
                //             }
                //         ],
                //         "as": "planDetails",
                //     }
                // },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                {
                    "$lookup": {
                        "from": "clientoffices",
                        "localField": "_id",
                        "foreignField": "organizationID",
                        "as": "clientOfficesDetails"
                    }
                },
                // {
                //     $unwind: "$planDetails" // Unwind the planDetails array
                // },
                // {
                //     $addFields: {
                //         filteredServices: {
                //             $filter: {
                //                 input: "$planDetails.services", // Input array to filter
                //                 as: "service", // Variable name for each service in the array
                //                 cond: true // Match by service name
                //             }
                //         }
                //     }
                // },

                {
                    $project: {
                        grievances_count: { $size: "$grievancesDetails" },
                        _id: 1,
                        organisationName: 1,
                        constituency: 1,
                        headOffice: 1,
                        prefix: 1,
                        adminFirstName: 1,
                        adminLastName: 1,
                        adminEmail: 1,
                        adminContact: 1,
                        office: 1,
                        clientOfficeCount: { $size: "$clientOfficesDetails" },
                        // clientOfficesDetails: 1,
                        planType: 1,
                        // planDetails: "$planDetails",
                        validityStart: 1,
                        validityEnd: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        status: 1,
                        customClientId:1
                    }
                },
                { $sort: sort },
                { $skip: no_of_docs_each_page * (current_page_number - 1) },
                { $limit: no_of_docs_each_page },
            ]);

            const totalClient = await Client.aggregate([
                {
                    $match: clientQuery
                },
                // {
                //     "$lookup": {
                //         "from": "plans",
                //         "localField": "planType",
                //         "foreignField": "_id",
                //         "pipeline": [
                //             {
                //                 "$match": {
                //                     "name": servicesName
                //                 }
                //             }
                //         ],
                //         "as": "planDetails",
                //     }
                // },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                // {
                //     $unwind: "$planDetails" // Unwind the planDetails array
                // },
                // {
                //     $addFields: {
                //         filteredServices: {
                //             $filter: {
                //                 input: "$planDetails.services", // Input array to filter
                //                 as: "service", // Variable name for each service in the array
                //                 cond: true // Match by service name
                //             }
                //         }
                //     }
                // },
            ]);

            // let totalclients = await Client.countDocuments().exec();
            let totalclients = totalClient.length;
            var totalPages = Math.ceil(totalclients / no_of_docs_each_page);
            if (endIndex < totalclients) {
                nextPage = current_page_number + 1;
            }
            if (startIndex > 0) {
                previousPage = current_page_number - 1;
            }
            if (foundClient.length != 0) {
                return {
                    status: true,
                    data: foundClient,
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalclients: totalclients,
                    message: "Client found",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: 0,
                    totalPages: 0,
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }

        }
        catch (error) {
            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching Client",
                error
            };
        }
    }

    //Get Ticket By Id
    static async getClientById(payload) {
        try {

            const clientInfo = await Client.aggregate([
                { $match: { "_id": ObjectId(payload) } },
                // {
                //     "$lookup": {
                //         "from": "plans",
                //         "localField": "planType",
                //         "foreignField": "_id",
                //         "as": "planDetails",
                //     }
                // },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                // {
                //     $unwind: "$planDetails" // Unwind the planDetails array
                // },
                // {
                //     $addFields: {
                //         filteredServices: {
                //             $filter: {
                //                 input: "$planDetails.services", // Input array to filter
                //                 as: "service", // Variable name for each service in the array
                //                 cond: true
                //             }
                //         }
                //     }
                // },
                {
                    $project: {
                        grievances_count: { $size: "$grievancesDetails" },
                        _id: 1,
                        organisationName: 1,
                        constituency: 1,
                        headOffice: 1,
                        prefix: 1,
                        adminFirstName: 1,
                        adminLastName: 1,
                        adminEmail: 1,
                        adminContact: 1,
                        office: 1,
                        planType: 1,
                        // planDetails: "$planDetails",
                        validityStart: 1,
                        validityEnd: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        users: 1,
                        status: 1,
                        planAmount: 1,
                        planDuration: 1,
                        password: 1,
                        clientPassword: 1,
                        categoryIds:1,
                        autoAssignAccess:1,
                        urbanRural:1,
                        medicalCamp:1,
                        gmsAnalytics:1
                    }
                }
            ]);
            if (!clientInfo || clientInfo.length == 0) {
                throw Unauthorized("Client does not exist.");
            }

            // clientInfo[0].clientPassword = EncryptAndDecrypt.decrypt(clientInfo[0].clientPassword)
            // ✅ Safe decryption with fallback to empty string
            let decryptedPassword = '';
            if (clientInfo[0].clientPassword) {
                try {
                    decryptedPassword = EncryptAndDecrypt.decrypt(clientInfo[0].clientPassword);
                } catch (err) {
                    console.warn("Decryption failed, returning empty password:", err.message);
                    decryptedPassword = '';
                }
            }
            clientInfo[0].clientPassword = decryptedPassword;

            return {
                status: true,
                data: clientInfo[0],
                message: "Get Client successfull",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    // Update User
    static async clientUpdate(req) {
        try {

            // update client
            const id = req.params.id;
            const updatedData = req.body;
            const options = { new: true };
            let updatedUserData = {};

            // Fetch existing client before update (for audit diff)
            const existingClient = await Client.findById(id);
            if (!existingClient) {
            throw Unauthorized("Client data does not exist");
            }

            const clientData = await Client.findByIdAndUpdate(
                id, updatedData, options
            );

            if (!clientData) {
                throw Unauthorized("client data does not exist");
            }

            // Update clientIds in categories
            if (updatedData.categoryIds && Array.isArray(updatedData.categoryIds)) {
                const clientObjectId = clientData._id;

                // 1. Remove client ID from all categories
                await categoryModel.updateMany(
                    { clientIds: clientObjectId },
                    { $pull: { clientIds: clientObjectId } }
                );

                // 2. Add client ID to selected categories
                await categoryModel.updateMany(
                    { _id: { $in: updatedData.categoryIds.map(id => ObjectId(id)) } },
                    { $addToSet: { clientIds: clientObjectId } },
                    { multi: true }
                );
            }
            if (updatedData.prefix) {
                updatedUserData['prefix'] = updatedData.prefix;
            }
            if (updatedData.adminFirstName) {
                updatedUserData['firstName'] = updatedData.adminFirstName;
            }
            if (updatedData.adminLastName) {
                updatedUserData['lastName'] = updatedData.adminLastName;
            }
            if (updatedData.adminEmail) {
                updatedUserData['email'] = updatedData.adminEmail;
            }
            if (updatedData.status) {
                updatedUserData['status'] = updatedData.status;
            }
            if (updatedData.planType) {
                updatedUserData['subscription'] = updatedData.planType;
            }
            if (updatedData.password) {
                updatedUserData['password'] = updatedData.password;
            }
            if (updatedData.clientPassword) {
                updatedUserData['clientPassword'] = updatedData.clientPassword;
            }
            if (updatedData.planDuration) {
                updatedUserData['planDuration'] = updatedData.planDuration;
            }
            if (updatedData.planAmount) {
                updatedUserData['planAmount'] = updatedData.planAmount;
            }
            if (updatedData.validityStart) {
                updatedUserData['validityStart'] = updatedData.validityStart;
            }
            if (updatedData.validityEnd) {
                updatedUserData['validityEnd'] = updatedData.validityEnd;
            }
            if (updatedData.adminContact) {
                updatedUserData['phone'] = updatedData.adminContact;
            }
            if (updatedData.categoryIds) {
                updatedUserData['categoryIds'] = updatedData.categoryIds;
            }
            updatedUserData['autoAssignAccess'] = updatedData.autoAssignAccess;
            updatedUserData['medicalCamp'] = updatedData.medicalCamp;
            updatedUserData['gmsAnalytics'] = updatedData.gmsAnalytics;

            await ClientUser.updateMany({"organisationId":id},{ $set: { autoAssignAccess: updatedData.autoAssignAccess, urbanRural:updatedData?.urbanRural, medicalCamp: updatedData?.medicalCamp, gmsAnalytics:updatedData?.gmsAnalytics } })

            if (!clientData) {
                throw Unauthorized("client data does not exist");
            }

            if (updatedData.constituency) {
                updatedUserData['constituencyId'] = updatedData.constituency[0].constituencyId;
                await ClientUser.updateMany({ "organisationId": id }, { $set: { constituencyId: updatedData.constituency[0].constituencyId } });
            }

            if (req.authData.user.role === "client") {
                updatedUserData = updatedData;
            }
            await ClientUser.updateOne(
                { "organisationId": id }, updatedUserData, options
            );

            const updatedheadOffice = await ClientOffice.findOneAndUpdate(
                { "organizationID": id }, {
                $set: {
                    officeLocation: updatedData.headOffice.location,
                    constituencyName: updatedData.constituency[0].constituencyName,
                    officeName: updatedData.headOffice.officeName,
                    planStart: updatedData.validityStart,
                    planEnd: updatedData.validityEnd,
                    planType: updatedData.planType,
                }
            },
                { new: true }
            )

            await ClientOffice.updateMany(
                { $and: [{ "organizationID": id }, { _id: { $ne: updatedheadOffice._id } }] }, {
                $set: {
                    constituencyName: updatedData.constituency[0].constituencyName,
                    constituencyId: updatedData.constituency[0].constituencyId,
                }
            }
            )

            clientData.clientPassword = EncryptAndDecrypt.decrypt(clientData.clientPassword)

            if (updatedData.status === "deactivate") {
                await ClientUser.updateMany({ "organisationId": id }, { $set: { status: "deactivate" } });
            } else if (updatedData.status === "active") {
                await ClientUser.updateMany({ "organisationId": id }, { $set: { status: "active" } });
            }

            const changedFields = [];
            for (const key of Object.keys(updatedData)) {
            // Mask passwords
            if (key === 'password' || key === 'clientPassword') {
                changedFields.push({ key, from: '********', to: '********' });
            } else if (existingClient[key] !== updatedData[key]) {
                changedFields.push({
                key,
                from: existingClient[key] ?? 'null',
                to: updatedData[key] ?? 'null'
                });
            }
            }

            // --- Create Audit Log Entry ---
            await AuditLog.create({
            userId: req.authData?.user?._id,
            userName: `${req.authData?.user?.firstName || ''} ${req.authData?.user?.lastName || ''}`.trim(),
            userRole: req.authData?.user?.role || 'unknown',
            action: 'CLIENT_UPDATE',
            details: `Client ${existingClient?.adminFirstName || existingClient?.email}  ${existingClient?.adminLastName} updated by ${req.authData?.user?.firstName || 'System'}`,
            // ipAddress: getClientIp(req),
            changedFields
            });

            return {
                status: true,
                data: clientData,
                message: "Client updated successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    //Get Client User Info By Id
    static async getClientUserInfoById(id) {
        try {

            let clientInfo = await ClientUser.findById(id)
                .populate({
                    path: 'constituencyId',
                    model: 'Constituency'
                })
                .populate({
                    path: 'officeId',
                    model: 'ClientOffice'
                })
                // .populate({
                //      path: 'constituencyId',
                //     model: 'Parliment'
                // })
                .select('-lastpasswordchangedate -resetPasswordToken -password')

            if (!clientInfo) {
                throw Unauthorized("Client does not exist.");
            }
            // If constituencyId did not populate, try Parliment
            if (!clientInfo.constituencyId) {
                clientInfo = await ClientUser.findById(id)
                    .populate({
                        path: 'constituencyId',
                        model: 'Parliment'
                    })
                    .populate({
                    path: 'officeId',
                    model: 'ClientOffice'
                    })
                    .select('-lastpasswordchangedate -resetPasswordToken -password');
            }

            clientInfo.clientPassword = EncryptAndDecrypt.decrypt(clientInfo.clientPassword)
            let _client = clientInfo._doc;
            _client.constituency = clientInfo.constituencyId;
            delete _client.constituencyId;
            if (clientInfo.profileImageLink?.key) {
                const params = {
                    Bucket: process.env.BUCKET,
                    Key: clientInfo.profileImageLink.key
                };

                const command = new GetObjectCommand(params);
                let accessKeyId = process.env.ACCESS_KEY;
                let secretAccessKey = process.env.ACCESS_SECRET;
                const s3Client = new S3Client({ credentials: { accessKeyId, secretAccessKey }, region: process.env.REGION });
                let getUrl = await getSignedUrl(s3Client, command, { expiresIn: 180000 });

                _client.profileImageLink.publicUrl = getUrl
            }

            return {
                status: true,
                data: clientInfo,
                message: "Get client user info successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    // Update Client User
    static async updateClientUserInfoById(req) {
        try {

            // update client user
            const id = req.params.id;
            const updatedData = req.body;
            const options = { new: false };
            const getClientUser = await ClientUser.findOne({ "_id": id });

            if (!getClientUser) {
                throw Unauthorized("client user data does not exist");
            }

            const clientUserData = await ClientUser.findByIdAndUpdate(
                id, updatedData, options
            );

            if (req.authData.user.role === "client" && updatedData.clientPassword) {
                const updateClient = await Client.updateOne(
                    { "_id": getClientUser.organisationId }, { $set: { clientPassword: updatedData.clientPassword } }
                );
            }

            clientUserData.clientPassword = EncryptAndDecrypt.decrypt(updatedData.clientPassword || getClientUser.clientPassword)
            clientUserData.bio = updatedData.bio || getClientUser.bio;

            return {
                status: true,
                data: clientUserData,
                message: "Client updated successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    //get users of client which is currently logged in using officeId
    static async clientUserGetPagination(req) {
        const page = parseInt(req.page) || 1
        const limit = parseInt(req.limit) || 10

        const startIndex = (page - 1) * limit
        const endIndex = page * limit

        const results = {}
        const organisationId = req.authData.user.organisationId;
        let query = {};

        try {
            if (req.authData.user.role === 'client') {
                query = { organisationId: organisationId };
            } else if (req.authData.user.role === "office_manager" || req.authData.user.role === "constituency_manager" || req.authData.user.role === 'chief_of_staff') {
                const reportsToData = await getReportingIds(req.authData.user._id);
                query = {
                    _id: {
                        $in: [ObjectId(req.authData.user._id), ...reportsToData]
                    }
                };
            }
            let lookup = [
                {
                    '$lookup': {
                        'from': 'clientoffices',
                        'let': {
                            'officeId': '$officeId'
                        },
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        '$eq': [
                                            '$_id', '$$officeId'
                                        ]
                                    }
                                }
                            }, {
                                '$project': {
                                    '_id': 1,
                                    'officeName': 1
                                }
                            }
                        ],
                        'as': 'officeDetails'
                    }
                }, {
                    '$sort': {
                        'createdAt': -1
                    }
                }, {
                    '$skip': startIndex
                }, {
                    '$limit': limit
                }
            ];

            lookup = (req.query) ? req.query : lookup;

            ClientUser.countDocuments(query, function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    results.totalUser = result;
                    results.totalPages = Math.ceil(result / limit);
                }
            });

            if (endIndex < await ClientUser.countDocuments(query).exec()) {
                results.nextPage = page + 1;
            }

            if (page) {
                results.currentPage = page;
            }
            if (limit) {
                results.limit = limit;
            }

            if (startIndex > 0) {
                results.previousPage = page - 1;
            }

            if (organisationId) {
                let match = {}
                if (req.authData.user.role === 'client') {
                    match = {
                        '$match': {
                            'organisationId': new ObjectId(organisationId)
                        }
                    }
                } else if (req.authData.user.role === "office_manager" || req.authData.user.role === "constituency_manager" || req.authData.user.role === 'chief_of_staff') {
                    const reportsToData = await getReportingIds(req.authData.user._id);
                    match = {
                        $match: {
                            _id: {
                                $in: [ObjectId(req.authData.user._id), ...reportsToData]
                            }
                        }
                    };
                }

                lookup.push(match);
            }

            results.count = 0;
            results.results = await ClientUser.aggregate(lookup);

            // Add customClientId logic here
            const existingCustomIds = new Set(
                (await ClientUser.find({ customClientId: { $ne: null } }, { customClientId: 1 })).map(c => c.customClientId)
            );
            
            const enrichedUsers = [];
            for (let user of results.results) {
                // If no customClientId, generate and update
                if (!user.customClientId) {
                    let newId;
                    do {
                        newId = Math.floor(Math.random() * 90000) + 1000; // 4-5 digit number
                    } while (existingCustomIds.has(newId));
                    existingCustomIds.add(newId);

                    await ClientUser.updateOne({ _id: user._id }, { $set: { customClientId: newId } });

                    user.customClientId = newId; // Add it to response
                }

                enrichedUsers.push(user);
            }

            results.results = enrichedUsers; // Replace the result with enriched version
            // console.log("USers",results.results)
            const noData = false;
            if (!results) {
                throw Unauthorized("Clientuser does not exist");
            }
            results.count = results.results.length;
            return {
                status: 200,
                message: results.results.length === 0 ? 'no data available' : "Data Found successfully",
                data: results.results.length === 0 ? null : results,
                error: false,
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async clientOfficeGetPagination(req) {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 }

        const startIndex = (page - 1) * limit
        const endIndex = page * limit

        const results = {}
        let query = {};
        if (req.authData.user.organisationId) {
            const organisationId = req.authData.user.organisationId;
            query = { organizationID: organisationId }
        }

        ClientOffice.count(query, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                results.totalPages = Math.ceil(result / limit);
            }
        });

        if (endIndex < await ClientOffice.countDocuments(query).exec()) {
            results.nextPage = page + 1;
        }

        if (page) {
            results.currentPage = page;
        }
        if (limit) {
            results.limit = limit;
        }

        if (startIndex > 0) {
            results.previousPage = page - 1;
        }

        try {

            results.results = await ClientOffice.aggregate([
                { $match: { "organizationID": ObjectId(req.authData.user.organisationId) } },
                {
                    "$lookup": {
                        "from": "clientusers",
                        "localField": "_id",
                        "foreignField": "officeId",
                        "as": "office_info"
                    }
                },
                {
                    $project: {
                        assigned_users_count: { $size: "$office_info" },
                        officeName: 1,
                        organizationID: 1,
                        constituencyID: 1,
                        constituencyName: 1,
                        officeLocation: 1,
                        planType: 1,
                        planStart: 1,
                        planEnd: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                { $sort: sort },
                { $skip: startIndex },
                { $limit: limit }
            ])

            const noData = false;
            if (!results) {
                throw Unauthorized("Offices does not exist");
            }
            return {
                status: 200,
                message: results.results.length === 0 ? 'no data available' : "Data Found successfully",
                data: results.results.length === 0 ? null : results,
                error: false,
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    // getclientroles
    static async getclientroles(req) {
        try {
            let getBelowRoles;
            if (req.authData.user.role === 'client') {
                getBelowRoles = await clientRoleModel.find({})
            } else {
                const getClientRole = await clientRoleModel.findOne({ name: req.authData.user.role })
                getBelowRoles = await clientRoleModel.find({ level: { $gt: getClientRole.level } }).sort({ level: 1 })
            }
            if (getBelowRoles.length != 0) {
                return {
                    status: true,
                    data: getBelowRoles,
                    message: "Client Role found",
                    error: null
                };
            } else {
                return {
                    status: false,
                    data: [],
                    message: "Client Role Not found",
                    error: "Client Role Not found"
                };
            }
        }
        catch (error) {

            return {
                status: false,
                data: [],
                message: "Error while getting client Role",
                error
            };
        }
    }

    //updateClientProfile
    static async updateClientProfile(req) {

        const id = req.params.id;
        const updatedData = req.body;
        const options = { new: true, runValidators: true };

        const client = await ClientUser.findByIdAndUpdate(
            id, updatedData, options
        );
        if (!client) {
            throw Unauthorized("Client does not exist");
        }

        let { prefix, firstName, lastName, email, profileImageLink } = client;
        return {
            status: true,
            error: null,
            message: "Client profile update successfully",
            data: { id, prefix, firstName, lastName, email, profileImageLink },
        };
    }

    static async deleteClientProfile(req) {
    const id = req.params.id;

    const options = { new: true, runValidators: true };

    // Update the client document, remove profileImageLink
    const client = await ClientUser.findByIdAndUpdate(
        id,
        { $unset: { profileImageLink: "" } },
        options
    );

    if (!client) {
        throw Unauthorized("Client does not exist");
    }

    const { prefix, firstName, lastName, email } = client;
    return {
        status: true,
        error: null,
        message: "Client profile image removed successfully",
        data: { id, prefix, firstName, lastName, email, profileImageLink: null },
    };
}

    // SearchClientAdminByKeyword
    static async SearchClientAdminByKeyword(req) {
        console.log("my details are ", req.authData);
    
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;
        let totalPages;
    
        try {
            const keyword = req.query.keyword;
            let planLookup = {
                "from": "plans",
                "localField": "planType",
                "foreignField": "_id",
                "as": "planDetails",
            }
    
            if (keyword === undefined || keyword === " ") {
                return {
                    status: false,
                    data: null,
                    message: "keyword is empty",
                    error: "keyword is empty"
                };
            }
            let numericKeyword = parseInt(keyword);
            const isNumericKeyword = !isNaN(numericKeyword);
            // Build base match condition for keyword search
            const keywordMatchCondition = {
                $or: [
                    { 'adminFirstName': { '$regex': keyword, '$options': 'i' } },
                    { 'adminLastName': { '$regex': keyword, '$options': 'i' } },
                    { 'adminEmail': { '$regex': keyword, '$options': 'i' } },
                    { 'organisationName': { '$regex': keyword, '$options': 'i' } },
                    { 'status': { '$regex': keyword, '$options': 'i' } },
                    { 'constituency.constituencyName': { '$regex': keyword, '$options': 'i' } },
                    { 'constituency.constituencyState': { '$regex': keyword, '$options': 'i' } },
                    { 'planType.name': { '$regex': keyword, '$options': 'i' } },
                    ...(isNumericKeyword ? [{ customClientId: numericKeyword }] : [])   //Updated
                ]
            };
    
            // Add user permission check - if not superadmin, only show clients where user is assigned
            const isSuperAdmin = req.authData.user.role === 'superadmin';
            
            let matchCondition;
            if (isSuperAdmin) {
                // Superadmin can see all clients
                matchCondition = keywordMatchCondition;
            } else {
                // Non-superadmin users can only see clients where they are assigned
                matchCondition = {
                    $and: [
                        keywordMatchCondition,
                        { 'users._id': req.authData.user._id }
                    ]
                };
            }
    
            const foundClient = await Client.aggregate([
                {
                    $match: matchCondition
                },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                {
                    "$lookup": {
                        "from": "clientoffices",
                        "localField": "_id",
                        "foreignField": "organizationID",
                        "as": "clientOfficesDetails"
                    }
                },
                {
                    $project: {
                        grievances_count: { $size: "$grievancesDetails" },
                        _id: 1,
                        organisationName: 1,
                        constituency: 1,
                        headOffice: 1,
                        adminFirstName: 1,
                        adminLastName: 1,
                        adminEmail: 1,
                        adminContact: 1,
                        office: 1,
                        clientOfficeCount: { $size: "$clientOfficesDetails" },
                        planType: 1,
                        users: 1,
                        validityStart: 1,
                        validityEnd: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        status: 1,
                        customClientId:1
                    }
                },
                { $sort: sort },
                { $skip: no_of_docs_each_page * (current_page_number - 1) },
                { $limit: no_of_docs_each_page },
            ]);
    
            // Use the same match condition for counting total clients
            const totalClient = await Client.aggregate([
                {
                    $match: matchCondition
                },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
            ]);
    
            let totalclients = totalClient.length;
            totalPages = Math.ceil(totalclients / no_of_docs_each_page);
            
            if (endIndex < totalclients) {
                nextPage = current_page_number + 1;
            }
            if (startIndex > 0) {
                previousPage = current_page_number - 1;
            }
            
            if (foundClient.length != 0) {
                return {
                    status: true,
                    data: foundClient,
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalclients: totalclients,
                    message: "Client found",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: current_page_number,
                    totalPages,
                    totalclients,
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }
        }
        catch (error) {
            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching Client",
                error
            };
        }
    }


    // getAllClientAdmin
    static async getAllClientAdmin(req) {
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        let status = req.query.status;
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;
        let clientQuery = {};

        try {

            // Show all records to super admin but not to other users
            if (req.authData.user.role !== 'superadmin') {
                clientQuery['users'] = { $elemMatch: { _id: req.authData.user._id } }
            }

            if (status) {
                clientQuery['status'] = status
            }

            // function generateUniqueRandomIds(count, existingSet = new Set()) {
            //     const ids = [];
            //     while (ids.length < count) {
            //         const num = Math.floor(Math.random() * 90000) + 1000;
            //         if (!existingSet.has(num)) {
            //             existingSet.add(num);
            //             ids.push(num);
            //         }
            //     }
            //     return ids;
            // }

            //lookup is for getting the planName from Plans collection using planType(id) in client
            const foundClient = await Client.aggregate([
                {
                    $match: clientQuery
                },
                // {
                //     "$lookup": {
                //         "from": "plans",
                //         "localField": "planType",
                //         "foreignField": "_id",
                //         "as": "planDetails",
                //     }
                // },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                // {
                //     $unwind: "$planDetails" // Unwind the planDetails array
                // },
                // {
                //     $addFields: {
                //         filteredServices: {
                //             $filter: {
                //                 input: "$planDetails.services", // Input array to filter
                //                 as: "service", // Variable name for each service in the array
                //                 cond: true
                //             }
                //         }
                //     }
                // },

                {
                    $project: {
                        grievances_count: { $size: "$grievancesDetails" },
                        _id: 1,
                        organisationName: 1,
                        constituency: 1,
                        headOffice: 1,
                        prefix: 1,
                        adminFirstName: 1,
                        adminLastName: 1,
                        adminEmail: 1,
                        adminContact: 1,
                        office: 1,
                        planType: 1,
                        // planDetails: "$planDetails",
                        validityStart: 1,
                        validityEnd: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        users: 1,
                        status: 1,
                        constituency_district: 1,
                        constituency_state: 1,
                        password: 1,
                        planAmount: 1,
                        planDuration: 1,
                        customClientId: 1       //Updated
                    }
                },
                { $sort: sort },
                { $skip: no_of_docs_each_page * (current_page_number - 1) },
                { $limit: no_of_docs_each_page },
            ]);

            const totalClient = await Client.aggregate([
                {
                    $match: clientQuery
                },
                // {
                //     "$lookup": {
                //         "from": "plans",
                //         "localField": "planType",
                //         "foreignField": "_id",
                //         "as": "planDetails",
                //     }
                // },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },
                // {
                //     $unwind: "$planDetails" // Unwind the planDetails array
                // },
                // {
                //     $addFields: {
                //         filteredServices: {
                //             $filter: {
                //                 input: "$planDetails.services", // Input array to filter
                //                 as: "service", // Variable name for each service in the array
                //                 cond: true
                //             }
                //         }
                //     }
                // },

            ]);

            // let totalclients = await Client.countDocuments().exec();
            let totalclients = totalClient.length;
            var totalPages = Math.ceil(totalclients / no_of_docs_each_page);
            if (endIndex < totalclients) {
                nextPage = current_page_number + 1;
            }
            if (startIndex > 0) {
                previousPage = current_page_number - 1;
            }
            //Update Start
            const existingCustomIds = new Set(
                (await Client.find({ customClientId: { $ne: null } }, { customClientId: 1 })).map(c => c.customClientId)
            );
    
            const enrichedClients = [];
            for (let client of foundClient) {
                // If no customClientId, generate and update
                if (!client.customClientId) {
                    let newId;
                    do {
                        newId = Math.floor(Math.random() * 90000) + 1000;
                    } while (existingCustomIds.has(newId));
                    existingCustomIds.add(newId);
                
                    // Persist in DB
                    await Client.updateOne({ _id: client._id }, { $set: { customClientId: newId } });
    
                    client.customClientId = newId; // for response
                }
    
                enrichedClients.push(client);
            }
            //Update End

            // if (foundClient.length != 0) {
            if (enrichedClients.length != 0) {          //Udapted
                return {
                    status: true,
                    data: enrichedClients,      //Udpated
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalclients: totalclients,
                    message: "Client found",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: 0,
                    totalPages: 0,
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }

        }
        catch (error) {
            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching Client",
                error
            };
        }
    }
    static async getAllClients(req) {
        let sort = req.query.sort === "DES" ? { createdAt: -1 } : { createdAt: 1 };
        let clientQuery = {};
        let totalclients = 0;

        try {
            const user = req.authData.user;

            // Filter based on user role
            if (user.role !== "superadmin") {
            clientQuery["users"] = { $elemMatch: { _id: user._id } };
            }

            if (req.query.status) {
            clientQuery.status = req.query.status;
            }

            const foundClients = await Client.aggregate([
            { $match: clientQuery },
            {
                $project: {
                _id: 1,
                organisationName: 1,
                constituency: 1,
                headOffice: 1,
                prefix: 1,
                adminFirstName: 1,
                adminLastName: 1,
                adminEmail: 1,
                adminContact: 1,
                office: 1,
                planType: 1,
                validityStart: 1,
                validityEnd: 1,
                createdAt: 1,
                updatedAt: 1,
                users: 1,
                status: 1,
                constituency_district: 1,
                constituency_state: 1,
                password: 1,
                planAmount: 1,
                planDuration: 1,
                customClientId: 1,
                },
            },

            { $sort: sort },
            ]);

            totalclients = foundClients.length;

            
            return {
                status: true,
                data: foundClients,
                totalclients,
                message: "Clients fetched successfully",
                error: null,
            };
        } catch (error) {
            return {
            status: false,
            data: [],
            totalclients,
            message: "Error fetching clients",
            error: error.message || error,
            };
        }
}


    // getClientProfileImage
    static async getClientProfileImage(req) {
        try {

            const id = req.params.id;
            let query = { _id: id }

            const result = await ClientUser.findById(query, { profileImageLink: 1 });
            if (!result) {
                throw Unauthorized("Client does not exist");
            }

            if (result.profileImageLink) {

                const params = {
                    Bucket: process.env.BUCKET,
                    Key: result.profileImageLink.key
                };

                const command = new GetObjectCommand(params);
                let accessKeyId = process.env.ACCESS_KEY;
                let secretAccessKey = process.env.ACCESS_SECRET;
                const s3Client = new S3Client({ credentials: { accessKeyId, secretAccessKey }, region: process.env.REGION });
                let getUrl = await getSignedUrl(s3Client, command, { expiresIn: 180000 });

                result.profileImageLink.publicUrl = getUrl
            }


            return {
                status: true,
                data: result,
                message: "Got client profile successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async getTokenForCarder(req) {
        try {
            const email = req.body.email;

            // check if clientUser exist
            const clientUser = await ClientUser.findOne({ email }, { firstName: 1, lastName: 1, email: 1, phone: 1, role: 1, password: 1, _id: 1, subscription: 1, constituencyId: 1, organisationId: 1, officeId: 1, profileImageLink: 1 });

            if (!clientUser) {
                throw Unauthorized("clientUser does not exist");
            }
            let _clientUser = clientUser._doc;
            _clientUser.type = "client";
            const token = AccessToken.generateAccessToken(clientUser);

            const getConstituency = await Constituency.findOne({ _id: clientUser.constituencyId }, { __v: 0 });
            if (!getConstituency) {
                throw Unauthorized("Constituency does not exist");
            }

            const getClientOffice = await ClientOffice.findOne({ _id: clientUser.officeId }, { __v: 0 });
            if (!getClientOffice) {
                throw Unauthorized("getClientOffice does not exist");
            }

            if (clientUser.role === "cadre") {
                const getReportingClient = await ClientUser.findOne({ 'organisationId': clientUser.organisationId }, { __v: 0 });
                if (!getReportingClient) {
                    throw Unauthorized("Reporting Client does not exist");
                }
            }

            return {
                status: true,
                data: {
                    token
                },
                message: "Login successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async updateClientOfficeById(payload) {
        try {

            const options = { new: true };
            let query = payload.body;
            let filter = {
                _id: payload.params.id,
                organizationID: payload.authData.user.organisationId,
            }

            let getUpdatedOffice = await ClientOffice.updateOne(
                filter,
                { $set: query },
                options
            );

            if (!getUpdatedOffice) {
                throw Unauthorized("Couldn't update Office");
            }

            return {
                status: true,
                data: getUpdatedOffice,
                message: "Office updated successfully",
                error: null
            };

        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async deleteClientOfficeById(payload) {
        try {

            let result;
            if (payload.authData.user.type === "superadmin") {
                result = await Client.deleteOne({ _id: id });
            } else {
                result = await ClientOffice.deleteOne({
                    _id: payload.params.id,
                    organizationID: payload.authData.user.organisationId,
                });
            }

            if (result.deletedCount === 0) {
                throw Unauthorized("Client Office does not exist");
            }

            return {
                status: true,
                data: {
                    result
                },
                message: "Client Office Deleted Successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }

    static async getAllDeactivateClientAdmin(req) {
        const no_of_docs_each_page = parseInt(req.query.limit) || 10; // 10 docs in single page
        const current_page_number = parseInt(req.query.page) || 1; // 1st page
        let sort = req.query.sort == "DES" ? { createdAt: -1 } : { createdAt: 1 };
        const startIndex = (current_page_number - 1) * no_of_docs_each_page
        const endIndex = current_page_number * no_of_docs_each_page
        let nextPage;
        let previousPage;

        try {

            const foundClient = await Client.aggregate([
                { $match: { "status": "deactivate" } },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                },

                {
                    $project: {
                        grievances_count: { $size: "$grievancesDetails" },
                        _id: 1,
                        organisationName: 1,
                        constituency: 1,
                        headOffice: 1,
                        prefix: 1,
                        adminFirstName: 1,
                        adminLastName: 1,
                        adminEmail: 1,
                        adminContact: 1,
                        office: 1,
                        planType: 1,
                        // planDetails: "$planDetails",
                        validityStart: 1,
                        validityEnd: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        users: 1,
                        status: 1,
                        constituency_district: 1,
                        constituency_state: 1,
                        password: 1,
                        planAmount: 1,
                        planDuration: 1,
                    }
                },
                { $sort: sort },
                { $skip: no_of_docs_each_page * (current_page_number - 1) },
                { $limit: no_of_docs_each_page },
            ]);

            const totalClient = await Client.aggregate([
                { $match: { "status": "deactivate" } },
                {
                    "$lookup": {
                        "from": "grievances",
                        "localField": "_id",
                        "foreignField": "clientId",
                        "as": "grievancesDetails"
                    }
                }
            ]);

            let totalclients = totalClient.length;
            var totalPages = Math.ceil(totalclients / no_of_docs_each_page);
            if (endIndex < totalclients) {
                nextPage = current_page_number + 1;
            }
            if (startIndex > 0) {
                previousPage = current_page_number - 1;
            }
            if (foundClient.length != 0) {
                return {
                    status: true,
                    data: foundClient,
                    currentPage: current_page_number,
                    totalPages,
                    nextPage,
                    previousPage,
                    totalclients: totalclients,
                    message: "Get All Deactivate Client Successfully.",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    currentPage: current_page_number,
                    totalPages,
                    totalclients,
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }

        }
        catch (error) {
            return {
                status: false,
                data: [],
                currentPage: current_page_number,
                totalPages,
                message: "Error searching Client",
                error
            };
        }
    }

    static async organizationalHierarchy(req) {
        try {
            if (!req.authData.user.type === 'client' && !req.authData.user.organisationId) {
                return {
                    status: false,
                    data: [],
                    message: "You are not authorized to view this page",
                    error: "You are not authorized to view this page"
                };
            }
            let matchQuery = {};
            if (req.authData.user.role === "constituency_manager") {
                const reportsToData = await getReportingIds(req.authData.user._id);
                matchQuery = {
                    _id: {
                        $in: [ObjectId(req.authData.user._id), ...reportsToData]
                    }
                };
            } else {
                matchQuery = { organisationId: ObjectId(req.authData.user.organisationId) };
            }
            const foundClient = await ClientUser.aggregate([
                {
                    $match: matchQuery
                },
                {
                    $lookup: {
                        from: 'clientoffices',
                        localField: 'officeId',
                        foreignField: '_id',
                        as: 'officeDetails'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        prefix: 1,
                        firstName: 1,
                        lastName: 1,
                        organisationId: 1,
                        officeId: 1,
                        constituencyId: 1,
                        role: 1,
                        status: 1,
                        profileImageLink: 1,
                        reportsTo: 1,
                        officeName: { $arrayElemAt: ["$officeDetails.officeName", 0] }
                    }
                }
            ])

            const organizationalHierarchy = await GenerateOrganizationalHierarchy.generateHierarchy(JSON.parse(JSON.stringify(foundClient)));
            if (foundClient.length != 0) {
                return {
                    status: true,
                    data: organizationalHierarchy,
                    message: "Get All Deactivate Client Successfully.",
                    error: null
                };
            }
            else {
                return {
                    status: false,
                    data: [],
                    message: "Client Not found",
                    error: "Client Not found"
                };
            }

        }
        catch (error) {
            return {
                status: false,
                data: [],
                message: "Error searching Client",
                error
            };
        }
    }

    static async organizationalUsersList(req) {
        try {
            const { role } = req.query;
            const reportsToRoles = GetLayeredAccess.getReportsToByRole(role);
            if (req.authData.user.role === "admin" || req.authData.user.role === "client" || req.authData.user.role === "chief_of_staff" || req.authData.user.role === "constituency_manager") {
                const reportsToData = await getReportingIds(req.authData.user._id);
                const organizationalUsers = await ClientUser.find(
                    {
                        organisationId: req.authData.user.organisationId,
                        _id: { $in: [req.authData.user._id, ...reportsToData] },
                        role: { $in: reportsToRoles }
                    },
                    { _id: 1, prefix: 1, firstName: 1, lastName: 1, organisationId: 1, role: 1, status: 1 }
                );

                return {
                    status: true,
                    data: organizationalUsers,
                    message: "Organizational users fetch successfully",
                    error: null
                };
            }

            return {
                status: false,
                data: [],
                message: "You are not authorized to view organizational users",
                error: "You are not authorized to view organizational users"
            };

        } catch (error) {
            return {
                status: false,
                data: [],
                message: "Error while fetching client users",
                error
            };
        }
    }

    //finds user then adds token and sends mail to user with reset password link
    static async requestPasswordReset(email) {
        try {
            const user = await ClientUser.findOne({ email });
            if (!user) return (
                {
                    status: false,
                    message: "clientuser not found",
                    error: "clientuser not found",
                    data: user
                }
            )

            const id = user.id;
            const options = { new: true };
            //throw new Error("User does not exist");
            //find the user with resetpasswordtoken field
            let founduser = await ClientUser.findOne({ resetPasswordToken: user.resetPasswordToken });
            //if token is alredy present then replace with the latest password generated
            if (founduser.resetPasswordToken) {
                await ClientUser.findByIdAndUpdate(
                    id, { resetPasswordToken: null }, options
                );

            }
            //console.log("resetPasswordToken after : ",resetPasswordToken);
            let resetToken = crypto.randomBytes(32).toString("hex");
            const hash = await bcrypt.hash(resetToken, Number(process.env.BCRYPT_SALT));
            //add the hashed token to the user
            const updateduser = await ClientUser.findByIdAndUpdate(
                id, { resetPasswordToken: hash }, options
            );
            //if user is not found
            if (!updateduser) {
                return ({ status: false, message: "clientuser does not exist", error: "clientuser does not exist", data: updateduser })
            }
            //generate a link with token and userid
            const link = `${process.env.CLIENT_URL}/#/api/clients/auth/passwordReset?token=${resetToken}&id=${user._id}`;
            //sends mail to user with password reset link

            if (!user.phone) {
                return (
                    {
                        status: false,
                        message: "clientuser phone number not found",
                        error: "clientuser phone number not found",
                        data: user
                    }
                );
            }


            const resp = await sendSMS(`Click ${link} to reset your password`, user.phone);

            // const resp = await sendEmailPasswordReset(user.email, "Password Reset Request", { data: `<p>Click <a href=${link}>here</a> to reset your password</p>` });

            //if everything went well the return status as true

            if (!resp) {
                return {
                    status: false,
                    data: null,
                    message: "Message not sent",
                    error: "Message Not Sent"
                }
            }
            else {
                return {
                    status: true,
                    data: "Message sent successfully",
                    message: "Message sent successfully",
                    error: null
                }
            }
        }
        catch (error) {
            return {
                status: false,
                data: null,
                message: "Message not sent",
                error: error
            }
        }
    }

    //this function gets called when link gets clicked from users email to match user and reset password
    static async resetPassword(req) {
        try {
            if (req.body.password.length < 3 || req.body.password === undefined) {
                return {
                    status: false,
                    message: "password is too short",
                    data: null,
                    error: "password is too short"
                };
            }
            let userId = req.query.id;
            let token = req.query.token;
            if (req.body.password) {
                const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
                const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
                const hash = bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                req.body.clientPassword = encryptedPassword;
            }
            let foundUser = await ClientUser.findOne({ _id: userId });
            if (!foundUser) {
                return {
                    status: false,
                    message: "clientuser not found for password update",
                    data: foundUser,
                    error: "clientuser not found for password update"
                }
            }

            let passwordResetToken = foundUser.resetPasswordToken;

            if (!passwordResetToken) {
                return {
                    status: false,
                    message: "password reset token is not valid",
                    data: passwordResetToken,
                    error: "password reset token is not valid"
                }
            }
            const isValid = await bcrypt.compare(token, passwordResetToken);
            if (!isValid) {
                return {
                    status: false,
                    message: "token doesn't match",
                    data: isValid,
                    error: "token doesn't match"
                }
            }

            await ClientUser.updateOne(
                { _id: userId },
                { $set: { password: req.body.password, clientPassword: req.body.clientPassword, lastpasswordchangedate: new Date() } },
                { new: true }
            );
            const user = await ClientUser.findById({ _id: userId });
            const resp = await sendSMS(`Your Password was changed Successfully on Polstrat`, user.phone);
            // sendEmailPasswordReset(
            //     user.email,
            //     "Password Reset Successfully",
            //     { data: "Your Password was changed Successfully on Polstrat" }
            // );
            //after reseting the password reset the token 
            const updateduser = await ClientUser.findByIdAndUpdate(
                userId, { resetPasswordToken: null }
            );

            return { status: true, message: "password updated sucessfully", data: updateduser, error: null }
        }
        catch (error) {
            return {
                status: false,
                message: "error in updating password",
                data: null,
                error: error
            }
        }
    };

    static async deleteProfileImage(req) {
        try {
            const id = req.params.id;
            let query = { _id: id }

            const result = await ClientUser.findByIdAndUpdate(query, { $set: { profileImageLink: {} } });
            if (!result) {
                throw Unauthorized("Client does not exist");
            }

            return {
                status: true,
                data: result,
                message: "Profile Image deleted successfully",
                error: null
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: error.message,
                error
            };
        }
    }
}

module.exports = ClientServices;
