require('dotenv').config();

// connect to MongoDB database
require('../src/config/config.database');

const express = require('express');
const http = require('http');
// const socketHandler = require('./config/socket');
const { logger } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const createError = require("http-errors");
const PORT = process.env.PORT || 8100;
const app = express();
const server = http.createServer(app);

// handle cors
app.use(cors());
app.use(express.json()); 
app.use(express.static('uploads')); 
app.use('/uploads', express.static('uploads'));

//Bithday reminder notification
// runBirthdayScheduler();
// runEventScheduler();

const userRoutes = require('../src/routes/user.route');
const schoolRoutes = require('../src/routes/school.route');
const studentRoutes = require('../src/routes/student.route');
const careerRoutes = require('../src/routes/career.route');
const universityRoutes = require('../src/routes/university.route');
const skillReadinessRoutes = require('../src/routes/skillReadiness.route');
const psychometricRoutes = require('../src/routes/psychometric.route');
const blogRoutes = require("../src/routes/blog.route")
const auditLogRoutes = require("../src/routes/auditLog.route")
const studentExperienceRoutes = require("../src/routes/studentExperience.route")
const studentShortlistRoutes = require("../src/routes/studentShortlist.route")

app.get("/", (req, res) => res.status(200).json({
    status: true,
    message: "Welcome to polstrat. This is the staging server"
}));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(bodyParser.json())

// routers
app.use("/api/users", userRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/skillReadiness", skillReadinessRoutes);
app.use("/api/psychometric", psychometricRoutes);
app.use("/api/studentBlog", blogRoutes);
app.use("/api/auditLog",auditLogRoutes);
app.use("/api/student-experience", studentExperienceRoutes);
app.use("/api/student-shortlist", studentShortlistRoutes);
// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

//place errorhandler at the end just before when we call our listner
app.use(errorHandler);

server.listen(PORT, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`Server is live at localhost:${PORT}`)
    }
});

module.exports = app;
