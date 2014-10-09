/*
    (c) 2014 Digital Humanities Lab, Faculty of Humanities, Utrecht University
    Author: Julian Gonggrijp, j.gonggrijp@uu.nl
    
    Automated text scraper for Spanish text corpora:
    http://corpus.rae.es/cordenet.html
    http://corpus.rae.es/creanet.html
    http://www.corpusdelespanol.org/
*/

(function ( ) {
    'use strict';

    var target = frames[6],
        doc = target.document,
        p = new DOMParser(),
        data = [];

    function data2csv ( ) {
        console.log(data);
        var text = '';
        for (var l = data.length, i = 0; i < l; ++i) {
            var a = data[i];
            for (var m = a.length, j = 0; j < m; ++j) {
                text += a[j] + ';';
            }
            text += '\n';
        }
        document.write(text);
    }

    function insert_jquery_then (continuation) {
        var scriptnode = document.createElement('script');
        scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
        document.head.appendChild(scriptnode);
        scriptnode.addEventListener('load', continuation);
    }

    function cordelesp_turnpage_then (continuation, alternative) {
        var navtable = doc.querySelectorAll('#zabba table')[1],
            navrow = navtable.querySelectorAll('td')[2],
            anchor = navrow.querySelectorAll('a')[2],
            progress = navrow.childNodes[4].nodeValue.split('/'),
            table = doc.querySelector('#zabba');
        if (Number(progress[0]) < Number(progress[1])) {
            window.jQuery.get(anchor.href, function (data) {
                var result = p.parseFromString(data, 'text/html');
                table.innerHTML = result.querySelector('#zabba').innerHTML;
                continuation();
            });
        } else {
            // step below removes mysterious undefined elements that
            // creep into the array
            data = data.filter(function (elem) { return elem; });
            alternative();
        }
    }

    function cordelesp_scrape1page ( ) {
        for (var i = 1; i <= 100; ++i) {
            var field = doc.querySelector('#texto_' + i);
            if (!field || !field.value) continue;
            data.push(field.value.split(/<b><u>|<\/u><\/b>/));
        }
    }

    function scrape_cordelesp ( ) {
        cordelesp_turnpage_then(function ( ) {
            data = data.concat(cordelesp_scrape1page());
            scrape_cordelesp();
        }, data2csv);
    }

    cordelesp_scrape1page();
    insert_jquery_then(scrape_cordelesp);
})();
