'use strict';

var routie = require('../../../3rdparty/routie');
var view = require('../../views/thanks.hbs');

module.exports = function() {
  
  $('#page').attr('class', 'thanks');
  $('#page').html(view());
  
  $("#tweet").click(function(e) {
  	alert('tweet!');
  });

  $("#done").click(function(event) {
  	routie.navigate('/join');
  });

};
