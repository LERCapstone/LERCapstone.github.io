/* eslint-disable  func-names */
/* eslint-disable  dot-notation */
/* eslint-disable  new-cap */
/* eslint quote-props: ['error', 'consistent']*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports en-US lauguage.
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-trivia
 **/

'use strict';

const Alexa = require('alexa-sdk');
const QuestionLoader = require('QuestionsLoader');

const ANSWER_TYPES = {
    TRUE_FALSE:'TRUE_FALSE',
    MULTIPLE:'MULTIPLE_CHOICE',
}
const GAME_LENGTH = 5;  // The number of questions per trivia game.
const GAME_STATES = {
    TRIVIA: '_TRIVIAMODE', // Asking trivia questions.
    MENU: '_MENUMODE', // Entry point, start the game.
    HELP: '_HELPMODE', // The user is asking for help.
};
const APP_ID = "amzn1.ask.skill.ed9e8909-2925-4555-9fd6-18a95b193745"; 

/**
 * When editing your questions pay attention to your punctuation. Make sure you use question marks or periods.
 * Make sure the first answer is the correct one. Set at least ANSWER_COUNT answers, any extras will be shuffled in.
 */
const languageString = {
    'en-US': {
        'translation': {
            'GAME_NAME': 'Orientation and Mobility Trivia',
            'MAIN_MENU': 'Main Menu. Say start a new game or how to play.',
            'WELCOME_MESSAGE': 'Welcome to A.P.H. Orientation And Mobility Trivia. ', /* Edit for correct name*/
            
            'INSTRUCTIONS_MESSAGE': 'I will ask you a series of %s questions per player. ' + 
            'Listen to the answer options and say the number of the answer that you think is correct. ' +
            'At the end I will total the scores and announce the winner.',
            'PROMPTS_MESSAGE': 'At any time, you can say the following options. '+
            'Main menu. Start New Game. Pause Game. Resume Game. Cancel Game. Help. Exit.',
            'REPEAT_INSTRUCTIONS_MESSAGE': 'Say help to listen to these instructions again or at any time.',
            'RETURN_TO_GAME_FROM_HELP_MESSAGE': 'Say resume to continue with the game.',
            'RETURN_TO_MENU_FROM_HELP_MESSAGE': 'Say resume to go back to the menu.',
            
            
            'REPEAT_QUESTION_MESSAGE': 'To repeat the last question, say, repeat. ',
            'ASK_MESSAGE_START': 'Would you like to start playing?',
            'HELP_REPROMPT': 'To give an answer to a question, respond with the number of the answer. ',
            'STOP_MESSAGE': 'Would you like to keep playing?',
            'CANCEL_MESSAGE': 'Ok, let\'s play again soon.',
            'TRIVIA_UNHANDLED': 'Try saying a number between 1 and %s',
            'ANSWER_CORRECT_MESSAGE': 'correct. ',
            'ANSWER_WRONG_MESSAGE': 'wrong. ',
            'CORRECT_ANSWER_MESSAGE': 'The correct answer is %s: %s. ',
            'ANSWER_IS_MESSAGE': 'That answer is ',
            'TELL_QUESTION_MESSAGE': 'Player %s. Question %s. %s ',
            'GAME_OVER_MESSAGE': 'You got %s out of %s questions correct. Thank you for playing!',
            'SCORE_IS_MESSAGE': 'Your score is %s. ',
            
            'GOODBYE_MESSAGE': 'Ok, we\'ll play another time. Goodbye!',
        },
    },
    'en':{
        'translation':{

        },
    },
    'en-GB': {
        'translation': {
            'GAME_NAME': 'British O and M Trivia', 
        },
    },
};

function populateGameQuestions(difficulty) {
    const gameQuestions = [];
    
    var thing = function(result){
            //console.log("%j", result);//print JSON object as a String
            gameQuestions = result;
        };
        
        gameQuestions[currentQuestionIndex]['question_text']

    QuestionLoader.retrieveQuiz(GAME_LENGTH, difficulty, thing); // difficulty: 1 = easy difficulty, 2=medium, 3=hard
     
    if (GAME_LENGTH > gameQuestions.length) {
        throw new Error('Invalid Game Length.');
    }

    return gameQuestions;
}

/**
 * Get the answers for a given question, and place the correct answer at the spot marked by the
 * correctAnswerTargetLocation variable. Note that you can have as many answers as you want but
 * only ANSWER_COUNT will be selected.
 * */
function randonmizationRoundAnswers(currentAnswerArray) {
    
}

/*
**Validates 
*/
function isAnswerSlotValid(intent) {
    const answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    const answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value, 10));
    return answerSlotIsInt
        && parseInt(intent.slots.Answer.value, 10) < (ANSWER_COUNT + 1)
        && parseInt(intent.slots.Answer.value, 10) > 0;
}

function handleUserGuess(userGaveUp) {
    const answerSlotValid = isAnswerSlotValid(this.event.request.intent);
    let speechOutput = '';
    let speechOutputAnalysis = '';
    const gameQuestions = this.attributes.questions;
    let correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex, 10);
    let currentScore = parseInt(this.attributes.score, 10);
    let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
    const correctAnswerText = this.attributes.correctAnswerText;
    const translatedQuestions = this.t('QUESTIONS');

    if (answerSlotValid && parseInt(this.event.request.intent.slots.Answer.value, 10) === this.attributes['correctAnswerIndex']) {
        currentScore++;
        speechOutputAnalysis = this.t('ANSWER_CORRECT_MESSAGE');
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = this.t('ANSWER_WRONG_MESSAGE');
        }

        speechOutputAnalysis += this.t('CORRECT_ANSWER_MESSAGE', correctAnswerIndex, correctAnswerText);
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (this.attributes['currentQuestionIndex'] === GAME_LENGTH - 1) {
        speechOutput = userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + this.t('GAME_OVER_MESSAGE', currentScore.toString(), GAME_LENGTH.toString());

        this.emit(':tell', speechOutput);
    } else {
        currentQuestionIndex += 1;
        correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
        const roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
        const questionIndexForSpeech = currentQuestionIndex + 1;
        let repromptText = this.t('TELL_QUESTION_MESSAGE', questionIndexForSpeech.toString(), spokenQuestion);

        for (let i = 0; i < ANSWER_COUNT; i++) {
            repromptText += `${i + 1}. ${roundAnswers[i]}. `;
        }
        Object.assign(this.attributes, {
            'speechOutput': repromptText,
            'repromptText': repromptText,
            'currentQuestionIndex': currentQuestionIndex,
            'correctAnswerIndex': correctAnswerIndex + 1,
            'questions': gameQuestions,
            'score': currentScore,
        });


        speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', currentScore.toString()) + repromptText;

        this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
    }
}

function populateQuestionSpeech(currentQuestionIndex, gameQuestions){
    //Get answer strings into unsorted array
    const unsortedAnswerDictionaries = gameQuestions[currentQuestionIndex]['answers'];
    var unsortedAnswersArray = []
    for(let i = 0; i < unsortedAnswerDictionaries.length; i++){
        unsortedAnswersArray[i] = unsortedAnswerDictionaries[i]['answer_text'];
    }
    
    //Randomize answer strings and get correct answer index
    const randomRoundAnswers = randonmizationRoundAnswers(unsortedAnswersArray);
    const currentCorrectAnswerIndex = randomRoundAnswers.indexOf(gameQuestions[currentQuestionIndex]['correct_answer']);
    
    //Build Question Text
    const spokenQuestion = gameQuestions[currentQuestionIndex]['question_text'];
    let repromptText = this.t('TELL_QUESTION_MESSAGE', (currentQuestionIndex % parseInt(this.attributes['numberOfPlayers'])) + 1, (currentQuestionIndex + 1).toString(), spokenQuestion);
    
    for (let i = 0; i < randomRoundAnswers.length; i++) {
        repromptText += `${i + 1}. ${randomRoundAnswers[i]}. `;
    }
    
    //Assign all items to Alexa object
    Object.assign(this.attributes, {
        'speechOutput': repromptText,
        'repromptText': repromptText,
        'currentQuestionIndex': currentQuestionIndex,
        'correctAnswerIndex': currentCorrectAnswerIndex + 1,
        'questions': gameQuestions,
    });
}

const newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = GAME_STATES.MENU;
        this.emitWithState('MainMenu');
    },
    'Unhandled': function () {
        const speechOutput = this.t('START_UNHANDLED');
        this.emit(':ask', speechOutput, speechOutput);
    },
};

const menuStateHandlers = Alexa.CreateStateHandler(GAME_STATES.MENU, {
    'MainMenu': function () {
        const speechOutput = this.t('WELCOME_MESSAGE') + this.t('MAIN_MENU');
        const repromptText = this.t('MAIN_MENU');
        this.emit(':ask', speechOutput, repromptText);
    },
    'NewGameIntent': function (newGame) {
        if(this.event.request.dialogueState !== 'COMPLETED'){
            this.emit(':delegate');
        }
        else{
            const difficultyString = this.intent.slots.DifficultyLevel.value;
            var difficulty = 0;
            switch(difficultyString){
                case 'beginner':
                    difficulty = 1;
                    break;
                case 'intermediate':
                    difficulty = 2;
                    break;
                case 'advanced':
                    difficulty = 3;
                    break;
                default:
                    difficulty = 1;
            }
            const numberOfPlayers = this.intent.slots.NumberOfPlayers.value;
            const gameQuestions = populateGameQuestions(difficulty);
            const currentQuestionIndex = 0;
            
            var playerScore = new Array(numberOfPlayers);
            playerScore.fill(0);
            
            Object.assign(this.attributes, {
                'numberOfPlayers': numberOfPlayers,
                'currentPlayerScore': playerScore,
            });
            
            populateQuestionSpeech(0, gameQuestions);
            
            const speechOutput = this.attributes['speechOutput'];
            
            this.handler.state = GAME_STATES.TRIVIA;
            this.emit(':askWithCard', speechOutput, speechOutput, this.t('GAME_NAME'), speechOutput);
        }
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('mainMenuHelp');
    },
    'Unhandled': function () {
        const speechOutput = this.t('MAIN_MENU');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended in trivia state: ${this.event.request.reason}`);
    },
});

const triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
    'AnswerIntent': function () {
        handleUserGuess.call(this, false);
    },
    'MainMenuIntent': function() {
        this.handler.state = GAME_STATES.MENU;
        this.emitWithState('MainMenu');
    },
    'DontKnowIntent': function () {
        handleUserGuess.call(this, true);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('triviaHelp');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
    'AMAZON.CancelIntent': function () {
        this.handler.state = GAME_STATES.MENU;
        this.emitWithState('MainMenu');
    },
    'AMAZON.PauseIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
     'AMAZON.ResumeIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
    'Unhandled': function () {
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended in trivia state: ${this.event.request.reason}`);
    },
});

const helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
    'mainMenuHelp': function () {
        const helpMessage = this.t('INSTRUCTIONS_MESSAGE', GAME_LENGTH) + this.t('PROMPTS_MESSAGE');
        const speechOutput = helpMessage + + this.t('REPEAT_INSTRUCTIONS_MESSAGE') + this.t('RETURN_TO_MENU_FROM_HELP_MESSAGE');
        const repromptText = speechOutput;
        this.handler.state = GAME_STATES.MENU;
        this.emit(':ask', speechOutput, repromptText);
    },
    'triviaHelp': function () {
        const helpMessage = this.t('INSTRUCTIONS_MESSAGE', GAME_LENGTH) + this.t('PROMPTS_MESSAGE');
        const speechOutput = helpMessage + + this.t('REPEAT_INSTRUCTIONS_MESSAGE') + this.t('RETURN_TO_GAME_FROM_HELP_MESSAGE');
        const repromptText = speechOutput;
        this.handler.state = GAME_STATES.TRIVIA;
        this.emit(':ask', speechOutput, repromptText);
    },    
    'SessionEndedRequest': function () {
        console.log(`Session ended in help state: ${this.event.request.reason}`);
    },
});

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.resources = languageString;
    alexa.registerHandlers(newSessionHandlers, menuStateHandlers, triviaStateHandlers, helpStateHandlers);
    alexa.execute();
};
