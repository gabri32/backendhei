// routes/chatbotRoutes.js
const express = require('express')
const { chatBotHandler ,createChatbot} = require('../controllers/chatbotController')

const router = express.Router()

router.post('/chatbot', chatBotHandler)
router.post('/createChatbot', createChatbot)
module.exports = router
