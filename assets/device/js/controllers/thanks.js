'use strict';

var routie = require('../../../3rdparty/routie');
var view = require('../../views/thanks.hbs');
var config = require('../../../../config');

module.exports = function() {
  
  $('#page').attr('class', 'thanks');
  $('#page').html(view(config));

  $('#done').click(function() {
    routie.navigate('/join');
  });

};