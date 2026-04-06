const { Forbidden, NotFound } = require("http-errors");
const StudentShortlist = require("../models/studentShortlist.model");
const Career = require("../models/career.model");
const University = require("../models/university.model");

class StudentShortlistService {
  static async getOrCreateShortlist(studentId) {
    let shortlist = await StudentShortlist.findOne({ studentId });

    if (!shortlist) {
      shortlist = await StudentShortlist.create({
        studentId,
        shortlistedCareers: [],
        shortlistedUniversities: [],
      });
    }

    return shortlist;
  }

  static async getShortlist(payload) {
    try {
      const { user } = payload.authData;

      if (user.type !== "student") {
        throw Forbidden("Only students can access shortlist data");
      }

      const shortlist = await StudentShortlist.findOne({
        studentId: user._id,
      })
        .populate({
          path: "shortlistedCareers",
          match: { isDeleted: false },
          options: { sort: { createdAt: -1 } },
        })
        .populate({
          path: "shortlistedUniversities",
          match: { isDeleted: false },
          options: { sort: { createdAt: -1 } },
        });

      return {
        status: true,
        data: {
          shortlistedCareers: shortlist?.shortlistedCareers || [],
          shortlistedUniversities: shortlist?.shortlistedUniversities || [],
        },
        message: "Shortlist fetched successfully",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }

  static async toggleCareerShortlist(payload) {
    try {
      const { user } = payload.authData;
      const { careerId } = payload.body;

      if (user.type !== "student") {
        throw Forbidden("Only students can shortlist careers");
      }

      if (!careerId) throw Forbidden("careerId is required");

      const career = await Career.findOne({ _id: careerId, isDeleted: false });
      if (!career) throw NotFound("Career not found");

      const shortlist = await this.getOrCreateShortlist(user._id);
      const careerExists = shortlist.shortlistedCareers.some(
        (item) => item.toString() === careerId
      );

      shortlist.shortlistedCareers = careerExists
        ? shortlist.shortlistedCareers.filter(
            (item) => item.toString() !== careerId
          )
        : [...shortlist.shortlistedCareers, careerId];

      await shortlist.save();

      const updatedShortlist = await StudentShortlist.findOne({
        studentId: user._id,
      }).populate({
        path: "shortlistedCareers",
        match: { isDeleted: false },
        options: { sort: { createdAt: -1 } },
      });

      return {
        status: true,
        data: {
          shortlistedCareers: updatedShortlist?.shortlistedCareers || [],
          isShortlisted: !careerExists,
        },
        message: careerExists
          ? "Career removed from shortlist"
          : "Career added to shortlist",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }

  static async toggleUniversityShortlist(payload) {
    try {
      const { user } = payload.authData;
      const { universityId } = payload.body;

      if (user.type !== "student") {
        throw Forbidden("Only students can shortlist universities");
      }

      if (!universityId) throw Forbidden("universityId is required");

      const university = await University.findOne({
        _id: universityId,
        isDeleted: false,
      });

      if (!university) throw NotFound("University not found");

      const shortlist = await this.getOrCreateShortlist(user._id);
      const universityExists = shortlist.shortlistedUniversities.some(
        (item) => item.toString() === universityId
      );

      shortlist.shortlistedUniversities = universityExists
        ? shortlist.shortlistedUniversities.filter(
            (item) => item.toString() !== universityId
          )
        : [...shortlist.shortlistedUniversities, universityId];

      await shortlist.save();

      const updatedShortlist = await StudentShortlist.findOne({
        studentId: user._id,
      }).populate({
        path: "shortlistedUniversities",
        match: { isDeleted: false },
        options: { sort: { createdAt: -1 } },
      });

      return {
        status: true,
        data: {
          shortlistedUniversities:
            updatedShortlist?.shortlistedUniversities || [],
          isShortlisted: !universityExists,
        },
        message: universityExists
          ? "University removed from shortlist"
          : "University added to shortlist",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }
}

module.exports = StudentShortlistService;
