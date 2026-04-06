const { Forbidden } = require("http-errors");
const University = require("../models/university.model");

class UniversityService {

  /* ================================
     CREATE UNIVERSITY
  =================================*/
  static async createUniversity(payload) {
    try {
      const { user } = payload.authData;

      /* 1. AUTH */
      if (user.role !== "superadmin") {
        throw Forbidden("You are not allowed to create universities");
      }

      /* 2. EXTRACT BODY */
      const {
        name,
        city,
        state,
        rankAccreditation,
        modeOfEntry,
        acceptanceRate,
        cutOffTrend,
        entranceExams,
        officialWebsite
      } = payload.body;

      if (!name) throw Forbidden("University name is required");

      /* 3. CREATE */
      const university = await University.create({
        name,
        city,
        state,
        rankAccreditation,
        modeOfEntry,
        acceptanceRate,
        cutOffTrend,
        entranceExams: entranceExams || [],
        officialWebsite,
        createdBy: user._id
      });

      return {
        status: true,
        data: university.toObject(),
        message: "University created successfully",
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

  /* ================================
     GET UNIVERSITIES
  =================================*/
  static async getUniversity(payload) {
    try {
      const {
        keyword,
        state,
        city,
        page = 1,
        limit = 50
      } = payload.query;
      console.log("payload.query",payload.query)
      const skip = (Number(page) - 1) * Number(limit);

      const query = {
        isDeleted: false
      };

      if (state) query.state = state;
      if (city) query.city = city;

      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: "i" } },
          { city: { $regex: keyword, $options: "i" } },
          { state: { $regex: keyword, $options: "i" } },
          { rankAccreditation: { $regex: keyword, $options: "i" } }
        ];
      }

      const [universities, total] = await Promise.all([
        University.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),

        University.countDocuments(query)
      ]);

      console.log("universities",universities)

      return {
        status: true,
        data: universities,
        message: "Universities fetched successfully",
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

}

module.exports = UniversityService;
