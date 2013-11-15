'use strict';

var rx = require('rxjs');
var config = require('../../../../config');
var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/gamepad.hbs');
var io = require('../../../3rdparty/socket.io.min');
var observable = null;
var socket = null;

function sendAction(actionName) {
  socket.emit('move', { player: player.get().id, action: actionName });
}

function goUp(e) {
  e.preventDefault();
  $(e.currentTarget).addClass('pressed');
  sendAction('up');
}

function goDown(e) {
  e.preventDefault();
  $(e.currentTarget).addClass('pressed');
  sendAction('down');
}

function stop(e) {
  e.preventDefault();
  $(e.currentTarget).removeClass('pressed');
}

function observableGame() {
  return $.getJSONAsObservable('/game/status');
}

function currentPlayerIndex(players) {
  if (players[0].id === player.get().id) { return 0; }
  if (players[1].id === player.get().id) { return 1; }
  return null;
}

function checkGameStatus(res) {
  if (res.data.inProgress) {
    var idx = currentPlayerIndex(res.data.players);
    if (idx === null) {
      observable.dispose();
      routie.navigate('/wait');
    } else {
      $('#page .player').addClass('p' + (idx+1));
    }
  } else {
    observable.dispose();
    if (config.ask_about_social_networking === true) {
      routie.navigate('/thanks');
    }
    else {
      routie.navigate('/join');
    }
  }
}

function onError() {
  console.log('Game not responding');
}

module.exports = function() {

  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }

  socket = io.connect('/');
  
  $('#page').attr('class', 'gamepad');
  $('#page').html(view());

  $('.device').height(screen.height - 90);

  observable = rx.Observable
    .interval(2000)
    .startWith(-1)
    .selectMany(observableGame)
    .subscribe(checkGameStatus, onError);

  if ('ontouchstart' in window) {
    $('.up').on('touchstart', goUp);
    $('.up').on('touchend', stop);
    $('.down').on('touchstart', goDown);
    $('.down').on('touchend', stop);
  } else {
    $('.up').on('mousedown', goUp);
    $('.up').on('mouseup', stop);
    $('.down').on('mousedown', goDown);
    $('.down').on('mouseup', stop);
  }
};
