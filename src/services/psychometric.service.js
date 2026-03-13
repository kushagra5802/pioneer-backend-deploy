const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const mongoose = require("mongoose");
const AcademicQuestion = require("../models/psychometric/academicQuestions.model");
const CareerQuestion = require("../models/psychometric/careerQuestions.modal")
const RiasecQuestion = require("../models/psychometric/riasecQuestions.model")
const AcademicAssessment = require("../models/psychometric/academicAssessment.model");
const CareerAssessment = require("../models/psychometric/careerAssessment.modal");
const MBTIAssessment = require("../models/psychometric/mbtiAssessment");
const RiasecAssessment = require("../models/psychometric/riasecAssessment.model");
const calculateScore = require("../config/psychometric/calculateScore");
const getOverallLevel = require("../config/psychometric/getOverallLevel");
const getDimensionLevel = require("../config/psychometric/getDimensionLevel");
const dimensionConfig = require("../config/psychometric/dimensionConfig");

class PsychometricService {
    
    static async getAcademicQuestions() {
        try {

        const questions = await AcademicQuestion.find({})
            .select("_id questionText dimension isPositive")
            .lean();

        if (!questions.length) {
            throw {
            status: 404,
            message: "No questions found"
            };
        }

        return {
            status: true,
            message: "Questions fetched successfully",
            data: questions
        };

        } catch (error) {
        return {
            status: false,
            error: {
            status: error.status || 500,
            message: error.message || "Failed to fetch questions"
            }
        };
        }
    }

    static async submitAssessment(req) {
        try {
            const { answers, completionTimeSeconds } = req.body;
            console.log("req.authData.user",req.authData.user)
            const studentId = req.authData.user._id;

            if (!Array.isArray(answers) || answers.length !== 40) {
            throw {
                status: 400,
                message: "All 40 questions must be answered"
            };
            }

            /* =========================
            FETCH ALL QUESTIONS
            ========================= */
            const questions = await AcademicQuestion.find().lean();

            if (questions.length !== 40) {
            throw {
                status: 500,
                message: "Questions not properly configured"
            };
            }

            /* =========================
            PROCESS ANSWERS
            ========================= */
            let totalScore = 0;
            const processedAnswers = [];

            for (const question of questions) {

            const studentAnswer = answers.find(
                a => String(a.questionId) === String(question._id)
            );

            if (!studentAnswer || !studentAnswer.selectedOption) {
                throw {
                status: 400,
                message: `AcademicQuestion ${question._id} not answered`
                };
            }

            const calculatedScore = calculateScore(
                Number(studentAnswer.selectedOption),
                question.isPositive
            );

            totalScore += calculatedScore;

            processedAnswers.push({
                questionId: question._id,
                selectedOption: studentAnswer.selectedOption,
                calculatedScore
            });
            }

            const percentage = (totalScore / 200) * 100;
            const level = getOverallLevel(totalScore);

            /* =========================
            CALCULATE DIMENSIONS
            ========================= */
            const dimensionResults = [];

            for (const dimensionName in dimensionConfig) {

            const { items, maxScore } = dimensionConfig[dimensionName];

            const dimensionScore = processedAnswers
                .filter(ans => items.includes(ans.questionId))
                .reduce((sum, ans) => sum + ans.calculatedScore, 0);

            const dimPercentage = (dimensionScore / maxScore) * 100;
            const dimLevel = getDimensionLevel(dimPercentage);

            dimensionResults.push({
                name: dimensionName,
                score: dimensionScore,
                maxScore,
                percentage: dimPercentage,
                level: dimLevel
            });
            }

            /* =========================
            STORE SUBMISSION
            ========================= */
            // const submission = await AcademicAssessment.create({
            // studentId,
            // responses: processedAnswers,
            // totalScore,
            // percentage,
            // level,
            // dimensions: dimensionResults,
            // completionTimeSeconds: completionTimeSeconds || null,
            // submittedAt: new Date()
            // });

            /* =========================
            STORE OR UPDATE SUBMISSION
            ========================= */

            // Check if student already has submission
            const existingSubmission = await AcademicAssessment.findOne({ studentId });

            let submission;

            if (existingSubmission) {

            submission = await AcademicAssessment.findByIdAndUpdate(
                existingSubmission._id,
                {
                responses: processedAnswers,
                totalScore,
                percentage,
                level,
                dimensions: dimensionResults,
                completionTimeSeconds: completionTimeSeconds || null,
                submittedAt: new Date(),
                $inc: { attemptNumber: 1 }  
                },
                { new: true }
            );

            } else {

            submission = await AcademicAssessment.create({
                studentId,
                responses: processedAnswers,
                totalScore,
                percentage,
                level,
                dimensions: dimensionResults,
                completionTimeSeconds: completionTimeSeconds || null,
                attemptNumber: 1,
                submittedAt: new Date()
            });

            }

            /* =========================
            RESPONSE STRUCTURE
            ========================= */
            return {
            status: true,
            message: "Assessment submitted successfully",
            data: {
                submissionId: submission._id,
                totalScore,
                percentage,
                level,
                dimensions: dimensionResults
            }
            };

        } catch (error) {
            return {
            status: false,
            error: {
                status: error.status || 500,
                message: error.message || "Assessment submission failed"
            }
            };
        }
    }

    static async getAcademicResult(req) {
        try {
            const studentId = req.authData.user._id;

            const result = await AcademicAssessment
            .findOne({ studentId })
            .sort({ submittedAt: -1 })
            .lean();

            if (!result) {
            return {
                status: true,
                data: null
            };
            }

            return {
            status: true,
            data: result
            };

        } catch (error) {
            return {
            status: false,
            error: {
                status: 500,
                message: "Failed to fetch result"
            }
            };
        }
    }

    static async submitMBTIAssessment(req) {
        try {
            const { answers, completionTimeSeconds } = req.body;
            const studentId = req.authData.user._id;

            if (!Array.isArray(answers) || answers.length !== 70) {
                throw {
                    status: 400,
                    message: "All 70 questions must be answered"
                };
            }

            /* ==============================
            INITIALIZE COLUMN BUCKETS
            ============================== */

            const columns = {
                1: { A: 0, B: 0 },
                2: { A: 0, B: 0 },
                3: { A: 0, B: 0 },
                4: { A: 0, B: 0 }
            };

            /* ==============================
            COLUMN MAPPING FUNCTION
            ============================== */

            const getColumn = (id) => {
                if ([1,8,15,22,29,36,43,50,57,64].includes(id)) return 1;
                if ([2,9,16,23,30,37,44,51,58,65].includes(id)) return 2;
                if ([3,10,17,24,31,38,45,52,59,66].includes(id)) return 3;
                if ([4,11,18,25,32,39,46,53,60,67].includes(id)) return 4;
                if ([5,12,19,26,33,40,47,54,61,68].includes(id)) return 3; // merged to Column 3
                if ([6,13,20,27,34,41,48,55,62,69].includes(id)) return 4; // merged to Column 4
                if ([7,14,21,28,35,42,49,56,63,70].includes(id)) return 4; // merged to Column 4
            };

            /* ==============================
            PROCESS RESPONSES
            ============================== */

            const processedAnswers = [];

            for (const ans of answers) {

                const { question_id, response } = ans;

                if (!["A", "B"].includes(response)) {
                    throw {
                        status: 400,
                        message: `Invalid response for question ${question_id}`
                    };
                }

                const column = getColumn(Number(question_id));

                columns[column][response] += 1;

                processedAnswers.push({
                    questionId: question_id,
                    response,
                    column
                });
            }

            /* ==============================
            MERGE LOGIC
            ============================== */

            const E = columns[1].A;
            const I = columns[1].B;

            const S = columns[2].A;
            const N = columns[2].B;

            const T = columns[3].A;
            const F = columns[3].B;

            const J = columns[4].A;
            const P = columns[4].B;

            /* ==============================
            CALCULATE PERCENTAGES
            ============================== */

            const calculatePercentage = (a, b) => {
                const total = a + b;
                return total === 0 ? 50 : Math.round((Math.max(a, b) / total) * 100);
            };

            const EI_percent = calculatePercentage(E, I);
            const SN_percent = calculatePercentage(S, N);
            const TF_percent = calculatePercentage(T, F);
            const JP_percent = calculatePercentage(J, P);

            const getConfidence = (percent) => {
                if (percent >= 60) return "Strong";
                if (percent >= 50) return "Moderate";
                return "Balanced";
            };

            /* ==============================
            DETERMINE FINAL TYPE
            ============================== */

            const mbti_type =
                (E >= I ? "E" : "I") +
                (S >= N ? "S" : "N") +
                (T >= F ? "T" : "F") +
                (J >= P ? "J" : "P");

            /* ==============================
            STORE OR UPDATE
            ============================== */

            const existing = await MBTIAssessment.findOne({ studentId });

            let submission;

            if (existing) {
                submission = await MBTIAssessment.findByIdAndUpdate(
                    existing._id,
                    {
                        responses: processedAnswers,
                        scores: { E, I, S, N, T, F, J, P },
                        percentages: {
                            EI: EI_percent,
                            SN: SN_percent,
                            TF: TF_percent,
                            JP: JP_percent
                        },
                        mbti_type,
                        completionTimeSeconds: completionTimeSeconds || null,
                        submittedAt: new Date(),
                        $inc: { attemptNumber: 1 }
                    },
                    { new: true }
                );
            } else {
                submission = await MBTIAssessment.create({
                    studentId,
                    responses: processedAnswers,
                    scores: { E, I, S, N, T, F, J, P },
                    percentages: {
                        EI: EI_percent,
                        SN: SN_percent,
                        TF: TF_percent,
                        JP: JP_percent
                    },
                    mbti_type,
                    attemptNumber: 1,
                    completionTimeSeconds: completionTimeSeconds || null,
                    submittedAt: new Date()
                });
            }

            /* ==============================
            RESPONSE STRUCTURE
            ============================== */

            return {
                status: true,
                message: "MBTI Assessment submitted successfully",
                data: {
                    submissionId: submission._id,
                    mbti_type,
                    scores: { E, I, S, N, T, F, J, P },
                    percentages: {
                        EI: EI_percent,
                        SN: SN_percent,
                        TF: TF_percent,
                        JP: JP_percent
                    },
                    confidence: {
                        EI: getConfidence(EI_percent),
                        SN: getConfidence(SN_percent),
                        TF: getConfidence(TF_percent),
                        JP: getConfidence(JP_percent)
                    }
                }
            };

        } catch (error) {
            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "MBTI submission failed"
                }
            };
        }
    }

    static async getMBTIResult(req) {
        try {
            const studentId = req.authData.user._id;

            const result = await MBTIAssessment
            .findOne({ studentId })
            .sort({ submittedAt: -1 })
            .lean();

            if (!result) {
            return {
                status: true,
                data: null
            };
            }

            return {
            status: true,
            data: result
            };

        } catch (error) {
            return {
            status: false,
            error: {
                status: 500,
                message: "Failed to fetch result"
            }
            };
        }
    }

    static async getCareerQuestions() {
        try {

            const questions = await CareerQuestion.find({})
                .select("id text dimension scoreIf")
                .lean();

            if (!questions.length) {
                throw {
                    status: 404,
                    message: "No career questions found"
                };
            }

            return {
                status: true,
                message: "Career questions fetched successfully",
                data: questions
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "Failed to fetch career questions"
                }
            };

        }
    }

    static async submitCareerAssessment(req) {

        try {

            const { answers, completionTimeSeconds } = req.body;
            const studentId = req.authData.user._id;

            /* =========================
            VALIDATE ANSWERS
            ========================= */

            if (!Array.isArray(answers) || answers.length !== 24) {
                throw {
                    status: 400,
                    message: "All 24 questions must be answered"
                };
            }

            /* =========================
            FETCH QUESTIONS
            ========================= */

            const questions = await CareerQuestion.find().lean();

            if (questions.length !== 24) {
                throw {
                    status: 500,
                    message: "Career questions not configured properly"
                };
            }

            /* =========================
            SCORING KEY
            ========================= */

            const scoringKey = {
                careerConcern: {
                    items: [1, 5, 9, 13, 17, 21],
                    correctAnswer: "D"
                },
                careerCuriosity: {
                    items: [2, 6, 10, 14, 18, 22],
                    correctAnswer: "D"
                },
                careerConfidence: {
                    items: [3, 7, 11, 15, 19, 23],
                    correctAnswer: "D"
                },
                careerConsultation: {
                    items: [
                        { id: 4, answer: "A" },
                        { id: 8, answer: "A" },
                        { id: 12, answer: "A" },
                        { id: 16, answer: "D" },
                        { id: 20, answer: "A" },
                        { id: 24, answer: "A" }
                    ]
                }
            };

            /* =========================
            PROCESS ANSWERS
            ========================= */

            let totalScore = 0;
            const processedAnswers = [];

            for (const question of questions) {

                const studentAnswer = answers.find(
                    a => Number(a.questionId) === question.id
                );

                if (!studentAnswer) {
                    throw {
                        status: 400,
                        message: `Question ${question.id} not answered`
                    };
                }

                let calculatedScore = 0;

                /* CHECK DIMENSION SCORING */

                for (const dimension in scoringKey) {

                    const config = scoringKey[dimension];

                    if (dimension !== "careerConsultation") {

                        if (
                            config.items.includes(question.id) &&
                            studentAnswer.selectedOption === config.correctAnswer
                        ) {
                            calculatedScore = 1;
                        }

                    } else {

                        const consultationItem = config.items.find(
                            item => item.id === question.id
                        );

                        if (
                            consultationItem &&
                            consultationItem.answer === studentAnswer.selectedOption
                        ) {
                            calculatedScore = 1;
                        }

                    }

                }

                totalScore += calculatedScore;

                processedAnswers.push({
                    questionId: question.id,
                    selectedOption: studentAnswer.selectedOption,
                    calculatedScore
                });

            }

            /* =========================
            CALCULATE DIMENSIONS
            ========================= */

            const dimensionResults = [];

            for (const dimension in scoringKey) {

                let dimensionScore = 0;

                if (dimension !== "careerConsultation") {

                    const items = scoringKey[dimension].items;

                    dimensionScore = processedAnswers
                        .filter(ans => items.includes(ans.questionId))
                        .reduce((sum, ans) => sum + ans.calculatedScore, 0);

                } else {

                    const items = scoringKey[dimension].items.map(i => i.id);

                    dimensionScore = processedAnswers
                        .filter(ans => items.includes(ans.questionId))
                        .reduce((sum, ans) => sum + ans.calculatedScore, 0);

                }

                const maxScore = 6;
                const percentage = (dimensionScore / maxScore) * 100;

                let level = "Low";

                if (dimensionScore >= 5) level = "High";
                else if (dimensionScore >= 3) level = "Moderate";

                dimensionResults.push({
                    name: dimension,
                    score: dimensionScore,
                    maxScore,
                    percentage,
                    level
                });

            }

            /* =========================
            OVERALL SCORE
            ========================= */

            const maxTotalScore = 24;
            const percentage = (totalScore / maxTotalScore) * 100;

            let overallLevel = "Low";

            if (percentage >= 75) overallLevel = "High";
            else if (percentage >= 50) overallLevel = "Moderate";

            /* =========================
            STORE SUBMISSION
            ========================= */

            const existingSubmission = await CareerAssessment.findOne({ studentId });

            let submission;

            if (existingSubmission) {

                submission = await CareerAssessment.findByIdAndUpdate(
                    existingSubmission._id,
                    {
                        responses: processedAnswers,
                        totalScore,
                        percentage,
                        level: overallLevel,
                        dimensions: dimensionResults,
                        completionTimeSeconds: completionTimeSeconds || null,
                        submittedAt: new Date(),
                        $inc: { attemptNumber: 1 }
                    },
                    { new: true }
                );

            } else {

                submission = await CareerAssessment.create({
                    studentId,
                    responses: processedAnswers,
                    totalScore,
                    percentage,
                    level: overallLevel,
                    dimensions: dimensionResults,
                    completionTimeSeconds: completionTimeSeconds || null,
                    attemptNumber: 1,
                    submittedAt: new Date()
                });

            }

            /* =========================
            RESPONSE
            ========================= */

            return {
                status: true,
                message: "Career assessment submitted successfully",
                data: submission
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "Career assessment submission failed"
                }
            };

        }

    }

    static async getCareerResult(req) {
        try {

            const studentId = req.authData.user._id;

            const result = await CareerAssessment
                .findOne({ studentId })
                .sort({ submittedAt: -1 })
                .lean();

            if (!result) {
                return {
                    status: true,
                    data: null
                };
            }

            return {
                status: true,
                data: result
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: 500,
                    message: "Failed to fetch career assessment result"
                }
            };

        }
    }

    static async getRiasecQuestions() {
        try {

            const questions = await RiasecQuestion.find({})
                .select("id text dimension scoreIf")
                .lean();

            if (!questions.length) {
                throw {
                    status: 404,
                    message: "No career questions found"
                };
            }

            return {
                status: true,
                message: "Career questions fetched successfully",
                data: questions
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "Failed to fetch career questions"
                }
            };

        }
    }

    static async submitRiasecAssessment(req) {

        try {

            const { answers, completionTimeSeconds } = req.body;
            const studentId = req.authData.user._id;

            /* =========================
            VALIDATE ANSWERS
            ========================= */

            if (!Array.isArray(answers) || answers.length !== 42) {
                throw {
                    status: 400,
                    message: "All 42 questions must be answered"
                };
            }

            /* =========================
            FETCH QUESTIONS
            ========================= */

            const questions = await RiasecQuestion.find().lean();

            if (questions.length !== 42) {
                throw {
                    status: 500,
                    message: "RIASEC questions not configured properly"
                };
            }

            /* =========================
            INITIALIZE DIMENSIONS
            ========================= */

            const dimensionScores = {
                R: 0,
                I: 0,
                A: 0,
                S: 0,
                E: 0,
                C: 0
            };

            let totalScore = 0;
            const processedAnswers = [];

            /* =========================
            PROCESS ANSWERS
            ========================= */

            for (const question of questions) {

                const studentAnswer = answers.find(
                    a => Number(a.questionId) === question.id
                );

                if (!studentAnswer || !studentAnswer.selectedOption) {
                    throw {
                        status: 400,
                        message: `Question ${question.id} not answered`
                    };
                }

                let calculatedScore = 0;

                if (studentAnswer.selectedOption === "A") {
                    calculatedScore = 1;
                    dimensionScores[question.dimension] += 1;
                }

                totalScore += calculatedScore;

                processedAnswers.push({
                    questionId: question.id,
                    selectedOption: studentAnswer.selectedOption,
                    calculatedScore
                });

            }

            /* =========================
            GENERATE RIASEC CODE
            ========================= */

            const sortedDimensions = Object.entries(dimensionScores)
                .sort((a, b) => b[1] - a[1]);

            const interestCode = sortedDimensions
                .slice(0, 3)
                .map(d => d[0])
                .join("");

            /* =========================
            STORE OR UPDATE SUBMISSION
            ========================= */

            const existingSubmission = await RiasecAssessment.findOne({ studentId });

            let submission;

            if (existingSubmission) {

                submission = await RiasecAssessment.findByIdAndUpdate(
                    existingSubmission._id,
                    {
                        responses: processedAnswers,
                        dimensionScores,
                        interestCode,
                        totalScore,
                        completionTimeSeconds: completionTimeSeconds || null,
                        submittedAt: new Date(),
                        $inc: { attemptNumber: 1 }
                    },
                    { new: true }
                );

            } else {

                submission = await RiasecAssessment.create({
                    studentId,
                    responses: processedAnswers,
                    dimensionScores,
                    interestCode,
                    totalScore,
                    completionTimeSeconds: completionTimeSeconds || null,
                    attemptNumber: 1,
                    submittedAt: new Date()
                });

            }

            /* =========================
            RESPONSE
            ========================= */

            return {
                status: true,
                message: "RIASEC assessment submitted successfully",
                data: {
                    submissionId: submission._id,
                    totalScore,
                    dimensionScores,
                    interestCode
                }
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "RIASEC assessment submission failed"
                }
            };

        }

    }

    static async getRiasecResult(req) {
        try {

            const studentId = req.authData.user._id;

            const result = await RiasecAssessment
                .findOne({ studentId })
                .sort({ submittedAt: -1 })
                .lean();

            if (!result) {
                return {
                    status: true,
                    data: null
                };
            }

            return {
                status: true,
                data: result
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: 500,
                    message: "Failed to fetch career assessment result"
                }
            };

        }
    }
}

module.exports = PsychometricService;