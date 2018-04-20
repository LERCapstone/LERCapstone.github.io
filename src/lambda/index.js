/* eslint-disable  func-names */
/* eslint-disable  dot-notation */
/* eslint-disable  new-cap */
/* eslint quote-props: ['error', 'consistent']*/

'use strict';

const Alexa = require('alexa-sdk');
const QuestionLoader = require('QuestionsLoader');

const ANSWER_TYPES = {
    STRAIGHT_ANSWER:'2', //Allow user to say just the answer, not the number of the answer
    MULTIPLE_CHOICE:'1', //Require user to say the number of the answer
    SOUND_FILE_QUESTION:'3', //Question contains sound file
    SOUND_FILE_ANSWER:'4', //Question in which the answers are all sound files
}
const QUESTIONS_PER_PLAYER = 3; //The number of questions per user per game
const ANSWER_COUNT = 4;
var GAME_LENGTH;  // The number of questions per trivia game.
const GAME_STATES = {
    TRIVIA: '_TRIVIAMODE', // Asking trivia questions.
    MENU: '_MENUMODE', // Entry point, start the game.
    HELP: '_HELPMODE', // The user is asking for help.
};
const APP_ID = "amzn1.ask.skill.ed9e8909-2925-4555-9fd6-18a95b193745";


const languageString = {
    'en-US': {
        'translation': {
            //Menu
            'GAME_NAME': 'Orientation and Mobility Trivia ',
            'MAIN_MENU': 'Say start a new game or how to play. ',
            'WELCOME_MESSAGE': 'Welcome to O And M Trivia. ', /* Edit for correct name*/

            //Help
            'INSTRUCTIONS_MESSAGE': 'I will ask you a series of %s questions per player. ' +
            'Listen to the answer options and say the number of the answer that you think is correct. ' +
            'If it is true or false, you can just say the answer. ' +
            'At the end I will total the scores and announce the winner. ',
            'PROMPTS_MESSAGE': 'At any time, you can say the following options. '+
            'Main menu. Start New Game. Cancel. Help. Exit. ',
            'REPEAT_INSTRUCTIONS_MESSAGE': 'Say help to listen to these instructions again or at any time. ',
            'RETURN_TO_GAME_FROM_HELP_MESSAGE': 'Say resume to continue with the game. ',
            'RETURN_TO_MENU_FROM_HELP_MESSAGE': 'Say resume to go back to the menu. ',
            'TRIVIA_UNHANDLED': 'Try saying a number between 1 and %s ',

            //Trivia
            'START_TRIVIA_INSTRUCTIONS': 'Lets begin. ',
            'TELL_QUESTION_MESSAGE': 'Player %s. Question %s. %s ',
            'NEW_GAME_START_CONFIRMATION': 'Do you want to start a game with %s player on %s difficulty? ',

            //Answers
            'ANSWER_IS_MESSAGE': 'That answer is ',
            'ANSWER_CORRECT_MESSAGE': 'correct. ',
            'ANSWER_WRONG_MESSAGE': 'incorrect. ',
            'CORRECT_ANSWER_MESSAGE': 'The correct answer is %s: %s. ',
            'CORRECT_ANSWER_MESSAGE_TYPE_2': 'The correct answer is %s. ',
            'SCORE_IS_MESSAGE': 'Player %s. Your score is %s. ',

            //Game Over
            'FINAL_QUESTION_MESSAGE': 'That was the last question. ',
            'WINNER_IS_MESSAGE': 'The winner is ',
            'PLAYER': 'Player %s ',
            'FINAL_SCORE_MESSAGE': 'You got %s out of %s questions correct. ',
            'END_OF_GAME_MESSAGE': 'Congratulations to everyone! Thanks for playing! ',

            //Exit
            'GOODBYE_MESSAGE': 'Ok, we\'ll play another time. Goodbye! ',

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

/*
**Use QuestionLoader module to get json of question data
*/
function populateGameQuestions(difficulty, currentQuestionIndex, callback) {
    var gameQuestions = [];

    var thing = function(result){
        //console.log("%j", result);//print JSON object as a String
        gameQuestions = result;
        console.log(result);

        console.log(gameQuestions);
        console.log("Question Length: " + gameQuestions.length);
        console.log("GAME_LENGTH = " + GAME_LENGTH);

        if (GAME_LENGTH > gameQuestions.length) {
            throw new Error('Invalid Game Length.');
        }

        console.log("this into populateQuestionSpeech:" + this)
        callback.call(this, currentQuestionIndex, gameQuestions);
    };

    QuestionLoader.retrieveQuiz(GAME_LENGTH, difficulty, thing.bind(this)); // difficulty: 1 = easy difficulty, 2=medium, 3=hard

}

/**
 * Answers Randomized in Server; Function no longer needed
 * */
function randonmizationRoundAnswers(currentAnswerArray) {
    return currentAnswerArray;
}

/*
**Validates Answers Slot Data
**Answer Slot must exist and be an integer between 1 and the number of answers
*/
function isAnswerSlotValid(intent, answerCount) {
    const answerSlotFilled = intent && intent.slots && intent.slots.Answers && Boolean(intent.slots.Answers.value);
    console.log("answerSlotFilled: " + answerSlotFilled);
    const answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answers.resolutions.resolutionsPerAuthority[0].values[0].value.id, 10));
    console.log("answerSlotIsInt: " + answerSlotIsInt);
    return answerSlotIsInt
        && parseInt(intent.slots.Answers.resolutions.resolutionsPerAuthority[0].values[0].value.id, 10) < (answerCount + 1)
        && parseInt(intent.slots.Answers.resolutions.resolutionsPerAuthority[0].values[0].value.id, 10) > 0;
}

/*
**Build text for all scores, winner and winning score, ending game message
*/
function buildEndOfGameMessage(){
    let currentScore = this.attributes.currentPlayerScore;
    var highestScore = 0, winners = 0;
    var allScores = '';
    for(let i = 1; i <=  parseInt(this.attributes['numberOfPlayers']); i++){
        allScores += this.t('SCORE_IS_MESSAGE', i.toString(), currentScore[i - 1].toString());
    }

    currentScore.forEach(function(element){
        if (parseInt(element, 10) > highestScore){
            highestScore = parseInt(element, 10);
        }
    });

    var winnerMessage = this.t('WINNER_IS_MESSAGE');
    var playerNumber = 1;
    currentScore.forEach(function(element){
        if (parseInt(element, 10) == highestScore){
            winners += 1;
            if(winners > 1){
                winnerMessage += "and ";
            }
            winnerMessage += this.t('PLAYER', playerNumber);
        }

        playerNumber++;
    }.bind(this));

    winnerMessage += ". " +  this.t('FINAL_SCORE_MESSAGE', highestScore, QUESTIONS_PER_PLAYER);

    return this.t('FINAL_QUESTION_MESSAGE') + winnerMessage + this.t('END_OF_GAME_MESSAGE');
}

/*
**Assess User guess for validity and correctness.
**Build answer response and next question.
**If the most recent question was the last one of the game, then build end of game message
*/
function handleUserGuess(userGaveUp) {
    let speechOutput = '';
    let speechOutputAnalysis = '';
    const gameQuestions = this.attributes.questions;
    let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
    let correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex, 10);
    let currentScore = this.attributes.currentPlayerScore;
    let currentPlayerId = (currentQuestionIndex % parseInt(this.attributes['numberOfPlayers'])) + 1;
    let correctAnswerText = gameQuestions[currentQuestionIndex]["correct_answer"];
    let questionType = gameQuestions[currentQuestionIndex]["question_type"];
    let additionalAnswerInfo = gameQuestions[currentQuestionIndex]["additional_answer_info"];

    const answerSlotValid = isAnswerSlotValid(this.event.request.intent, gameQuestions[currentQuestionIndex]['answers'].length);

    if(!userGaveUp){
        console.log("Player Guess: " + this.event.request.intent.slots.Answers.resolutions.resolutionsPerAuthority[0].values[0].value.id);
    }
    console.log("Correct Answer Index: " + this.attributes['correctAnswerIndex']);
    console.log("answerSlotValid: " + answerSlotValid);

    //Check for valid guess and correct answer
    if (answerSlotValid && parseInt(this.event.request.intent.slots.Answers.resolutions.resolutionsPerAuthority[0].values[0].value.id, 10) == this.attributes['correctAnswerIndex']) {
        currentScore[currentPlayerId - 1] = currentScore[currentPlayerId - 1] + 1;
        speechOutputAnalysis = this.t('ANSWER_CORRECT_MESSAGE');
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = this.t('ANSWER_WRONG_MESSAGE');
        }

        if(questionType == ANSWER_TYPES.STRAIGHT_ANSWER){
            speechOutputAnalysis += this.t('CORRECT_ANSWER_MESSAGE_TYPE_2', correctAnswerText);
        }
        else{
            speechOutputAnalysis += this.t('CORRECT_ANSWER_MESSAGE', correctAnswerIndex, correctAnswerText);
        }
    }

    if(additionalAnswerInfo != ''){
        speechOutputAnalysis += additionalAnswerInfo + ' ';
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (this.attributes['currentQuestionIndex'] === GAME_LENGTH - 1) {
        speechOutput = userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis;
        const endOfGameMessage = buildEndOfGameMessage.call(this);

        this.emit(':tell', speechOutput + endOfGameMessage);
    } else {
        currentQuestionIndex += 1;
        populateQuestionSpeech.call(this, currentQuestionIndex, gameQuestions)

        const repromptText = this.attributes["repromptText"];
        speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        console.log("Current Player: " +  currentPlayerId);
        console.log("Current Score Array: " + currentScore);
        console.log("Current Player Score: " + currentScore[currentPlayerId - 1]);
        console.log("repromptText: " + repromptText);

        speechOutput += speechOutputAnalysis;
        for(let i = 1; i <=  parseInt(this.attributes['numberOfPlayers']); i++){
            speechOutput += this.t('SCORE_IS_MESSAGE', i.toString(), currentScore[i - 1].toString());
        }
        speechOutput += repromptText;

        this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
    }
}

/*
**Currently unused; use for restarting a saved game
*/
function rebuildCurrentQuestion(){
    let speechOutput = '';
    let speechOutputAnalysis = '';
    const gameQuestions = this.attributes.questions;
    let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
    let correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex, 10);
    let currentScore = this.attributes.currentPlayerScore;
    let currentPlayerId = (currentQuestionIndex % parseInt(this.attributes['numberOfPlayers'])) + 1;

    populateQuestionSpeech.call(this, currentQuestionIndex, gameQuestions)

    const repromptText = this.attributes["repromptText"];
    console.log("Current Player: " +  currentPlayerId);
    console.log("Current Score Array: " + currentScore);
    console.log("Current Player Score: " + currentScore[currentPlayerId - 1]);
    console.log("repromptText: " + repromptText);
    speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', currentPlayerId.toString(), currentScore[currentPlayerId - 1].toString()) + repromptText;

    this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
}

/*
**Populate all question data and speech prompts into Alexa object. 
**Automatically Emit if coming from the menu
*/
function populateQuestionSpeech(currentQuestionIndex, gameQuestions){
    //Get answer strings into unsorted array
    console.log("currentQuestionIndex = " + currentQuestionIndex);
    const unsortedAnswerDictionaries = gameQuestions[currentQuestionIndex]['answers'];
    var unsortedAnswersArray = []
    for(let i = 0; i < unsortedAnswerDictionaries.length; i++){
        unsortedAnswersArray[i] = unsortedAnswerDictionaries[i]['answer_text'];
    }

    //Randomize answer strings and get correct answer index
    const randomRoundAnswers = randonmizationRoundAnswers(unsortedAnswersArray);
    var currentCorrectAnswerText = gameQuestions[currentQuestionIndex]['correct_answer'];
    var currentCorrectAnswerIndex = randomRoundAnswers.indexOf(currentCorrectAnswerText);
    console.log("Correct Answer Text: " + currentCorrectAnswerText);
    console.log("Correct Answer Index: " + (currentCorrectAnswerIndex + 1));

    //Build Question Text
    var spokenQuestion = gameQuestions[currentQuestionIndex]['question_text'].replace('&', ' and ').replace(/(_)+/, ' [blank] ');
    let repromptText = this.t('TELL_QUESTION_MESSAGE', (currentQuestionIndex % parseInt(this.attributes['numberOfPlayers'])) + 1, (currentQuestionIndex + 1).toString(), spokenQuestion);

    //Build Answers based on question type
    const questionType = gameQuestions[currentQuestionIndex]['question_type'];
    if(questionType == ANSWER_TYPES.STRAIGHT_ANSWER){
        var sortedAnswersArray = [];
        if(!isNaN(parseInt(currentCorrectAnswerText, 10))){
            sortedAnswersArray = unsortedAnswersArray.sort(function(a, b){return parseInt(a, 10) - parseInt(b, 10)});
        }
        else if(currentCorrectAnswerText.toLowerCase() == 'true' || currentCorrectAnswerText.toLowerCase() == 'false'){
            sortedAnswersArray.push('true');
            sortedAnswersArray.push('false');
        }

        currentCorrectAnswerIndex = sortedAnswersArray.indexOf(currentCorrectAnswerText);
        console.log("New Correct Answer Index: " + (currentCorrectAnswerIndex + 1));

        for (let i = 0; i < sortedAnswersArray.length; i++) {
            repromptText += `${sortedAnswersArray[i]}. `;
            if(i == sortedAnswersArray.length - 2){
                repromptText += 'or ';
            }
            console.log("Answer " + (i + 1) + ": " + sortedAnswersArray[i]);
        }
    }
    else if (questionType == ANSWER_TYPES.SOUND_FILE_QUESTION){
        var soundFile = gameQuestions[currentQuestionIndex]['sound_bite_url'];
        spokenQuestion = spokenQuestion.replace('[sound]', '<audio src="' + soundFile + '" />')
        repromptText = this.t('TELL_QUESTION_MESSAGE', (currentQuestionIndex % parseInt(this.attributes['numberOfPlayers'])) + 1, (currentQuestionIndex + 1).toString(), spokenQuestion);
        
        for (let i = 0; i < randomRoundAnswers.length; i++) {
            repromptText += `${i + 1}. ${randomRoundAnswers[i]}. `;
            console.log("Answer " + (i + 1) + ": " + randomRoundAnswers[i]);
        }
    }
    else if (questionType == ANSWER_TYPES.SOUND_FILE_ANSWER){
        var sortedAnswersSoundFileArray = [];
        var answerIndex;
        for(let i = 0; i < randomRoundAnswers.length; i++){
            answerIndex = unsortedAnswersArray.indexOf(randomRoundAnswers[i]);
            sortedAnswersSoundFileArray[i] = unsortedAnswerDictionaries[answerIndex]['answer_sound_bite_url'];
        }

        for (let i = 0; i < sortedAnswersSoundFileArray.length; i++) {
            repromptText += `${i + 1}. <audio src="${sortedAnswersSoundFileArray[i]}" /> `;
            console.log("Answer " + (i + 1) + ": " + randomRoundAnswers[i] + ' ' + sortedAnswersSoundFileArray[i]);
        }
    }
    else{
        for (let i = 0; i < randomRoundAnswers.length; i++) {
            repromptText += `${i + 1}. ${randomRoundAnswers[i]}. `;
            console.log("Answer " + (i + 1) + ": " + randomRoundAnswers[i]);
        }
    }

    //Assign all items to Alexa object
    Object.assign(this.attributes, {
        'speechOutput': repromptText,
        'repromptText': repromptText,
        'currentQuestionIndex': currentQuestionIndex,
        'correctAnswerIndex': currentCorrectAnswerIndex + 1,
        'questions': gameQuestions,
    });

    if(this.handler.state == GAME_STATES.MENU){
        const speechOutput = this.t('START_TRIVIA_INSTRUCTIONS', QUESTIONS_PER_PLAYER) + repromptText;
        this.handler.state = GAME_STATES.TRIVIA;
        this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
    }
}

/*
**Handlers for New Session Start
*/
const newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = GAME_STATES.MENU;
        this.emitWithState('MainMenu', true);
    },
    'Unhandled': function () {
        const speechOutput = this.t('START_UNHANDLED');
        this.emit(':ask', speechOutput, speechOutput);
    },
};

/*
**Handlers for Menu State
*/
const menuStateHandlers = Alexa.CreateStateHandler(GAME_STATES.MENU, {
    'MainMenu': function (newGame) {
        const speechOutput = newGame ? this.t('WELCOME_MESSAGE') + this.t('MAIN_MENU') : this.t('MAIN_MENU');
        const repromptText = this.t('MAIN_MENU');
        this.emit(':ask', speechOutput, repromptText);
    },
    'NewGameIntent': function (newGame) {
        console.log("Slot Creation and Confirmation");
        console.log("current slots: # of Player:"+this.event.request.intent.slots.NumberOfPlayers.value + '; Difficulty: ' + this.event.request.intent.slots.DifficultyLevel.value);
        const intentObj = this.event.request.intent;
        console.log("Current object confirmation: " + intentObj.confirmationStatus);
        if (intentObj.confirmationStatus !== 'CONFIRMED') {
            if (intentObj.confirmationStatus !== 'DENIED') {
                // Initial State
                if(!intentObj.slots.NumberOfPlayers.value){
                    console.log("Number of Players not provided. Use default of 1.");
                    intentObj.slots.NumberOfPlayers.value = '1';
                }
                if(!intentObj.slots.DifficultyLevel.value){
                    console.log("Difficulty not provided. Use default of beginner.");
                    intentObj.slots.DifficultyLevel.value = 'beginner';
                }

                const speechOutput = this.t('NEW_GAME_START_CONFIRMATION', intentObj.slots.NumberOfPlayers.value, intentObj.slots.DifficultyLevel.value);
                const repromptSpeech = speechOutput;
                
                Object.assign(this.attributes, {
                    'confirmationCounter': '0',
                });

                console.log("current slots: # of Player:" + intentObj.slots.NumberOfPlayers.value + '; Difficulty: ' + intentObj.slots.DifficultyLevel.value);
                this.emit(':confirmIntent', speechOutput, repromptSpeech, intentObj);
            } else {
                console.log("Explicitly Elicit Slots");
                if(this.attributes['confirmationCounter'] == '0'){
                    intentObj.slots.NumberOfPlayers.value = '';
                    intentObj.slots.DifficultyLevel.value = '';
                }
                console.log("current slots: # of Player:"+intentObj.slots.NumberOfPlayers.value + '; Difficulty: ' + intentObj.slots.DifficultyLevel.value);
                
                if (intentObj.slots.NumberOfPlayers.value == ''){
                    const slotToElicit = 'NumberOfPlayers';
                    const speechOutput = 'How many people will be playing? You can select up to four players.';
                    this.attributes['confirmationCounter'] = parseInt(this.attributes['confirmationCounter'], 10) + 1;
                    this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput, intentObj);
                }
                else if(intentObj.slots.DifficultyLevel.value == ''){
                    const slotToElicit = 'DifficultyLevel';
                    const speechOutput = 'Choose a level of difficulty for this game. Beginner, Intermediate, or Advanced.';
                    this.attributes['confirmationCounter'] = parseInt(this.attributes['confirmationCounter'], 10) + 1;
                    this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput, intentObj);
                }
                else{            
                    const speechOutput = this.t('NEW_GAME_START_CONFIRMATION', intentObj.slots.NumberOfPlayers.value, intentObj.slots.DifficultyLevel.value);
                    this.attributes['confirmationCounter'] = 0;
                    this.emit(':confirmIntent', speechOutput, speechOutput, intentObj);
                }
            }
        } else {
            console.log("Options Confirmed. New Game Starting");
            const difficultyString = intentObj.slots.DifficultyLevel.value;
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
            
            const numberOfPlayers = parseInt(intentObj.slots.NumberOfPlayers.value, 10);
            const currentQuestionIndex = 0;
    
            GAME_LENGTH = QUESTIONS_PER_PLAYER * numberOfPlayers;
    
            var playerScore = Array(numberOfPlayers).fill(0);
            console.log("Number of Players: " + numberOfPlayers);
            console.log("Initial Scores: " + playerScore);
            console.log("DifficultyString: " + difficultyString);
            console.log("Difficulty: " + difficulty);
    
            Object.assign(this.attributes, {
                'numberOfPlayers': numberOfPlayers,
                'currentPlayerScore': playerScore,
            });
    
            console.log("this into populateGameQuestions: " + this);
            populateGameQuestions.call(this, difficulty, currentQuestionIndex, populateQuestionSpeech);
        }
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.ResumeIntent': function () {
        this.emit(':ask', this.t('MAIN_MENU'), this.t('MAIN_MENU'));
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
        console.log(`Session ended in menu state: ${this.event.request.reason}`);
    },
});

/*
**Handlers for Trivia State
*/
const triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
    'AnswerIntent': function () {
        if(!this.event.request.intent.slots.Answers.value){
            const slotToElicit = 'Answers';
            const speechOutput = 'I didn\'t understand your answer. Please say again';
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
          }
        else{
            handleUserGuess.call(this, false);
        }
    },
    'MainMenuIntent': function() {
        this.handler.state = GAME_STATES.MENU;
        this.emitWithState('MainMenu', false);
    },
    'DontKnowIntent': function () {
        handleUserGuess.call(this, true);
    },
    'ResumeGameIntent': function() {
        rebuildCurrentQuestion.call(this);
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
        this.emitWithState('MainMenu', false);
    },
    'AMAZON.PauseIntent': function () {
        this.emit(':tell', this.t('GOODBYE_MESSAGE'));
    },
     'AMAZON.ResumeIntent': function () {
        rebuildCurrentQuestion.call(this);
    },
    'Unhandled': function () {
        console.log(`UNHANDLED INTENT: ${this.event.request.reason}`);
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended in trivia state: ${this.event.request.reason}`);
    },
});

/*
**Handlers for Help State
*/
const helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
    'mainMenuHelp': function () {
        const helpMessage = this.t('INSTRUCTIONS_MESSAGE', QUESTIONS_PER_PLAYER) + this.t('PROMPTS_MESSAGE');
        const speechOutput = helpMessage + this.t('REPEAT_INSTRUCTIONS_MESSAGE') + this.t('RETURN_TO_MENU_FROM_HELP_MESSAGE');
        const repromptText = speechOutput;
        this.handler.state = GAME_STATES.MENU;
        this.emit(':ask', speechOutput, repromptText);
    },
    'triviaHelp': function () {
        const helpMessage = this.t('INSTRUCTIONS_MESSAGE', QUESTIONS_PER_PLAYER) + this.t('PROMPTS_MESSAGE');
        const speechOutput = helpMessage + this.t('REPEAT_INSTRUCTIONS_MESSAGE') + this.t('RETURN_TO_GAME_FROM_HELP_MESSAGE');
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
