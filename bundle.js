(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const wanakana = require('wanakana');

const FADE_TIME = 600;

function startApp() {
  watchSubmit();
  watchToggle();
}

function watchSubmit() {
  $('.js-search-form').submit(event => {
    event.preventDefault();
    $('.loading-animation').show();
    $('.results').hide();
    $('.js-results').html('');
    let searchTerm = $(event.currentTarget)
      .find('.js-query')
      .val();
    let toggle = $('.js-toggle-button').text();
    if (toggle === 'E \u2192 J') searchTerm = `"${searchTerm}"`;
    getWordFromApi(searchTerm, processDataFromWordApi);
    $(event.currentTarget)
      .find('.js-query')
      .val('');
  });
}

function watchToggle() {
  $('.js-toggle-button').click(event => {
    $(event.currentTarget).text((index, text) => {
      return text === 'E \u2192 J' ? 'J \u2192 E' : 'E \u2192 J';
    });
  });
}

function getWordFromApi(searchTerm, callback) {
  const query = {
    url:
      'https://jeff-cors-anywhere-nzumhvclct.now.sh/http://beta.jisho.org/api/v1/search/words',
    success: callback,
    data: {
      keyword: searchTerm
    }
  };
  $.ajax(query);
}

function processDataFromWordApi(data) {
  console.log(data);
  if (data.data.length === 0)
    $('.js-results').html(
      `<div class="row">
        <div class='col-12'>
          Sorry! Your search didn't return any results.
        </div>
      </div>`
    );
  $('.results-count').text(`(${data.data.length})`);
  processWordData(data.data);
}

function processWordData(wordArray) {
  let currentWordArray = wordArray.slice();
  let wordsToDisplay = [];
  if (currentWordArray.length <= 5) {
    wordsToDisplay = currentWordArray.slice();
    processKanjiApiCall(wordsToDisplay);
  } else {
    wordsToDisplay = currentWordArray.splice(0, 5);
    processKanjiApiCall(wordsToDisplay);
    pageScrollListener(currentWordArray);
  }
}

function processKanjiApiCall(wordsToDisplay) {
  let kanjiArray = wordsToDisplay.map((word, index) => {
    return identifyKanji(word);
  });
  let kanjiPromiseArray = kanjiArray.map(kanjiInWord => {
    return Promise.all(kanjiInWord.map(kanji => getKanjiInfoFromApi(kanji)));
  });
  Promise.all(kanjiPromiseArray).then(args => {
    let kanjiDataFromApi = args;
    let kanjiGroupStringArray = kanjiDataFromApi.map(
      (kanjiInWord, wordIndex) => {
        return kanjiInWord.reduce((accumulator, kanjiData, kanjiIndex) => {
          if (typeof kanjiData === 'undefined') {
            return accumulator + '';
          } else if ('error' in kanjiData) {
            return (
              accumulator +
              `<div class='no-kanji-message'>Sorry! ${
                kanjiArray[wordIndex][kanjiIndex]
              } isn't in our database.</div>`
            );
          } else {
            return accumulator + processKanjiData(kanjiData);
          }
        }, '');
      }
    );
    displayWordData(wordsToDisplay, kanjiGroupStringArray);
  });
}

function processKanjiData(data) {
  let kanjiData = data;
  let kanjiChar = kanjiData.kanji.character;
  let kanjiVid = kanjiData.kanji.video.mp4;
  let kanjiVidPoster = kanjiData.kanji.video.poster;
  let kanjiMeaning = kanjiData.kanji.meaning.english;
  let kanjiStrokes = kanjiData.kanji.strokes.count;
  let kanjiGrade = kanjiData.references.grade;
  if (kanjiGrade === null) kanjiGrade = 'not listed';
  let kanjiGroup = `
      <div class="kanji-group">
        <div class="kanji-col-left">
          <div class="kanji-result">
            <video width="320" height="240" controls poster="${kanjiVidPoster}">
              <source src="${kanjiVid}" type="video/mp4">
              Your browser does not support the video tag.</video>
          </div>
        </div>
        <div class="kanji-col-right">
          ${kanjiMeaning}<br>
          <span class='kanji-info-label'>(${kanjiStrokes} strokes)</span>
        </div>
      </div>
    `;
  return kanjiGroup;
}

function identifyKanji(word) {
  // if word data doesn't have 'word' field then word contains no kanji
  if (typeof word.japanese[0].word === 'undefined') return [''];
  let wordCharacters = word.japanese[0].word.split('');
  let kanjiInWord = wordCharacters.filter((char, index) => {
    return (
      (char >= '\u4e00' && char <= '\u9faf') ||
      (char >= '\u3400' && char <= '\u4dbf')
    );
  });
  return kanjiInWord;
}

function displayWordData(wordArray, kanjiGroupStringArray) {
  $('.loading-animation').hide();
  $('.results').fadeIn(FADE_TIME);
  let wordAndKanjiData = wordArray.map((wordData, index) => {
    return {
      word: wordData,
      kanji: kanjiGroupStringArray[index]
    };
  });
  wordAndKanjiData.forEach((group, index) => {
    let japaneseWord = group.word.japanese[0].word;
    let wordReading = group.word.japanese[0].reading;
    let wordRomaji = wanakana.toRomaji(wordReading);
    let kanjiSection = group.kanji;
    let wordDefinitions = group.word.senses.map((definition, index) => {
      return definition.english_definitions.join(', ');
    });
    let wordResultSection = '';
    if (typeof japaneseWord === 'undefined') {
      wordResultSection = `
        <span class="japanese-word-hiragana">${wordReading}</span> <span class='word-label'>(word)</span><br>
        <span class="japanese-word-romaji">${wordRomaji}</span> <span class='word-label'>(romaji)</span><br>`;
    } else {
      wordResultSection = `
        <span class="japanese-word">${japaneseWord}</span> <span class='word-label'>(word)</span><br>
        <span class="japanese-word-hiragana">${wordReading}</span> <span class='word-label'>(reading)</span><br>
        <span class="japanese-word-romaji">${wordRomaji}</span> <span class='word-label'>(romaji)</span><br>`;
    }
    let definitionSection = wordDefinitions
      .map((definition, index) => {
        return `<div class="definition"><span class='definition-index'>
          ${index + 1})</span> ${definition}</span></div>`;
      })
      .join('');
    let $resultDiv = $(`
      <div class="row">
        <div class="col-3">
          <div class="word-result">
            ${wordResultSection}
          </div>
        </div>
        <div class="col-5">
          <div class="definition-result">
            ${definitionSection}
          </div>
        </div>
        <div class="col-4">
          <div class="kanji-info">
            ${kanjiSection}
          </div>
          </div>
      </div>
      <hr>
    `);
    $resultDiv
      .hide()
      .appendTo('.js-results')
      .fadeIn(FADE_TIME);
  });
}

function pageScrollListener(wordArray) {
  $(window).scroll(function() {
    if ($(window).scrollTop() == $(document).height() - $(window).height()) {
      console.log(wordArray);
      $('.loading-animation').show();
      processWordData(wordArray);
      $(window).off('scroll');
    }
  });
}

function getKanjiInfoFromApi(searchTerm) {
  return new Promise((resolve, reject) => {
    const query = {
      headers: {
        'X-Mashape-Key': 'KCKQ5WNODBmshLeydUQgzK645yIOp1a4IPpjsnOsnNPVb3ini0'
      },
      url:
        'https://kanjialive-api.p.mashape.com/api/public/kanji/' + searchTerm,
      dataType: 'json',
      complete: function(data) {
        resolve(data);
      },
      error: function(data) {
        resolve();
      }
    };
    $.ajax(query);
  });
}

$(startApp);

},{"wanakana":2}],2:[function(require,module,exports){
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports):"function"==typeof define&&define.amd?define(["exports"],n):n(e.wanakana=e.wanakana||{})}(this,function(e){"use strict";function n(e){return"string"!=typeof e||!e.length}function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments[1],a=arguments[2];if(n(e))return!1;var r=e.charCodeAt(0);return r>=t&&a>=r}function a(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return[].concat(Ce(e)).map(function(e,n){var a=e.charCodeAt(0),r=t(e,ye,he),o=t(e,se,le);return r?String.fromCharCode(a-ye+ie):o?String.fromCharCode(a-se+ue):e}).join("")}function r(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=1>=arguments.length||void 0===arguments[1]||arguments[1];if(n(e))return!1;var a=t?/[bcdfghjklmnpqrstvwxyz]/:/[bcdfghjklmnpqrstvwxz]/;return-1!==e.toLowerCase().charAt(0).search(a)}function o(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&t(e,ue,ce)}function i(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;return Math.min(e,n)}function u(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,t=arguments[2];return e.slice(n,t)}function c(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=1>=arguments.length||void 0===arguments[1]||arguments[1];if(n(e))return!1;var a=t?/[aeiouy]/:/[aeiou]/;return-1!==e.toLowerCase().charAt(0).search(a)}function y(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&e.charCodeAt(0)===me}function h(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&e.charCodeAt(0)===ke}function s(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(!!y(e)||t(e,ve,de))}function l(){var e=[];return(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"").split("").forEach(function(n){if(y(n)||h(n))e.push(n);else if(s(n)){var t=n.charCodeAt(0)+(fe-ve),a=String.fromCharCode(t);e.push(a)}else e.push(n)}),e.join("")}function v(){return t(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",fe,ge)}function d(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(s(e)||v(e))}function f(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(d)}function g(){return w(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},arguments.length>2&&void 0!==arguments[2]&&arguments[2]).map(function(e){return e[2]}).join("")}function w(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},a=arguments.length>2&&void 0!==arguments[2]&&arguments[2],y=Object.assign({},B,n),h=[],s=0,v=e.length,d=3,g="",w="";v>s;){var p=null;for(d=i(3,v-s);d>0;){if(g=u(e,s,s+d),w=g.toLowerCase(),je.includes(w)&&v-s>=4)w=(g=u(e,s,s+(d+=1))).toLowerCase();else{if("n"===w.charAt(0)){if(2===d){if(!y.IMEMode&&" "===w.charAt(1)){p="ん ";break}if(y.IMEMode&&"n'"===w){p="ん";break}}r(w.charAt(1),!1)&&c(w.charAt(2))&&(w=(g=u(e,s,s+(d=1))).toLowerCase())}"n"!==w.charAt(0)&&r(w.charAt(0))&&g.charAt(0)===g.charAt(1)&&(d=1,t(g.charAt(0),ue,ce)?(w="ッ",g="ッ"):(w="っ",g="っ"))}if(null!=(p=Ae[w]))break;d-=4===d?2:1}null==p&&(p=g),y.useObsoleteKana&&("wi"===w&&(p="ゐ"),"we"===w&&(p="ゑ")),y.IMEMode&&"n"===w.charAt(0)&&("y"===e.charAt(s+1).toLowerCase()&&!1===c(e.charAt(s+2))||s===v-1||f(e.charAt(s+1)))&&(p=g.charAt(0)),a||o(g.charAt(0))&&(p=l(p));var m=s+(d||1);h.push([s,m,p]),s=m}return h}function p(e){var n=k(arguments.length>1&&void 0!==arguments[1]?arguments[1]:{});if(e instanceof Element&&ze.includes(e.nodeName)){var t=Re();e.setAttribute("data-wanakana-id",t),e.autocapitalize="none",e.addEventListener("compositionupdate",b),e.addEventListener("input",n),Ee=j(n,t)}else console.warn("Input provided to Wanakana bind() was not a valid input field.")}function m(e){var n=A(e);null!=n?(e.removeAttribute("data-wanakana-id"),e.removeEventListener("compositionupdate",b),e.removeEventListener("input",n.handler),Ee=x(n)):console.warn("Input called with Wanakana unbind() had no listener registered.")}function k(e){var n=Object.assign({},B,e);return function(e){var t=e.target;if(Ke)Ke=!1;else{var r=a(t.value),o=w(q(r,n.IMEMode),Object.assign({},n,{IMEMode:!0})),i=o.map(function(e){return e[2]}).join("");if(r!==i){var u=t.selectionEnd;if(t.value=i,null!=t.setSelectionRange&&"number"==typeof t.selectionStart){if(0===u)t.setSelectionRange(0,0);else{t.setSelectionRange(t.value.length,t.value.length);for(var c=0,y=0;o.length>y;y+=1){var h=o[y],s=h[1];if(c+=h[2].length,s>=u){t.setSelectionRange(c,c);break}}}return}if(null!=t.createTextRange){t.focus();var l=t.createTextRange();l.collapse(!1),l.select()}}}}}function b(e){var n=e.data||e.detail&&e.detail.data,t=n&&n.slice(-2)||"",o="n"===t[0],i=a(t).split("").every(r);Ke=!o&&i}function j(e,n){return Ee.concat({id:n,handler:e})}function A(e){return e&&Ee.find(function(n){return n.id===e.getAttribute("data-wanakana-id")})}function x(e){var n=e.id;return Ee.filter(function(e){return e.id!==n})}function q(e,n){switch(!0){case"toHiragana"===n:return e.toLowerCase();case"toKatakana"===n:return e.toUpperCase();default:return e}}function C(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&re.some(function(n){var a=qe(n,2);return t(e,a[0],a[1])})}function z(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(C)}function E(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return ae.some(function(n){var a=qe(n,2);return t(e,a[0],a[1])})}function M(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(E)}function K(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(s)}function R(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(v)}function L(){return t(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",we,pe)}function O(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(Ce(e)).every(L)}function S(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{passKanji:!0},t=[].concat(Ce(e)),a=!1;return n.passKanji||(a=t.some(O)),(t.some(K)||t.some(R))&&t.some(z)&&!a}function I(){for(var e=[],n="",t=(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"").split(""),a=0;t.length>a;a+=1){var r=t[a],o=[h(r),y(r)],i=o[0],u=o[1];if(i||u&&1>a)e.push(r);else if(n&&u&&a>0){var c=xe[n].slice(-1);e.push(be[c])}else if(!u&&v(r)){var s=r.charCodeAt(0)+(ve-fe),l=String.fromCharCode(s);e.push(l),n=l}else e.push(r),n=""}return e.join("")}function T(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},B,n),a=e.length,r=[],o=0,c=2,y="",h="",s=void 0;a>o;){c=i(2,a-o);for(var l=!1;c>0;){if(y=u(e,o,o+c),R(y)&&(l=t.upcaseKatakana,y=I(y)),"っ"===y.charAt(0)&&1===c&&a-1>o){s=!0,h="";break}if(null!=(h=xe[y])&&s&&(h=h.charAt(0).concat(h),s=!1),null!=h)break;c-=1}null==h&&(h=y),l&&(h=h.toUpperCase()),r.push(h),o+=c||1}return r.join("")}function H(){return g(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},!0)}function P(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},B,n);return t.passRomaji?I(e):z(e)?H(e,t):S(e,{passKanji:!0})?H(I(e),t):I(e)}function U(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},B,n);return l(t.passRomaji?e:z(e)||S(e)?H(e,t):e)}function N(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&oe.some(function(n){var a=qe(n,2);return t(e,a[0],a[1])})}function W(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&ne.some(function(n){var a=qe(n,2);return t(e,a[0],a[1])})}function _(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(N(e)||W(e))}function D(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{all:!1};if(n(e)||!M(e)||f(e))return e;var a=[].concat(Ce(e));if(t.all)return a.filter(function(e){return!d(e)}).join("");for(var r=a.reverse(),o=0,i=r.length;i>o;o+=1){var u=r[o];if(!_(u)){if(O(u))break;r[o]=""}}return r.reverse().join("")}function J(e){switch(!0){case W(e):return"japanesePunctuation";case L(e):return"kanji";case s(e):return"hiragana";case v(e):return"katakana";default:return"romaji"}}function X(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";if(n(e))return[""];var t=[].concat(Ce(e)),a=t.shift(),r=J(a);return t.reduce(function(e,n){var t=J(n)===r;if(r=J(n),t){var a=e.pop();return e.concat(a.concat(n))}return e.concat(n)},[a])}var B={useObsoleteKana:!1,passRomaji:!1,upcaseKatakana:!1,IMEMode:!1},F=[65296,65305],G=[65377,65381],Q=[19968,40959],V=[13312,19903],Y=[48,57],Z=[0,127],$=[[256,257],[274,275],[298,299],[332,333],[362,363]],ee=[[8216,8217],[8220,8221]],ne=[[12288,12351],G,[12539,12540],[65281,65295],[65306,65311],[65339,65343],[65371,65376],[65504,65518]],te=[[12352,12447],[12448,12543],G,[65382,65439]],ae=[].concat(te,ne,[Y,F,Q,V]),re=[Z].concat($,ee),oe=[[33,47],[58,63],[91,96],[123,126]].concat(ee),ie=97,ue=65,ce=90,ye=65345,he=65370,se=65313,le=65338,ve=12353,de=12438,fe=12449,ge=12540,we=19968,pe=40879,me=12540,ke=12539,be={a:"あ",i:"い",u:"う",e:"え",o:"う"},je=["lts","chy","shy"],Ae={".":"。",",":"、",":":"：","/":"・","!":"！","?":"？","~":"〜","-":"ー","‘":"「","’":"」","“":"『","”":"』","[":"［","]":"］","(":"（",")":"）","{":"｛","}":"｝",a:"あ",i:"い",u:"う",e:"え",o:"お",yi:"い",wu:"う",whu:"う",xa:"ぁ",xi:"ぃ",xu:"ぅ",xe:"ぇ",xo:"ぉ",xyi:"ぃ",xye:"ぇ",ye:"いぇ",wha:"うぁ",whi:"うぃ",whe:"うぇ",who:"うぉ",wi:"うぃ",we:"うぇ",va:"ゔぁ",vi:"ゔぃ",vu:"ゔ",ve:"ゔぇ",vo:"ゔぉ",vya:"ゔゃ",vyi:"ゔぃ",vyu:"ゔゅ",vye:"ゔぇ",vyo:"ゔょ",ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",lka:"ヵ",lke:"ヶ",xka:"ヵ",xke:"ヶ",kya:"きゃ",kyi:"きぃ",kyu:"きゅ",kye:"きぇ",kyo:"きょ",ca:"か",ci:"き",cu:"く",ce:"け",co:"こ",lca:"ヵ",lce:"ヶ",xca:"ヵ",xce:"ヶ",qya:"くゃ",qyu:"くゅ",qyo:"くょ",qwa:"くぁ",qwi:"くぃ",qwu:"くぅ",qwe:"くぇ",qwo:"くぉ",qa:"くぁ",qi:"くぃ",qe:"くぇ",qo:"くぉ",kwa:"くぁ",qyi:"くぃ",qye:"くぇ",ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",gya:"ぎゃ",gyi:"ぎぃ",gyu:"ぎゅ",gye:"ぎぇ",gyo:"ぎょ",gwa:"ぐぁ",gwi:"ぐぃ",gwu:"ぐぅ",gwe:"ぐぇ",gwo:"ぐぉ",sa:"さ",si:"し",shi:"し",su:"す",se:"せ",so:"そ",za:"ざ",zi:"じ",zu:"ず",ze:"ぜ",zo:"ぞ",ji:"じ",sya:"しゃ",syi:"しぃ",syu:"しゅ",sye:"しぇ",syo:"しょ",sha:"しゃ",shu:"しゅ",she:"しぇ",sho:"しょ",shya:"しゃ",shyu:"しゅ",shye:"しぇ",shyo:"しょ",swa:"すぁ",swi:"すぃ",swu:"すぅ",swe:"すぇ",swo:"すぉ",zya:"じゃ",zyi:"じぃ",zyu:"じゅ",zye:"じぇ",zyo:"じょ",ja:"じゃ",ju:"じゅ",je:"じぇ",jo:"じょ",jya:"じゃ",jyi:"じぃ",jyu:"じゅ",jye:"じぇ",jyo:"じょ",ta:"た",ti:"ち",tu:"つ",te:"て",to:"と",chi:"ち",tsu:"つ",ltu:"っ",xtu:"っ",tya:"ちゃ",tyi:"ちぃ",tyu:"ちゅ",tye:"ちぇ",tyo:"ちょ",cha:"ちゃ",chu:"ちゅ",che:"ちぇ",cho:"ちょ",cya:"ちゃ",cyi:"ちぃ",cyu:"ちゅ",cye:"ちぇ",cyo:"ちょ",chya:"ちゃ",chyu:"ちゅ",chye:"ちぇ",chyo:"ちょ",tsa:"つぁ",tsi:"つぃ",tse:"つぇ",tso:"つぉ",tha:"てゃ",thi:"てぃ",thu:"てゅ",the:"てぇ",tho:"てょ",twa:"とぁ",twi:"とぃ",twu:"とぅ",twe:"とぇ",two:"とぉ",da:"だ",di:"ぢ",du:"づ",de:"で",do:"ど",dya:"ぢゃ",dyi:"ぢぃ",dyu:"ぢゅ",dye:"ぢぇ",dyo:"ぢょ",dha:"でゃ",dhi:"でぃ",dhu:"でゅ",dhe:"でぇ",dho:"でょ",dwa:"どぁ",dwi:"どぃ",dwu:"どぅ",dwe:"どぇ",dwo:"どぉ",na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",nya:"にゃ",nyi:"にぃ",nyu:"にゅ",nye:"にぇ",nyo:"にょ",ha:"は",hi:"ひ",hu:"ふ",he:"へ",ho:"ほ",fu:"ふ",hya:"ひゃ",hyi:"ひぃ",hyu:"ひゅ",hye:"ひぇ",hyo:"ひょ",fya:"ふゃ",fyu:"ふゅ",fyo:"ふょ",fwa:"ふぁ",fwi:"ふぃ",fwu:"ふぅ",fwe:"ふぇ",fwo:"ふぉ",fa:"ふぁ",fi:"ふぃ",fe:"ふぇ",fo:"ふぉ",fyi:"ふぃ",fye:"ふぇ",ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",bya:"びゃ",byi:"びぃ",byu:"びゅ",bye:"びぇ",byo:"びょ",pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",pya:"ぴゃ",pyi:"ぴぃ",pyu:"ぴゅ",pye:"ぴぇ",pyo:"ぴょ",ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",mya:"みゃ",myi:"みぃ",myu:"みゅ",mye:"みぇ",myo:"みょ",ya:"や",yu:"ゆ",yo:"よ",xya:"ゃ",xyu:"ゅ",xyo:"ょ",ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",rya:"りゃ",ryi:"りぃ",ryu:"りゅ",rye:"りぇ",ryo:"りょ",la:"ら",li:"り",lu:"る",le:"れ",lo:"ろ",lya:"りゃ",lyi:"りぃ",lyu:"りゅ",lye:"りぇ",lyo:"りょ",wa:"わ",wo:"を",lwe:"ゎ",xwa:"ゎ",n:"ん",nn:"ん","n'":"ん","n ":"ん",xn:"ん",ltsu:"っ"},xe={"　":" ","！":"!","？":"?","。":".","：":":","・":"/","、":",","〜":"~","ー":"-","「":"‘","」":"’","『":"“","』":"”","［":"[","］":"]","（":"(","）":")","｛":"{","｝":"}","あ":"a","い":"i","う":"u","え":"e","お":"o","ゔぁ":"va","ゔぃ":"vi","ゔ":"vu","ゔぇ":"ve","ゔぉ":"vo","か":"ka","き":"ki","きゃ":"kya","きぃ":"kyi","きゅ":"kyu","く":"ku","け":"ke","こ":"ko","が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go","ぎゃ":"gya","ぎぃ":"gyi","ぎゅ":"gyu","ぎぇ":"gye","ぎょ":"gyo","さ":"sa","す":"su","せ":"se","そ":"so","ざ":"za","ず":"zu","ぜ":"ze","ぞ":"zo","し":"shi","しゃ":"sha","しゅ":"shu","しょ":"sho","じ":"ji","じゃ":"ja","じゅ":"ju","じょ":"jo","た":"ta","ち":"chi","ちゃ":"cha","ちゅ":"chu","ちょ":"cho","つ":"tsu","て":"te","と":"to","だ":"da","ぢ":"di","づ":"du","で":"de","ど":"do","な":"na","に":"ni","にゃ":"nya","にゅ":"nyu","にょ":"nyo","ぬ":"nu","ね":"ne","の":"no","は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho","ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo","ふぁ":"fa","ふぃ":"fi","ふぇ":"fe","ふぉ":"fo","ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo","びゃ":"bya","びゅ":"byu","びょ":"byo","ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po","ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo","ま":"ma","み":"mi","む":"mu","め":"me","も":"mo","みゃ":"mya","みゅ":"myu","みょ":"myo","や":"ya","ゆ":"yu","よ":"yo","ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro","りゃ":"rya","りゅ":"ryu","りょ":"ryo","わ":"wa","を":"wo","ん":"n","ゐ":"wi","ゑ":"we","きぇ":"kye","きょ":"kyo","じぃ":"jyi","じぇ":"jye","ちぃ":"cyi","ちぇ":"che","ひぃ":"hyi","ひぇ":"hye","びぃ":"byi","びぇ":"bye","ぴぃ":"pyi","ぴぇ":"pye","みぇ":"mye","みぃ":"myi","りぃ":"ryi","りぇ":"rye","にぃ":"nyi","にぇ":"nye","しぃ":"syi","しぇ":"she","いぇ":"ye","うぁ":"wha","うぉ":"who","うぃ":"wi","うぇ":"we","ゔゃ":"vya","ゔゅ":"vyu","ゔょ":"vyo","すぁ":"swa","すぃ":"swi","すぅ":"swu","すぇ":"swe","すぉ":"swo","くゃ":"qya","くゅ":"qyu","くょ":"qyo","くぁ":"qwa","くぃ":"qwi","くぅ":"qwu","くぇ":"qwe","くぉ":"qwo","ぐぁ":"gwa","ぐぃ":"gwi","ぐぅ":"gwu","ぐぇ":"gwe","ぐぉ":"gwo","つぁ":"tsa","つぃ":"tsi","つぇ":"tse","つぉ":"tso","てゃ":"tha","てぃ":"thi","てゅ":"thu","てぇ":"the","てょ":"tho","とぁ":"twa","とぃ":"twi","とぅ":"twu","とぇ":"twe","とぉ":"two","ぢゃ":"dya","ぢぃ":"dyi","ぢゅ":"dyu","ぢぇ":"dye","ぢょ":"dyo","でゃ":"dha","でぃ":"dhi","でゅ":"dhu","でぇ":"dhe","でょ":"dho","どぁ":"dwa","どぃ":"dwi","どぅ":"dwu","どぇ":"dwe","どぉ":"dwo","ふぅ":"fwu","ふゃ":"fya","ふゅ":"fyu","ふょ":"fyo","ぁ":"a","ぃ":"i","ぇ":"e","ぅ":"u","ぉ":"o","ゃ":"ya","ゅ":"yu","ょ":"yo","っ":"","ゕ":"ka","ゖ":"ka","ゎ":"wa","んあ":"n'a","んい":"n'i","んう":"n'u","んえ":"n'e","んお":"n'o","んや":"n'ya","んゆ":"n'yu","んよ":"n'yo"},qe=function(){function e(e,n){var t=[],a=!0,r=!1,o=void 0;try{for(var i,u=e[Symbol.iterator]();!(a=(i=u.next()).done)&&(t.push(i.value),!n||t.length!==n);a=!0);}catch(e){r=!0,o=e}finally{try{!a&&u.return&&u.return()}finally{if(r)throw o}}return t}return function(n,t){if(Array.isArray(n))return n;if(Symbol.iterator in Object(n))return e(n,t);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),Ce=function(e){if(Array.isArray(e)){for(var n=0,t=Array(e.length);e.length>n;n++)t[n]=e[n];return t}return Array.from(e)},ze=["TEXTAREA","INPUT"],Ee=[],Me=0,Ke=!1,Re=function(){return Me+=1,""+Date.now()+Me};e.bind=p,e.unbind=m,e.isRomaji=z,e.isJapanese=M,e.isKana=f,e.isHiragana=K,e.isKatakana=R,e.isMixed=S,e.isKanji=O,e.toRomaji=T,e.toKana=g,e.toHiragana=P,e.toKatakana=U,e.stripOkurigana=D,e.tokenize=X,Object.defineProperty(e,"__esModule",{value:!0})});

},{}]},{},[1]);
