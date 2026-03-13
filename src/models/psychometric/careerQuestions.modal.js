const mongoose = require("mongoose");

const CareerQuestionSchema = new mongoose.Schema(
{
    id: {
        type: Number,
        required: true,
        unique: true
    },

    text: {
        type: String,
        required: true
    },

    dimension: {
        type: String,
        enum: [
            "careerConcern",
            "careerCuriosity",
            "careerConfidence",
            "careerConsultation"
        ],
        required: true
    },

    scoreIf: {
        type: String,
        enum: ["A", "D"],
        required: true
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model("CareerQuestion", CareerQuestionSchema);