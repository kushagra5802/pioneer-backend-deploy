const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const mongoose = require("mongoose");
const Career = require("../models/career.model")

class CareerService {

    static async createCareer(payload) {
        try {
            const { user } = payload.authData;

            /* ----------------------------------
            1. AUTHORIZATION
            -----------------------------------*/
            if (user.role !== "superadmin") {
            throw Forbidden("You are not allowed to create careers");
            }

            // const schoolId = user.schoolId;
            // if (!schoolId) throw Forbidden("School context missing");

            /* ----------------------------------
            2. EXTRACT & VALIDATE BODY
            -----------------------------------*/
            const {
            title,
            industry,
            description,
            progression,
            keySkills,
            topInstitutionsIndia,
            globalPathways
            } = payload.body;

            if (!title) throw Forbidden("Career title is required");
            if (!industry) throw Forbidden("Industry is required");
            if (!description) throw Forbidden("Description is required");
            if (!progression) throw Forbidden("Progression is required");
            if (!Array.isArray(keySkills) || keySkills.length === 0) {
            throw Forbidden("At least one key skill is required");
            }

            /* ----------------------------------
            3. CREATE CAREER
            -----------------------------------*/
            const career = await Career.create({
            // schoolId,
            title,
            industry,
            description,
            progression,
            keySkills,
            topInstitutionsIndia: topInstitutionsIndia || [],
            globalPathways: globalPathways || [],
            createdBy: user._id
            });

            /* ----------------------------------
            4. RESPONSE
            -----------------------------------*/
            const response = career.toObject();

            return {
            status: true,
            data: response,
            message: "Career created successfully",
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

    static async getCareer(payload) {
        try {
            // const { user } = payload.authData;

            /* ----------------------------------
            1. AUTH & SCHOOL CONTEXT
            -----------------------------------*/
            // if (!user || !user.schoolId) {
            // throw Forbidden("School context missing");
            // }

            // const schoolId = user.schoolId;

            /* ----------------------------------
            2. EXTRACT QUERY PARAMS
            -----------------------------------*/
            const {
            keyword,
            industry,
            page = 1,
            limit = 50
            } = payload.query;

            const skip = (Number(page) - 1) * Number(limit);

            /* ----------------------------------
            3. BUILD QUERY
            -----------------------------------*/
            const query = {
            // schoolId,
            isDeleted: false,
            };

            // Industry filter
            if (industry) {
            query.industry = industry;
            }
            if (keyword) {
                query.$or = [
                    { title: { $regex: keyword, $options: "i" } },
                    { industry: { $regex: keyword, $options: "i" } },
                    { description: { $regex: keyword, $options: "i" } },
                    { keySkills: { $regex: keyword, $options: "i" } }
                ];
            }
            console.log("query",query)
            /* ----------------------------------
            4. FETCH DATA
            -----------------------------------*/
            const [careers, total] = await Promise.all([
            Career.find(query)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(Number(limit)),

            Career.countDocuments(query)
            ]);

            /* ----------------------------------
            5. RESPONSE
            -----------------------------------*/
            return {
            status: true,
            data: careers,
            message: "Careers fetched successfully",
            error: null,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)) || 1
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

    static async getIndustries() {
        try {

            /* ----------------------------------
            1. FETCH UNIQUE INDUSTRIES
            -----------------------------------*/
            const industries = await Career.distinct("industry", {
                isDeleted: false
            });

            /* ----------------------------------
            2. OPTIONAL: SORT ALPHABETICALLY
            -----------------------------------*/
            industries.sort((a, b) => a.localeCompare(b));

            /* ----------------------------------
            3. RESPONSE
            -----------------------------------*/
            return {
                status: true,
                data: industries,
                message: "Unique industries fetched successfully",
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

module.exports = CareerService;
