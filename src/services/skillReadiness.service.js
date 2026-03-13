const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const mongoose = require("mongoose");
const Skill = require('../models/skillReadiness/skill.model')
const Week = require("../models/skillReadiness/week.model")
const SkillResource = require("../models/skillReadiness/skillResource.model");
const Assessment = require("../models/skillReadiness/assessment.model")
const AssignmentSubmission = require("../models/skillReadiness/assessmentSubmission.model")
const Question = require("../models/skillReadiness/answerOption.model")
const {deleteFromS3} = require("../utils/deleteFromS3");
const { S3Client,GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

class SkillReadinessService {
 static async createSkill(req) {
    try {
      const { title, description, month, year } = req.body;

      // 🔒 Validation
      if (!title || !title.trim()) {
        return {
          status: false,
          error: {
            status: 400,
            message: 'Skill title is required'
          }
        };
      }

      if (!month) {
        return {
          status: false,
          error: {
            status: 400,
            message: 'Month is required'
          }
        };
      }

      if (!year || typeof year !== 'number') {
        return {
          status: false,
          error: {
            status: 400,
            message: 'Valid year is required'
          }
        };
      }

      // 🧠 Optional: prevent duplicate skill for same month/year
      const existingSkill = await Skill.findOne({ month, year });

    //   if (existingSkill) {
    //     return {
    //       status: false,
    //       error: {
    //         status: 409,
    //         message: `A skill already exists for ${month} ${year}`
    //       }
    //     };
    //   }

      // ✅ Create Skill
    //   const skill = await Skill.create({
    //     title: title.trim(),
    //     description,
    //     month,
    //     year,
    //     isActive: false
    //   });

    const skill = await Skill.findOneAndUpdate(
        { month, year },
        {
            title: title.trim(),
            description,
            month,
            year,
            isActive: false
        },
        { new: true, upsert: true }
    );

      return {
        status: true,
        message: 'Skill created successfully',
        data: {
          id: skill._id,
          title: skill.title,
          description: skill.description,
          month: skill.month,
          year: skill.year,
          is_active: skill.isActive,
          created_at: skill.created_at
        }
      };
    } catch (error) {
      console.error('Create Skill Error:', error);

      return {
        status: false,
        error: {
          status: 500,
          message: 'Failed to create skill',
          details: error.message
        }
      };
    }
  }

static async createWeek(req) {
  let uploadedMedia = [];

  try {
    const {
      skillId,
      weekNumber,
      title,
      content,
      description,
      resources = [],
      assignment,
      media
    } = req.body;
    console.log("req.body",req.body)
    if (!skillId || !weekNumber || !title || !content) {
      throw { status: 400, message: 'Required fields missing' };
    }

    /* =========================
       Parse assignment
    ========================= */
    const parsedAssignment =
      typeof assignment === "string"
        ? JSON.parse(assignment)
        : assignment;

    if (!parsedAssignment?.title || !parsedAssignment.questions?.length) {
      throw { status: 400, message: 'Weekly assignment is required' };
    }
    console.log("parsedAssignment",parsedAssignment)
    /* =========================
       Parse media
    ========================= */
    const parsedMedia =
      typeof media === "string"
        ? JSON.parse(media)
        : media || [];

    uploadedMedia = parsedMedia;
    console.log("parsedMedia",parsedMedia)
    const imageUrls = [];
    const videoUrls = [];

    for (const file of parsedMedia) {
      if (file.mimetype?.startsWith("image")) {
        imageUrls.push({
          key: file.key,
          url: file.publicUrl,
          name: file.name
        });
      } else if (file.mimetype?.startsWith("video")) {
        videoUrls.push({
          key: file.key,
          url: file.publicUrl,
          name: file.name
        });
      }
    }

    /* =========================
       Skill & week validation
    ========================= */
    const skill = await Skill.findById(skillId);
    if (!skill) {
      throw { status: 404, message: 'Skill not found' };
    }

    // const existingWeek = await Week.findOne({ skillId, weekNumber });
    // if (existingWeek) {
    //   throw { status: 409, message: `Week ${weekNumber} already exists` };
    // }

    /* =========================
       Create week
    ========================= */
    // const week = await Week.create({
    //   skillId,
    //   weekNumber,
    //   title,
    //   content,
    //   description,
    //   imageUrls,
    //   videoUrls
    // });
    const week = await Week.findOneAndUpdate(
    { skillId, weekNumber },
    {
        skillId,
        weekNumber,
        title,
        content,
        description,
        imageUrls,
        videoUrls
    },
    { new: true, upsert: true }
    );
    console.log("week",week)
    /* =========================
       Resources
    ========================= */
    if (resources?.length) {
    //   await SkillResource.insertMany(
    //     resources.map((r, i) => ({
    //       weekId: week._id,
    //       title: r.title,
    //       url: r.url,
    //       resourceType: r.type,
    //       orderIndex: i
    //     }))
    //   );
    await SkillResource.deleteMany({ weekId: week._id });

    if (resources?.length) {
    await SkillResource.insertMany(
        resources.map((r, i) => ({
        weekId: week._id,
        title: r.title,
        url: r.url,
        resourceType: r.type,
        orderIndex: i
        }))
    );
    }
    }

    /* =========================
       Assessment
    ========================= */
    // const assessment = await Assessment.create({
    //   skillId,
    //   weekId: week._id,
    //   title: parsedAssignment.title,
    //   type: 'weekly',
    //   passingScore: parsedAssignment.passingScore ?? 70
    // });
    const assessment = await Assessment.findOneAndUpdate(
        { skillId, weekId: week._id, type: 'weekly' },
        {
            title: parsedAssignment.title,
            passingScore: parsedAssignment.passingScore ?? 70
        },
        { new: true, upsert: true }
    );
    console.log("assessment",assessment)
    /* =========================
       Questions
    ========================= */
    // await Question.insertMany(
    //   parsedAssignment.questions.map((q, qi) => ({
    //     assessmentId: assessment._id,
    //     questionText: q.questionText,
    //     orderIndex: qi,
    //     options: q.options.map((o, oi) => ({
    //       optionText: o.text,
    //       isCorrect: o.isCorrect,
    //       orderIndex: oi
    //     }))
    //   }))
    // );
    await Question.deleteMany({ assessmentId: assessment._id });

    // await Question.insertMany(
    // parsedAssignment.questions.map((q, qi) => ({
    //     assessmentId: assessment._id,
    //     questionText: q.questionText,
    //     orderIndex: qi,
    //     options: q.options.map((o, oi) => ({
    //       optionText: o.text,
    //       isCorrect: o.isCorrect,
    //       orderIndex: oi
    //     }))
    // }))
    // );

    await Question.insertMany(
      parsedAssignment.questions.map((q, qi) => {

        // ===== VALIDATION =====
        if (!q.questionText) {
          throw { status: 400, message: 'Question text required' };
        }

        if (!q.type) {
          throw { status: 400, message: 'Question type required' };
        }

        // ===== SINGLE / MULTIPLE =====
        if (q.type === 'single' || q.type === 'multiple') {

          if (!q.options?.length) {
            throw { status: 400, message: 'Options required for choice questions' };
          }

          if (!q.options.some(o => o.isCorrect)) {
            throw { status: 400, message: 'At least one correct option required' };
          }

          if (q.type === 'single') {
            const correctCount = q.options.filter(o => o.isCorrect).length;
            if (correctCount !== 1) {
              throw { status: 400, message: 'Single choice must have exactly one correct option' };
            }
          }

          return {
            assessmentId: assessment._id,
            questionText: q.questionText,
            type: q.type,
            orderIndex: qi,
            options: q.options.map((o, oi) => ({
              optionText: o.text,
              isCorrect: o.isCorrect,
              orderIndex: oi
            })),
            correctAnswerText: null
          };
        }

        // ===== TEXT / NUMBER =====
        if (q.type === 'text' || q.type === 'number') {

          if (!q.correctAnswerText) {
            throw { status: 400, message: 'Correct answer required' };
          }

          return {
            assessmentId: assessment._id,
            questionText: q.questionText,
            type: q.type,
            orderIndex: qi,
            options: [],
            correctAnswerText: q.correctAnswerText.toString()
          };
        }

        throw { status: 400, message: 'Invalid question type' };
      })
    );


    return {
      status: true,
      message: 'Week created successfully',
      data: {
        id: week._id,
        assessment_id: assessment._id,
        uploads: parsedMedia
      }
    };

  } catch (error) {
    /* =========================
       Cleanup uploaded media
    ========================= */
    for (const file of uploadedMedia) {
      if (file?.key) {
        await deleteFromS3(file.key);
      }
    }

    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Week creation failed'
      }
    };
  }
}

static async createAssignment(req) {
  try {
    const {
      skillId,
      title,
      type,
      passingScore = 70,
      questions
    } = req.body;

    // 🔒 Validation
    if (!skillId || !title || type !== 'final') {
      throw {
        status: 400,
        message: 'skillId, title and type=final are required'
      };
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw {
        status: 400,
        message: 'Final assessment must contain questions'
      };
    }

    const skillExists = await Skill.findById(skillId);
    if (!skillExists) {
      throw {
        status: 404,
        message: 'Skill not found'
      };
    }

    // Prevent duplicate final assessment
    const existingFinal = await Assessment.findOne({
      skillId,
      type: 'final'
    });

    // if (existingFinal) {
    //   throw {
    //     status: 409,
    //     message: 'Final assessment already exists for this skill'
    //   };
    // }

    // Create Assessment
    // const assessment = await Assessment.create({
    //   skillId,
    //   title,
    //   type: 'final',
    //   passingScore
    // });

    // // Create Questions + Options
    // await Question.insertMany(
    //   questions.map((q, qi) => ({
    //     assessmentId: assessment._id,
    //     questionText: q.questionText,
    //     orderIndex: qi,
    //     options: q.options.map((o, oi) => ({
    //       optionText: o.text,
    //       isCorrect: o.isCorrect,
    //       orderIndex: oi
    //     }))
    //   }))
    // );
    const assessment = await Assessment.findOneAndUpdate(
        { skillId, type: 'final' },
        {
            title,
            type: 'final',
            passingScore
        },
        { new: true, upsert: true }
    );

    await Question.deleteMany({ assessmentId: assessment._id });

    // await Question.insertMany(
    //     questions.map((q, qi) => ({
    //         assessmentId: assessment._id,
    //         questionText: q.questionText,
    //         orderIndex: qi,
    //         options: q.options.map((o, oi) => ({
    //             optionText: o.text,
    //             isCorrect: o.isCorrect,
    //             orderIndex: oi
    //         }))
    //     }))
    // );

    // await Question.insertMany(
    //   parsedAssignment.questions.map((q, qi) => {

    //     // ===== VALIDATION =====
    //     if (!q.questionText) {
    //       throw { status: 400, message: 'Question text required' };
    //     }

    //     if (!q.type) {
    //       throw { status: 400, message: 'Question type required' };
    //     }

    //     // ===== SINGLE / MULTIPLE =====
    //     if (q.type === 'single' || q.type === 'multiple') {

    //       if (!q.options?.length) {
    //         throw { status: 400, message: 'Options required for choice questions' };
    //       }
    //       if (!q.options.some(o => o.isCorrect)) {
    //         throw { status: 400, message: 'At least one correct option required' };
    //       }
    //       if (q.type === 'single') {
    //         const correctCount = q.options.filter(o => o.isCorrect).length;

    //         if (correctCount !== 1) {
    //           throw {
    //             status: 400,
    //             message: 'Single choice must have exactly one correct option'
    //           };
    //         }
    //       }
    //       return {
    //         assessmentId: assessment._id,
    //         questionText: q.questionText,
    //         type: q.type,
    //         orderIndex: qi,
    //         options: q.options.map((o, oi) => ({
    //           optionText: o.text,
    //           isCorrect: o.isCorrect,
    //           orderIndex: oi
    //         })),
    //         correctAnswerText: null
    //       };
    //     }

    //     // ===== TEXT / NUMBER =====
    //     if (q.type === 'text' || q.type === 'number') {

    //       if (!q.correctAnswerText) {
    //         throw { status: 400, message: 'Correct answer required' };
    //       }

    //       return {
    //         assessmentId: assessment._id,
    //         questionText: q.questionText,
    //         type: q.type,
    //         orderIndex: qi,
    //         options: [],
    //         correctAnswerText: q.correctAnswerText.toString()
    //       };
    //     }

    //     throw { status: 400, message: 'Invalid question type' };
    //   })
    // );

    await Question.insertMany(
  questions.map((q, qi) => {

    /* =========================
       BASIC VALIDATION
    ========================= */
    if (!q.questionText) {
      throw { status: 400, message: 'Question text required' };
    }

    if (!q.type) {
      throw { status: 400, message: 'Question type required' };
    }

    /* =========================
       SINGLE / MULTIPLE
    ========================= */
    if (q.type === 'single' || q.type === 'multiple') {

      if (!Array.isArray(q.options) || q.options.length === 0) {
        throw {
          status: 400,
          message: 'Options required for choice questions'
        };
      }

      if (!q.options.some(o => o.isCorrect)) {
        throw {
          status: 400,
          message: 'At least one correct option required'
        };
      }

      // 🔥 Enforce exactly one correct for single
      if (q.type === 'single') {
        const correctCount = q.options.filter(o => o.isCorrect).length;

        if (correctCount !== 1) {
          throw {
            status: 400,
            message: 'Single choice must have exactly one correct option'
          };
        }
      }

      return {
        assessmentId: assessment._id,
        questionText: q.questionText,
        type: q.type,
        orderIndex: qi,
        options: q.options.map((o, oi) => ({
          optionText: o.text,
          isCorrect: o.isCorrect,
          orderIndex: oi
        })),
        correctAnswerText: null
      };
    }

    /* =========================
       TEXT / NUMBER
    ========================= */
    if (q.type === 'text' || q.type === 'number') {

      if (!q.correctAnswerText) {
        throw {
          status: 400,
          message: 'Correct answer required'
        };
      }

      return {
        assessmentId: assessment._id,
        questionText: q.questionText,
        type: q.type,
        orderIndex: qi,
        options: [],
        correctAnswerText: q.correctAnswerText.toString()
      };
    }

    throw {
      status: 400,
      message: 'Invalid question type'
    };
  })
);

    return {
      status: true,
      message: 'Final assessment created successfully',
      data: {
        id: assessment._id,
        skill_id: assessment.skillId,
        passing_score: assessment.passingScore,
        created_at: assessment.created_at
      }
    };

  } catch (error) {
    console.error('Create Final Assessment Failed:', error);

    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Failed to create final assessment',
        breakpoint: error.stack?.split('\n')[0]
      }
    };
  }
}

static async getSkillReview(req) {
  try {
    const { skillId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      throw { status: 400, message: 'Invalid skillId' };
    }

    /* =========================
       Skill
    ========================= */
    const skill = await Skill.findById(skillId).lean();
    if (!skill) {
      throw { status: 404, message: 'Skill not found' };
    }

    /* =========================
       Weeks
    ========================= */
    const weeks = await Week.find({ skillId })
      .sort({ weekNumber: 1 })
      .lean();

    const weekIds = weeks.map(w => w._id);

    /* =========================
       Resources
    ========================= */
    const resources = await SkillResource.find({
      weekId: { $in: weekIds }
    }).lean();

    /* =========================
       Weekly Assessments
    ========================= */
    const weeklyAssessments = await Assessment.find({
      skillId,
      type: 'weekly'
    }).lean();

    const assessmentIds = weeklyAssessments.map(a => a._id);

    const questions = await Question.find({
      assessmentId: { $in: assessmentIds }
    }).lean();

    /* =========================
       Final Assessment
    ========================= */
    const finalAssessment = await Assessment.findOne({
      skillId,
      type: 'final'
    }).lean();

    let finalQuestions = [];
    if (finalAssessment) {
      finalQuestions = await Question.find({
        assessmentId: finalAssessment._id
      }).lean();
    }

    return {
      status: true,
      data: {
        skill,
        weeks,
        resources,
        weeklyAssessments,
        weeklyQuestions: questions,
        finalAssessment,
        finalQuestions
      }
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Failed to load review data'
      }
    };
  }
}

static async getAllSkills() {
  try {
    const skills = await Skill.find({})
      .sort({ year: -1, month: -1 })
      .lean();

    return {
      status: true,
      data: skills.map(skill => ({
        id: skill._id,
        title: skill.title,
        description: skill.description,
        month: skill.month,
        year: skill.year,
        is_active: skill.isActive,
        created_at: skill.created_at
      }))
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: 500,
        message: 'Failed to fetch skills'
      }
    };
  }
}

static async getSkillForEdit(req) {
  try {
    const { skillId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      throw { status: 400, message: 'Invalid skillId' };
    }

    /* ---------- Skill ---------- */
    const skill = await Skill.findById(skillId).lean();
    if (!skill) {
      throw { status: 404, message: 'Skill not found' };
    }

    /* ---------- Weeks ---------- */
    const weeks = await Week.find({ skillId })
      .sort({ weekNumber: 1 })
      .lean();

    /* ---------- Resources ---------- */
    const weekIds = weeks.map(w => w._id);
    console.log("weekIds",weekIds)
    const resources = await SkillResource.find({
      weekId: { $in: weekIds }
    }).lean();

    /* ---------- Weekly Assessments ---------- */
    const weeklyAssessments = await Assessment.find({
      skillId,
      type: 'weekly'
    }).lean();

    const assessmentIds = weeklyAssessments.map(a => a._id);
    console.log("assessmentIds",assessmentIds)

    const weeklyQuestions = await Question.find({
      assessmentId: { $in: assessmentIds }
    }).lean();

    /* ---------- Normalize Weeks ---------- */
    const normalizedWeeks = weeks.map(week => {
      const assessment = weeklyAssessments.find(
        a => String(a.weekId) === String(week._id)
      );
      console.log("weeklyQuestions",weeklyQuestions)
      const questions = weeklyQuestions.filter(
        q => String(q.assessmentId) === String(assessment?._id)
      );
      console.log("questions",questions)
      return {
        weekNumber: week.weekNumber,
        title: week.title,
        content: week.content,
        description: week.description,
        media: [
          ...(week.imageUrls || []),
          ...(week.videoUrls || [])
        ],
        resources: resources
          .filter(r => String(r.weekId) === String(week._id))
          .map(r => ({
            title: r.title,
            url: r.url,
            type: r.resourceType
          })),
        miniAssignment: {
          title: assessment?.title || '',
          passingScore: assessment?.passingScore || 70,
          questions: questions.map(q => ({
            type: q.type || 'single',
            questionText: q.questionText,
            correctAnswerText: q.correctAnswerText || '',
            options:
              q.type === 'single' || q.type === 'multiple'
                ? (q.options || []).map(o => ({
                    text: o.optionText,
                    isCorrect: o.isCorrect
                  }))
                : []
          }))
        }
      };
    });

    /* ---------- Final Assessment ---------- */
    const finalAssessment = await Assessment.findOne({
      skillId,
      type: 'final'
    }).lean();  

    let finalQuestions = [];
    if (finalAssessment) {
      finalQuestions = await Question.find({
        assessmentId: finalAssessment._id
      }).lean();
    }
    console.log("finalQuestions",finalQuestions)
    return {
      status: true,
      data: {
        skill: {
          id: skill._id,
          title: skill.title,
          description: skill.description,
          month: skill.month,
          year: skill.year
        },
        weeks: normalizedWeeks,
        finalAssignment: finalAssessment
          ? {
              title: finalAssessment.title,
              passingScore: finalAssessment.passingScore,
              questions: finalQuestions.map(q => ({
                type: q.type || 'single',
                questionText: q.questionText,
                correctAnswerText: q.correctAnswerText || '',
                options:
                  q.type === 'single' || q.type === 'multiple'
                    ? (q.options || []).map(o => ({
                        text: o.optionText,
                        isCorrect: o.isCorrect
                      }))
                    : []
              }))
            }
          : null
      }
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Failed to load skill for edit'
      }
    };
  }
}

static async deleteSkill(req) {
  try {
    const { skillId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid skillId'
        }
      };
    }

    /* =========================
       Skill validation
    ========================= */
    const skill = await Skill.findById(skillId);
    if (!skill) {
      return {
        status: false,
        error: {
          status: 404,
          message: 'Skill not found'
        }
      };
    }

    /* =========================
       Fetch weeks
    ========================= */
    const weeks = await Week.find({ skillId }).lean();
    const weekIds = weeks.map(w => w._id);

    /* =========================
       Delete media from S3
    ========================= */
    // for (const week of weeks) {
    //   const mediaFiles = [
    //     ...(week.imageUrls || []),
    //     ...(week.videoUrls || [])
    //   ];

    //   for (const file of mediaFiles) {
    //     if (file?.key) {
    //       await deleteFromS3(file.key);
    //     }
    //   }
    // }

    /* =========================
       Delete questions
    ========================= */
    const assessments = await Assessment.find({ skillId }).lean();
    const assessmentIds = assessments.map(a => a._id);

    if (assessmentIds.length) {
      await Question.deleteMany({
        assessmentId: { $in: assessmentIds }
      });
    }

    /* =========================
       Delete assessments
    ========================= */
    await Assessment.deleteMany({ skillId });

    /* =========================
       Delete resources
    ========================= */
    if (weekIds.length) {
      await SkillResource.deleteMany({
        weekId: { $in: weekIds }
      });
    }

    /* =========================
       Delete weeks
    ========================= */
    await Week.deleteMany({ skillId });

    /* =========================
       Delete skill
    ========================= */
    await Skill.findByIdAndDelete(skillId);

    return {
      status: true,
      message: 'Skill deleted successfully'
    };

  } catch (error) {
    console.error('Delete Skill Error:', error);

    return {
      status: false,
      error: {
        status: 500,
        message: 'Failed to delete skill',
        details: error.message
      }
    };
  }
}

//////////////////////// CLIENT SIDE ////////////////////////

static async getSkillByMonthYear(req) {
  try {
    const { year, month } = req.query;
    const userId = req.authData.user._id
    /* =========================
       Validation
    ========================= */
    if (!year || !month) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Year and month are required'
        }
      };
    }

    const parsedYear = Number(year);
    const parsedMonth = Number(month);

    if (isNaN(parsedYear) || isNaN(parsedMonth)) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid year or month'
        }
      };
    }

    /* =========================
       Month Mapping
    ========================= */
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];

    const monthName = monthNames[parsedMonth - 1];

    if (!monthName) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid month value'
        }
      };
    }

    /* =========================
       Fetch Skill
    ========================= */
    const skill = await Skill.findOne({
      year: parsedYear,
      month: monthName
    }).lean();

    if (!skill) {
      return {
        status: false,
        error: {
          status: 404,
          message: `No skill found for ${monthName} ${parsedYear}`
        }
      };
    }

    /* ===================================================
       FINAL ASSESSMENT STATUS CHECK
    =================================================== */

    let finalStatus = 'pending';

    if (userId) {

      // Find final assessment for this skill
      const finalAssessment = await Assessment.findOne({
        skillId: skill._id,
        type: 'final'
      }).lean();

      if (finalAssessment) {

        const submission = await AssignmentSubmission.findOne({
          userId,
          assessmentId: finalAssessment._id
        }).lean();

        if (!submission) {
          finalStatus = 'pending';
        } else {

          // Build selected month date range
          const skillMonthStart = new Date(parsedYear, parsedMonth - 1, 1);
          const skillMonthEnd = new Date(parsedYear, parsedMonth, 0, 23, 59, 59);

          const submissionDate = new Date(submission.createdAt);

          if (submissionDate > skillMonthEnd) {
            finalStatus = 'late_submitted';
          } else {
            finalStatus = 'completed';
          }
        }
      }
    }

    return {
      status: true,
      data: {
        id: skill._id,
        title: skill.title,
        description: skill.description,
        month: skill.month,
        year: skill.year,
        is_active: skill.isActive,
        created_at: skill.created_at,
        finalAssessmentStatus: finalStatus 
      }
    };

  } catch (error) {
    console.error('Get Skill By Month/Year Error:', error);

    return {
      status: false,
      error: {
        status: 500,
        message: 'Failed to fetch skill'
      }
    };
  }
}

static async getWeekBySkillAndNumber(req) {
  try {
    const { skillId, weekNumber } = req.query;

    /* =========================
       Validation
    ========================= */
    if (!skillId || !weekNumber) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'skillId and weekNumber are required'
        }
      };
    }

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid skillId'
        }
      };
    }

    const parsedWeekNumber = Number(weekNumber);

    if (isNaN(parsedWeekNumber)) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid weekNumber'
        }
      };
    }

    /* =========================
       Fetch Week
    ========================= */
    const week = await Week.findOne({
      skillId,
      weekNumber: parsedWeekNumber
    }).lean();

    if (!week) {
      return {
        status: false,
        error: {
          status: 404,
          message: `Week ${parsedWeekNumber} not found`
        }
      };
    }
    ///////// GET IMAGES AND VIDEOS ////////////////
    // S3 Client
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.ACCESS_SECRET,
      },
      region: process.env.REGION,
    });
    // Attach public URLs for images / pdf / files
    if (week?.imageUrls && Array.isArray(week.imageUrls)) {
        const validAttachments = week.imageUrls.filter(
          (file) => file && file?.key
        );
        for (let file of validAttachments) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.BUCKET,
              Key: file?.key,
            });

            const signedUrl = await getSignedUrl(s3Client, command, {
              expiresIn: 1800, 
            });

            file.url = signedUrl;
          } catch (err) {
            console.error(
              "Error generating signed URL for attachment:",
              err.message
            );
          }
        }

        week.imageUrls = validAttachments;
    }

    if (week?.videoUrls && Array.isArray(week.videoUrls)) {
        const validAttachments = week.videoUrls.filter(
          (file) => file && file?.key
        );
        for (let file of validAttachments) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.BUCKET,
              Key: file?.key,
            });

            const signedUrl = await getSignedUrl(s3Client, command, {
              expiresIn: 1800, 
            });

            file.url = signedUrl;
          } catch (err) {
            console.error(
              "Error generating signed URL for attachment:",
              err.message
            );
          }
        }

        week.videoUrls = validAttachments;
    }
    /* =========================
       Resources
    ========================= */
    const resources = await SkillResource.find({
      weekId: week._id
    })
      .sort({ orderIndex: 1 })
      .lean();

    /* =========================
       Weekly Assessment
    ========================= */
    const assessment = await Assessment.findOne({
      skillId,
      weekId: week._id,
      type: 'weekly'
    }).lean();

    let questions = [];

    if (assessment) {
      const dbQuestions = await Question.find({
        assessmentId: assessment._id
      })
        .sort({ orderIndex: 1 })
        .lean();

      questions = dbQuestions.map(q => ({
        id: q._id,
        type: q.type || 'single',   // 👈 IMPORTANT
        questionText: q.questionText,

        options:
          q.type === 'single' || q.type === 'multiple'
            ? (q.options || [])
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(o => ({
                  id: o._id,
                  text: o.optionText
                }))
            : []
      }));
    }
    /* =========================
      Fetch Existing Submission
    ========================= */

    let submissionData = null;

    if (assessment && req.authData?.user?._id) {

      const userId = req.authData.user._id;
      console.log("userId",userId)
      const submission = await AssignmentSubmission.findOne({
        userId,
        assessmentId: assessment._id
      }).lean();
      console.log("submission",submission)
      if (submission) {

        const totalCorrect = submission.answers?.filter(a => a.isCorrect)?.length || 0;

        submissionData = {
          score: submission.score,
          percentage: submission.score, // already percentage
          attemptNumber: submission.attemptNumber,
          status: submission.status,
          passed: submission.passed,
          totalQuestions: submission.totalQuestions,
          totalCorrect
        };
      }
    }
    /* =========================
       Final Response
    ========================= */
    return {
      status: true,
      data: {
        id: week._id,
        weekNumber: week.weekNumber,
        title: week.title,
        description: week.description,
        content: week.content,
        images: week.imageUrls || [],
        videos: week.videoUrls || [],
        resources: resources.map(r => ({
          id: r._id,
          title: r.title,
          url: r.url,
          type: r.resourceType
        })),
        assessment: assessment
          ? {
              id: assessment._id,
              title: assessment.title,
              passingScore: assessment.passingScore
            }
          : null,
        questions,
        submission: submissionData
      }
    };

  } catch (error) {
    console.error('Get Week Error:', error);

    return {
      status: false,
      error: {
        status: 500,
        message: 'Failed to fetch week data'
      }
    };
  }
}

//////////////////////// WEEKLY ////////////////////////
static async submitAssignment(req) {
  try {
    const { assessmentId, answers } = req.body;
    const userId = req.authData.user._id; 
    console.log("userId",userId)
    if (!assessmentId || !Array.isArray(answers)) {
      throw {
        status: 400,
        message: 'assessmentId and answers are required'
      };
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw { status: 404, message: 'Assessment not found' };
    }
    console.log("assessment",assessment)
    const questions = await Question.find({
      assessmentId
    });

    let totalCorrect = 0;
    const processedAnswers = [];

    for (const question of questions) {
      const studentAnswer = answers.find(
        a => String(a.questionId) === String(question._id)
      );
      console.log("studentAnswer",studentAnswer)
      if (!studentAnswer) continue;

      let isCorrect = false;

      /* =========================
         SINGLE
      ========================= */
      if (question.type === 'single') {
        const correctOption = question.options.find(o => o.isCorrect);

        isCorrect =
          studentAnswer.selectedOptionIds?.length === 1 &&
          String(studentAnswer.selectedOptionIds[0]) ===
            String(correctOption?._id);
      }

      /* =========================
         MULTIPLE
      ========================= */
      if (question.type === 'multiple') {
        const correctOptions = question.options
          .filter(o => o.isCorrect)
          .map(o => String(o._id));

        const selected = (studentAnswer.selectedOptionIds || []).map(String);

        isCorrect =
          selected.length === correctOptions.length &&
          selected.every(id => correctOptions.includes(id));
      }

      /* =========================
         TEXT
      ========================= */
      if (question.type === 'text') {
        isCorrect =
          studentAnswer.writtenAnswer?.trim().toLowerCase() ===
          question.correctAnswerText?.trim().toLowerCase();
      }

      /* =========================
         NUMBER
      ========================= */
      if (question.type === 'number') {
        isCorrect =
          Number(studentAnswer.writtenAnswer) ===
          Number(question.correctAnswerText);
      }

      if (isCorrect) totalCorrect++;
      console.log("isCorrect",isCorrect)
      processedAnswers.push({
        questionId: question._id,
        selectedOptionIds: studentAnswer.selectedOptionIds || [],
        writtenAnswer: studentAnswer.writtenAnswer || null,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0
      });
      console.log("processedAnswers",processedAnswers)
    }

    const percentage =
      (totalCorrect / questions.length) * 100;

    const passed =
      percentage >= assessment.passingScore;

    /* =========================
      Check Existing Submission
    ========================= */
    const MAX_ATTEMPTS = 5;
    const existingSubmission = await AssignmentSubmission.findOne({
      userId,
      assessmentId
    });

    let submission;

    if (existingSubmission) {

      // BLOCK IF ATTEMPT LIMIT REACHED
      if (existingSubmission.attemptNumber >= MAX_ATTEMPTS) {
        throw {
          status: 400,
          message: `You cannot attempt this assessment more than ${MAX_ATTEMPTS} times`
        };
      }
      // RE-ATTEMPT
      submission = await AssignmentSubmission.findOneAndUpdate(
        { userId, assessmentId },
        {
          answers: processedAnswers,
          totalQuestions: questions.length,
          score: percentage,
          passed,
          status: 're-attempt',
          isLate: false, // you can compute this if needed
          submittedAt: new Date(),
          $inc: { attemptNumber: 1 }
        },
        { new: true }
      );
    } else {
      // FIRST ATTEMPT

      submission = await AssignmentSubmission.create({
        userId,
        assessmentId,
        answers: processedAnswers,
        totalQuestions: questions.length,
        score: percentage,
        passed,
        status: 'completed',
        attemptNumber: 1,
        isLate: false,
        submittedAt: new Date()
      });
    }
    console.log("submission",submission)
    // return {
    //   status: true,
    //   message: existingSubmission
    //     ? 'Re-attempt submitted successfully'
    //     : 'Assignment submitted successfully',
    //   data: {
    //     score: percentage,
    //     passed,
    //     attemptNumber: submission.attemptNumber,
    //     submissionId: submission._id
    //   }
    // };

    return {
      status: true,
      message: 'Assignment submitted successfully',
      data: {
        score: percentage,
        passed,
        totalQuestions: questions.length,
        totalCorrect,
        attemptNumber: submission.attemptNumber,
        results: questions.map(q => {
          const userAns = processedAnswers.find(
            a => String(a.questionId) === String(q._id)
          );

          return {
            questionText: q.questionText,
            type: q.type,
            correctAnswerText: q.correctAnswerText || null,
            correctOptions: q.options
              ?.filter(o => o.isCorrect)
              .map(o => o.optionText) || [],
            userSelectedOptionIds: userAns?.selectedOptionIds || [],
            userWrittenAnswer: userAns?.writtenAnswer || null,
            isCorrect: userAns?.isCorrect || false
          };
        })
      }
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Submission failed'
      }
    };
  }
}

static async getAssessmentResult(req) {
  try {
    const { assessmentId } = req.query;
    const userId = req.authData.user._id;

    if (!assessmentId) {
      throw {
        status: 400,
        message: 'assessmentId is required'
      };
    }

    /* =========================
       Validate Assessment
    ========================= */
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      throw { status: 404, message: 'Assessment not found' };
    }

    /* =========================
       Fetch Submission
    ========================= */
    const submission = await AssignmentSubmission.findOne({
      userId,
      assessmentId
    }).lean();

    if (!submission) {
      throw {
        status: 404,
        message: 'No submission found for this assessment'
      };
    }

    /* =========================
       Fetch Questions
    ========================= */
    const questions = await Question.find({
      assessmentId
    }).lean();

    const results = questions.map(q => {
      const userAns = submission.answers.find(
        a => String(a.questionId) === String(q._id)
      );

      return {
        questionText: q.questionText,
        type: q.type,

        // For text / number
        correctAnswerText: q.correctAnswerText || null,

        // For single / multiple
        correctOptions: q.options
          ?.filter(o => o.isCorrect)
          .map(o => o.optionText) || [],

        userSelectedOptionIds: userAns?.selectedOptionIds || [],
        userWrittenAnswer: userAns?.writtenAnswer || null,
        isCorrect: userAns?.isCorrect || false
      };
    });

    const totalCorrect =
      submission.answers?.filter(a => a.isCorrect)?.length || 0;

    return {
      status: true,
      message: 'Assessment result fetched successfully',
      data: {
        score: submission.score,
        passed: submission.passed,
        totalQuestions: submission.totalQuestions,
        totalCorrect,
        attemptNumber: submission.attemptNumber,
        results
      }
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Failed to fetch assessment result'
      }
    };
  }
}

//////////////////////// FINAL ASSESSMENT ////////////////////////
static async getFinalAssessmentQuestions(req) {
  try {
    const { skillId } = req.query;

    /* =========================
       Validation
    ========================= */
    if (!skillId) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'skillId is required'
        }
      };
    }

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return {
        status: false,
        error: {
          status: 400,
          message: 'Invalid skillId'
        }
      };
    }

    /* =========================
       Fetch Final Assessment
    ========================= */
    const assessment = await Assessment.findOne({
      skillId,
      type: 'final'
    }).lean();

    if (!assessment) {
      return {
        status: false,
        error: {
          status: 404,
          message: 'Final assessment not found'
        }
      };
    }

    /* =========================
       Fetch Questions
    ========================= */
    const dbQuestions = await Question.find({
      assessmentId: assessment._id
    })
      .sort({ orderIndex: 1 })
      .lean();

    const questions = dbQuestions.map(q => ({
      id: q._id,
      type: q.type || 'single',
      questionText: q.questionText,
      options:
        q.type === 'single' || q.type === 'multiple'
          ? (q.options || [])
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map(o => ({
                id: o._id,
                text: o.optionText
              }))
          : []
    }));

    /* =========================
       Fetch Existing Submission
    ========================= */
    let submissionData = null;

    if (req.authData?.user?._id) {

      const userId = req.authData.user._id;

      const submission = await AssignmentSubmission.findOne({
        userId,
        assessmentId: assessment._id
      }).lean();

      if (submission) {

        const totalCorrect =
          submission.answers?.filter(a => a.isCorrect)?.length || 0;

        submissionData = {
          score: submission.score,
          percentage: submission.score,
          attemptNumber: submission.attemptNumber,
          status: submission.status,
          passed: submission.passed,
          totalQuestions: submission.totalQuestions,
          totalCorrect
        };
      }
    }

    /* =========================
       Final Response
    ========================= */
    return {
      status: true,
      data: {
        assessment: {
          id: assessment._id,
          title: assessment.title,
          passingScore: assessment.passingScore
        },
        questions,
        submission: submissionData
      }
    };

  } catch (error) {
    console.error('Get Final Assessment Error:', error);

    return {
      status: false,
      error: {
        status: 500,
        message: 'Failed to fetch final assessment'
      }
    };
  }
}

static async submitFinalAssignment(req) {
  try {
    const { assessmentId, answers } = req.body;
    const userId = req.authData.user._id;

    /* =========================
       Validation
    ========================= */
    if (!assessmentId || !Array.isArray(answers)) {
      throw {
        status: 400,
        message: 'assessmentId and answers are required'
      };
    }

    const assessment = await Assessment.findById(assessmentId);

    if (!assessment || assessment.type !== 'final') {
      throw {
        status: 404,
        message: 'Final assessment not found'
      };
    }

    // const weeklyAssessments = await Assessment.find({
    //   skillId: assessment.skillId,
    //   type: 'weekly'
    // }).select('_id');

    // const weeklyIds = weeklyAssessments.map(a => a._id);

    // const passedWeeklyCount = await AssignmentSubmission.countDocuments({
    //   userId,
    //   assessmentId: { $in: weeklyIds },
    //   passed: true
    // });

    // if (weeklyIds.length > 0 && passedWeeklyCount !== weeklyIds.length) {
    //   throw {
    //     status: 400,
    //     message:
    //       'You must pass all weekly assessments before attempting the final assessment'
    //   };
    // }


    const questions = await Question.find({ assessmentId });

    let totalCorrect = 0;
    const processedAnswers = [];

    /* =========================
       Evaluate Answers
    ========================= */
    for (const question of questions) {

      const studentAnswer = answers.find(
        a => String(a.questionId) === String(question._id)
      );

      if (!studentAnswer) continue;

      let isCorrect = false;

      /* SINGLE */
      if (question.type === 'single') {
        const correctOption = question.options.find(o => o.isCorrect);

        isCorrect =
          studentAnswer.selectedOptionIds?.length === 1 &&
          String(studentAnswer.selectedOptionIds[0]) ===
          String(correctOption?._id);
      }

      /* MULTIPLE */
      if (question.type === 'multiple') {
        const correctOptions = question.options
          .filter(o => o.isCorrect)
          .map(o => String(o._id));

        const selected = (studentAnswer.selectedOptionIds || []).map(String);

        isCorrect =
          selected.length === correctOptions.length &&
          selected.every(id => correctOptions.includes(id));
      }

      /* TEXT */
      if (question.type === 'text') {
        isCorrect =
          studentAnswer.writtenAnswer?.trim().toLowerCase() ===
          question.correctAnswerText?.trim().toLowerCase();
      }

      /* NUMBER */
      if (question.type === 'number') {
        isCorrect =
          Number(studentAnswer.writtenAnswer) ===
          Number(question.correctAnswerText);
      }

      if (isCorrect) totalCorrect++;

      processedAnswers.push({
        questionId: question._id,
        selectedOptionIds: studentAnswer.selectedOptionIds || [],
        writtenAnswer: studentAnswer.writtenAnswer || null,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0
      });
    }

    const percentage =
      (totalCorrect / questions.length) * 100;

    const passed =
      percentage >= assessment.passingScore;

    /* =========================
       Attempt Control
    ========================= */
    const MAX_ATTEMPTS = 5; // Usually lower for final

    const existingSubmission = await AssignmentSubmission.findOne({
      userId,
      assessmentId
    });

    if (existingSubmission?.passed) {
      throw {
        status: 400,
        message:
          'You have already passed the final assessment. Retake is not allowed.'
      };
    }

    let submission;

    if (existingSubmission) {

      if (existingSubmission.attemptNumber >= MAX_ATTEMPTS) {
        throw {
          status: 400,
          message: `You cannot attempt the final assessment more than ${MAX_ATTEMPTS} times`
        };
      }

      submission = await AssignmentSubmission.findOneAndUpdate(
        { userId, assessmentId },
        {
          answers: processedAnswers,
          totalQuestions: questions.length,
          score: percentage,
          passed,
          status: 're-attempt',
          submittedAt: new Date(),
          $inc: { attemptNumber: 1 }
        },
        { new: true }
      );

    } else {

      submission = await AssignmentSubmission.create({
        userId,
        assessmentId,
        answers: processedAnswers,
        totalQuestions: questions.length,
        score: percentage,
        passed,
        status: 'completed',
        attemptNumber: 1,
        submittedAt: new Date()
      });
    }

    /* =========================
       Final Response
    ========================= */
    return {
      status: true,
      message: 'Final assessment submitted successfully',
      data: {
        score: percentage,
        passed,
        totalQuestions: questions.length,
        totalCorrect,
        attemptNumber: submission.attemptNumber,
        results: questions.map(q => {
          const userAns = processedAnswers.find(
            a => String(a.questionId) === String(q._id)
          );

          return {
            questionText: q.questionText,
            type: q.type,
            correctAnswerText: q.correctAnswerText || null,
            correctOptions:
              q.options?.filter(o => o.isCorrect)
                .map(o => o.optionText) || [],
            userSelectedOptionIds:
              userAns?.selectedOptionIds || [],
            userWrittenAnswer:
              userAns?.writtenAnswer || null,
            isCorrect: userAns?.isCorrect || false
          };
        })
      }
    };

  } catch (error) {

    return {
      status: false,
      error: {
        status: error.status || 500,
        message: error.message || 'Final assessment submission failed'
      }
    };
  }
}

static async getFinalAssessmentResult(req) {
  try {
    const { assessmentId } = req.query;
    const userId = req.authData.user._id;

    /* =========================
       Validation
    ========================= */
    if (!assessmentId) {
      throw {
        status: 400,
        message: 'assessmentId is required'
      };
    }

    /* =========================
       Validate Final Assessment
    ========================= */
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment || assessment.type !== 'final') {
      throw {
        status: 404,
        message: 'Final assessment not found'
      };
    }

    /* =========================
       Fetch Submission
    ========================= */
    const submission = await AssignmentSubmission.findOne({
      userId,
      assessmentId
    }).lean();

    if (!submission) {
      throw {
        status: 404,
        message: 'No submission found for this final assessment'
      };
    }

    /* =========================
       Fetch Questions
    ========================= */
    const questions = await Question.find({
      assessmentId
    }).lean();

    const results = questions.map(q => {
      const userAns = submission.answers.find(
        a => String(a.questionId) === String(q._id)
      );

      return {
        questionText: q.questionText,
        type: q.type,

        // For text / number
        correctAnswerText: q.correctAnswerText || null,

        // For single / multiple
        correctOptions:
          q.options?.filter(o => o.isCorrect)
            .map(o => o.optionText) || [],

        userSelectedOptionIds:
          userAns?.selectedOptionIds || [],

        userWrittenAnswer:
          userAns?.writtenAnswer || null,

        isCorrect:
          userAns?.isCorrect || false
      };
    });

    const totalCorrect =
      submission.answers?.filter(a => a.isCorrect)?.length || 0;

    /* =========================
       Final Response
    ========================= */
    return {
      status: true,
      message: 'Final assessment result fetched successfully',
      data: {
        score: submission.score,
        passed: submission.passed,
        totalQuestions: submission.totalQuestions,
        totalCorrect,
        attemptNumber: submission.attemptNumber,
        results
      }
    };

  } catch (error) {
    return {
      status: false,
      error: {
        status: error.status || 500,
        message:
          error.message || 'Failed to fetch final assessment result'
      }
    };
  }
}

}

module.exports = SkillReadinessService;