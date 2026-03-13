
const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const School = require('../models/school.model')
const SchoolUser = require('../models/schoolUser.model')
const { createAuditLog } = require('../utils/auditLogger');
const EncryptAndDecrypt = require("../utils/utils.encryptAndDecrypt");
const AccessToken = require("../utils/utils.accessToken");
const generateSchoolCode = require("../utils/generateSchoolCode")
const mongoose = require("mongoose");

class SchoolServices {

    static async loginEmailOrPhone(req) {
        try {
            const { email, phone, password } = req.body;
            let clientUser;
            if (email) {
                clientUser = await SchoolUser.findOne({ email });
            } else if (phone) {
                clientUser = await SchoolUser.findOne({ phone });
            }
            if (!clientUser) {
                throw Unauthorized("clientUser does not exist");
            }

            if (!clientUser?.isActive) {
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


            // if (clientUser.officeId) {

            //     const getClientOffice = await ClientOffice.findOne({ _id: clientUser.officeId }, { __v: 0 });
            //     if (!getClientOffice) {
            //         throw Unauthorized("getClientOffice does not exist");
            //     }

            //     _clientUser.officeLocation = getClientOffice.officeLocation;
            //     _clientUser.officeName = getClientOffice.officeName;
            // }

            if (clientUser?.profileImageLink?.key) {

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

            if (process.env.CLIENT_TWO_FACTOR_LOGIN === 'true' && phone) {

                console.log("generating otp >>>>>>>>>>");
                const OTP = await crypto.randomInt(1000, 9999);

                console.log("OTP >>>>>>>>>>", OTP);
                const twilioResponse = await sendSMS(`One Time Password: ${OTP}`, clientUser.phone);

                if (clientUser.phone) {
                    await SchoolUser.updateOne({ phone: clientUser.phone }, { $set: { otpObject: { otp: OTP, createdAt: new Date() } } });
                } else if (clientUser.email) {
                    await SchoolUser.updateOne({ email: clientUser.email }, { $set: { otpObject: { otp: OTP, createdAt: new Date() } } });
                }

                return {
                    status: true,
                    data: null,
                    message: "OTP sent on registered mobile number",
                    error: null
                };
            }
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

    static async createSchoolUser(payload) {
      try {
          const { user } = payload.authData;
          /* ----------------------------------
          1. AUTHORIZATION
          -----------------------------------*/

          if (user.role !== "SCHOOL_ADMIN") {
          throw Forbidden("You are not allowed to create school users");
          }

          const schoolId = user.schoolId;

          if (!schoolId) {
          throw Forbidden("School context missing");
          }

          /* ----------------------------------
          2. REQUEST BODY
          -----------------------------------*/

          const {
          firstName,
          lastName,
          email,
          phone,
          role,
          permissions = [],
          password,
          isActive = true
          } = payload.body;

          if (!firstName || !lastName || !email || !password) {
          throw Forbidden("Missing required fields");
          }

          /* ----------------------------------
          3. DUPLICATE CHECKS
          -----------------------------------*/

          const existingEmail = await SchoolUser.findOne({ email });
          if (existingEmail) {
          throw Forbidden("Email already exists");
          }

          if (phone) {
          const existingPhone = await SchoolUser.findOne({ phone });
          if (existingPhone) {
              throw Forbidden("Phone already exists");
          }
          }

          /* ----------------------------------
          4. CREATE SCHOOL USER
          -----------------------------------*/

          const schoolUser = await SchoolUser.create({
          schoolId,
          firstName,
          lastName,
          email,
          phone,
          role,
          permissions,
          password,
          isActive,
          createdBy: user._id
          });

          if (!schoolUser) {
          throw InternalServerError("Unable to create school user");
          }

          /* ----------------------------------
          5. SANITIZE RESPONSE
          -----------------------------------*/

          const userResponse = schoolUser.toObject();
          delete userResponse.password;

          /* ----------------------------------
          6. AUDIT LOG
          -----------------------------------*/

          await createAuditLog({
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: "SCHOOL_USER_CREATED",
          details: `User ${firstName} ${lastName} created in school ${schoolId}`
          });

          /* ----------------------------------
          7. RESPONSE
          -----------------------------------*/

          return {
          status: true,
          data: userResponse,
          message: "School user created successfully",
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

    static async getSchoolUser(payload) {
      try {
        const { user } = payload.authData;
        console.log("user",user)
        /* ----------------------------------
          1. AUTHORIZATION
        -----------------------------------*/

        if (user.role !== "SCHOOL_ADMIN") {
          throw Forbidden("You are not allowed to view school users");
        }

        const schoolId = new mongoose.Types.ObjectId(user.schoolId);
        console.log("schoolObjectId",schoolId)
        if (!schoolId) {
          throw Forbidden("School context missing");
        }

        /* ----------------------------------
          2. QUERY PARAMS
        -----------------------------------*/

        const {
          page = 1,
          limit = 10,
          keyword,
          role,
          isActive
        } = payload.query || {};

        const skip = (Number(page) - 1) * Number(limit);

        /* ----------------------------------
          3. MATCH CONDITIONS
        -----------------------------------*/

        const matchStage = {
          schoolId
        };

        if (typeof isActive !== "undefined") {
          matchStage.isActive = isActive === "true";
        }

        if (role) {
          matchStage.role = role;
        }

        if (keyword) {
          matchStage.$or = [
            { firstName: { $regex: keyword, $options: "i" } },
            { lastName: { $regex: keyword, $options: "i" } },
            { email: { $regex: keyword, $options: "i" } },
            { phone: { $regex: keyword, $options: "i" } },
            { role: { $regex: keyword, $options: "i" } }
          ];
        }

        /* ----------------------------------
          4. AGGREGATION PIPELINE
        -----------------------------------*/

        const pipeline = [
          { $match: matchStage },

          {
            $project: {
              password: 0 
            }
          },

          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: Number(limit) }
        ];

        /* ----------------------------------
          5. EXECUTE QUERY
        -----------------------------------*/

        const [users, total] = await Promise.all([
          SchoolUser.aggregate(pipeline),
          SchoolUser.countDocuments(matchStage)
        ]);

        /* ----------------------------------
          6. RESPONSE
        -----------------------------------*/

        return {
          status: true,
          data: users,
          total,
          message: "School users fetched successfully",
          error: null
        };

      } catch (error) {
        return {
          status: false,
          data: null,
          total: 0,
          message: error.message || "Unable to fetch school users",
          error
        };
      }
    }

    static async createSchool(payload) {
      try {
        const { user } = payload.authData;

        if (user.type !== "superadmin") {
          throw Forbidden("You are not allowed to create a school");
        }

        const {
          schoolName,
          board,
          state,
          city,
          adminFirstName,
          adminLastName,
          adminEmail,
          adminPhone,
          clientPassword
        } = payload.body;

        /* ----------------------------------
        1. DUPLICATE CHECKS
        -----------------------------------*/

        const existingSchool = await School.findOne({
          name: schoolName,
          "location.state": state,
          "location.city": city
        });

        if (existingSchool) {
          throw Forbidden("School already exists in this city");
        }

        /* ----------------------------------
        2. GENERATE SCHOOL CODE
        -----------------------------------*/

        const schoolCode = generateSchoolCode(schoolName);

        // const existingCode = await School.findOne({ schoolCode });
        // if (existingCode) {
        //   throw Forbidden("Generated school code already exists");
        // }

        /* ----------------------------------
        3. CREATE SCHOOL
        -----------------------------------*/

        const school = await School.create({
          name: schoolName,
          schoolCode,
          board,
          location: { state, city },
          isActive: true
        });

        if (!school) {
          throw InternalServerError("Unable to create school");
        }

        /* ----------------------------------
        4. CREATE SCHOOL ADMIN
        -----------------------------------*/

        const schoolAdmin = await SchoolUser.create({
          schoolId: school._id,
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phone: adminPhone,
          password: clientPassword,
          role: "SCHOOL_ADMIN",
          isActive: true,
          createdBy: user._id
        });

        schoolAdmin.password = undefined;

        /* ----------------------------------
        5. AUDIT LOG
        -----------------------------------*/

        await createAuditLog({
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: "SCHOOL_CREATED",
          details: `School ${school.name} (${schoolCode}) created`
        });

        /* ----------------------------------
        6. RESPONSE
        -----------------------------------*/

        return {
          status: true,
          data: { school, schoolAdmin },
          message: "School created successfully",
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


    /* ======================================================
     GET SCHOOLS (WITH / WITHOUT SEARCH)
    ====================================================== */
    static async getSchools(payload) {
        try {
        const { page = 1, limit = 10, keyword } = payload.query;

        const skip = (page - 1) * limit;

        /* ----------------------------------
            SEARCH CONDITION
        ----------------------------------- */
        const matchStage = {
            isActive: true
        };

        if (keyword) {
            matchStage.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { board: { $regex: keyword, $options: "i" } },
            { "location.city": { $regex: keyword, $options: "i" } },
            { "location.state": { $regex: keyword, $options: "i" } }
            ];
        }

        /* ----------------------------------
            AGGREGATION PIPELINE
        ----------------------------------- */
        const pipeline = [
            { $match: matchStage },

            {
            $lookup: {
                from: "schoolusers",
                localField: "_id",
                foreignField: "schoolId",
                as: "admins"
            }
            },

            {
            $addFields: {
                admin: {
                $arrayElemAt: [
                    {
                    $filter: {
                        input: "$admins",
                        as: "admin",
                        cond: { $eq: ["$$admin.role", "SCHOOL_ADMIN"] }
                    }
                    },
                    0
                ]
                }
            }
            },

            {
            $project: {
                schoolName: "$name",
                board: 1,
                city: "$location.city",
                state: "$location.state",
                adminEmail: "$admin.email",
                adminPhone: "$admin.phone",
                createdAt: 1
            }
            },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) }
        ];

        const [schools, total] = await Promise.all([
            School.aggregate(pipeline),
            School.countDocuments(matchStage)
        ]);

        return {
            status: true,
            data: schools,
            total,
            message: "Schools fetched successfully",
            error: null
        };

        } catch (error) {
        return {
            status: false,
            data: null,
            total: 0,
            message: error.message || "Unable to fetch schools",
            error
        };
        }
    }

    /* ======================================================
     1. GET SCHOOL BY ID
  ====================================================== */
  static async getSchoolById(payload) {
  try {
    const { id } = payload.params;

    const school = await School.aggregate([
      { $match: { _id: require("mongoose").Types.ObjectId(id) } },

      {
        $lookup: {
          from: "schoolusers",
          localField: "_id",
          foreignField: "schoolId",
          as: "admins"
        }
      },

      {
        $addFields: {
          admin: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$admins",
                  as: "admin",
                  cond: { $eq: ["$$admin.role", "SCHOOL_ADMIN"] }
                }
              },
              0
            ]
          }
        }
      },

      {
        $project: {
          schoolName: "$name",
          board: 1,
          city: "$location.city",
          state: "$location.state",
          schoolCode:1,
          adminFirstName: "$admin.firstName",
          adminLastName: "$admin.lastName",
          adminEmail: "$admin.email",
          adminPhone: "$admin.phone",

          // 🔐 password fields
          password: "$admin.password",              

          isActive: 1,
          createdAt: 1
        }
      }
    ]);

    if (!school || school.length === 0) {
      throw NotFound("School not found");
    }
    /* ----------------------------------
       SAFE PASSWORD DECRYPTION
    ----------------------------------- */
    let decryptedPassword = '';
    if (school[0].password) {
      try {
        decryptedPassword = EncryptAndDecrypt.decrypt(
          school[0].password
        );
      } catch (err) {
        console.warn(
          "School admin password decryption failed:",
          err.message
        );
        decryptedPassword = '';
      }
    }
    console.log("decryptedPassword",decryptedPassword)
    school[0].password = decryptedPassword;

    return {
      status: true,
      data: school[0],
      message: "School fetched successfully",
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


  /* ======================================================
     2. DELETE SCHOOL (SOFT DELETE)
  ====================================================== */
  static async deleteSchool(payload) {
    try {
      const { id } = payload.params;
      const { user } = payload.authData;

      if (user.type !== "superadmin") {
        throw Forbidden("You are not allowed to delete a school");
      }

      const school = await School.findById(id);
      if (!school) {
        throw NotFound("School not found");
      }

      /* ----------------------------------
         SOFT DELETE SCHOOL + USERS
      ----------------------------------- */
      await School.findByIdAndUpdate(id, { isActive: false });

      await SchoolUser.updateMany(
        { schoolId: id },
        { isActive: false }
      );

      /* ----------------------------------
         AUDIT LOG
      ----------------------------------- */
      await createAuditLog({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: "SCHOOL_DELETED",
        details: `School ${school.name} deleted by ${user.firstName}`
      });

      return {
        status: true,
        data: null,
        message: "School deleted successfully",
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
  /* ======================================================
     3. EDIT / UPDATE SCHOOL
  ====================================================== */
  static async updateSchool(payload) {
    try {
      const { id } = payload.params;
      const { user } = payload.authData;
      const {
        schoolName,
        board,
        state,
        city,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
        password,
        clientPassword
        } = payload.body;
      if (user.type !== "superadmin") {
        throw Forbidden("You are not allowed to update a school");
      }

      const school = await School.findById(id);
      if (!school) {
        throw NotFound("School not found");
      }

      /* ----------------------------------
         CHECK DUPLICATE SCHOOL
      ----------------------------------- */
      const duplicateSchool = await School.findOne({
        _id: { $ne: id },
        name: schoolName,
        "location.state": state,
        "location.city": city
      });

      if (duplicateSchool) {
        throw Forbidden("School already exists in this city");
      }

      /* ----------------------------------
         UPDATE SCHOOL
      ----------------------------------- */
      await School.findByIdAndUpdate(id, {
        name: schoolName,
        board,
        location: { state, city }
      });

      if(!school?.schoolId || schoolName){
        const schoolCode = generateSchoolCode(schoolName);
        await School.findByIdAndUpdate(id, {
        schoolCode
      });
      }

      /* ----------------------------------
         UPDATE SCHOOL ADMIN
      ----------------------------------- */
      const admin = await SchoolUser.findOne({
        schoolId: id,
        role: "SCHOOL_ADMIN"
      });

      if (!admin) {
        throw InternalServerError("School admin not found");
      }

      const adminUpdatePayload = {
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        phone: adminPhone
        };

        if (clientPassword) {
        // adminUpdatePayload.password = password;
        adminUpdatePayload.password = clientPassword;
        }

        await SchoolUser.findByIdAndUpdate(admin._id, adminUpdatePayload);

      /* ----------------------------------
         AUDIT LOG
      ----------------------------------- */
      await createAuditLog({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: "SCHOOL_UPDATED",
        details: `School ${school.name} updated by ${user.firstName}`
      });

      return {
        status: true,
        data: null,
        message: "School updated successfully",
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

module.exports = SchoolServices;
