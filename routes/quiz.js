// routes/quiz.js
const express = require("express");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new quiz
router.post("/create", authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  const userId = req.user.id;

  try {
    const quiz = new Quiz({
      name,
      type,
      user: userId,
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add multiple questions to a quiz
router.post("/:quizId/questions", authMiddleware, async (req, res) => {
  const { quizId } = req.params;
  const { questions } = req.body; // Expecting an array of questions

  try {
    // Check if the quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Validate the input
    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Invalid input format" });
    }

    // Save questions and associate them with the quiz
    const savedQuestions = [];
    for (const question of questions) {
      const newQuestion = new Question({
        quiz: quizId,
        ...question,
      });
      await newQuestion.save();
      savedQuestions.push(newQuestion);
    }

    // Update the quiz with the new questions
    quiz.questions = savedQuestions.map((q) => q._id);
    await quiz.save();

    res.status(201).json({ quiz, questions: savedQuestions });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get quizzes created by the logged-in user
router.get("/myquizzes", authMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user.id }).populate(
      "questions"
    );
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get detailed information about a specific quiz, including its questions
router.get("/:quizId", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Find the quiz and populate the questions
    const quiz = await Quiz.findById(quizId).populate({
      path: "questions",
      populate: {
        path: "options",
        model: "Option", // Assuming options are a separate model; adjust if needed
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:quizId/views", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Find the quiz by ID
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Increment the views count
    quiz.views += 1;
    console.log("Incrementing views, new count:", quiz.views);

    // Save the updated quiz
    await quiz.save();

    res
      .status(200)
      .json({ message: "Views count incremented", views: quiz.views });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete quiz and associated questions by quizId
router.delete("/:quizId", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Find and delete the quiz by ID
    const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

    if (!deletedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Delete associated questions (assuming you have a separate collection for questions)
    await Question.deleteMany({ quiz: quizId });

    res
      .status(200)
      .json({ message: "Quiz and associated questions deleted successfully" });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update quiz details (e.g., name, type)
router.put("/:quizId", authMiddleware, async (req, res) => {
  const { quizId } = req.params;
  const { name, type } = req.body;

  try {
    // Find the quiz by ID
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Update quiz details
    if (name) quiz.name = name;
    if (type) quiz.type = type;

    // Save the updated quiz
    await quiz.save();

    res.status(200).json({ message: "Quiz updated successfully", quiz });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a specific question in a quiz
router.put(
  "/:quizId/questions/:questionId",
  authMiddleware,
  async (req, res) => {
    const { quizId, questionId } = req.params;
    const updatedData = req.body;

    try {
      // Check if the quiz exists
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // Check if the question exists
      const question = await Question.findById(questionId);
      if (!question || question.quiz.toString() !== quizId) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Update question details
      Object.assign(question, updatedData);

      // Save the updated question
      await question.save();

      res
        .status(200)
        .json({ message: "Question updated successfully", question });
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
