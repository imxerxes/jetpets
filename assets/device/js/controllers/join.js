'use strict';

var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/join.hbs');

function joined() {
  routie.navigate('/lobby');
}

function backToWait() {
  routie.navigate('/wait');
}

function joinLobby(e) {
  e.preventDefault();
  var data = { playerId: player.get().id };
  $.post('/game/players', data).then(joined).fail(backToWait);
}

module.exports = function() {
  
  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }
  
  $('#page').attr('class', 'join');
  $('#page').html(view());
  $('button').on('click', joinLobby);
};