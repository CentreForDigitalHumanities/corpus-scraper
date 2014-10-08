/*
    (c) 2014 Digital Humanities Lab, Faculty of Humanities, Utrecht University
    Author: Julian Gonggrijp, j.gonggrijp@uu.nl
    
    Automated text scraper for Spanish text corpora:
    http://corpus.rae.es/cordenet.html
    http://corpus.rae.es/creanet.html
    http://www.corpusdelespanol.org/
*/

// J.get(url, null, function (data) {
//     var table = J('#zabba'), p = new DOMParser();
//     doc = p.parseFromString(data, 'text/html');
//     table.html(doc.querySelector('#zabba').innerHTML);
// })

(function ( ) {
    'use strict';

    var target = frames[6],
        doc = target.document;

    function nestedarray2csv (arr) {
        var text = '';
        for (var l = arr.length, i = 0; i < l; ++i) {
            var a = arr[i];
            for (var m = a.length, j = 0; j < m; ++j) {
                text += a[j] + ';';
            }
            text += '\n';
        }
        return text;
    }

    function insert_jquery_then (continuation) {
        var scriptnode = document.createElement('script');
        scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
        document.head.appendChild(scriptnode);
        scriptnode.addEventListener('load', continuation);
    }

    function cordelesp_turnpage_then (continuation) {
        doc.querySelectorAll('#zabba table')[1].querySelectorAll('a')[2].click();
        target.addEventListener('load', function ( ) {
            doc = target.document;
            continuation();
        });
    }

    function cordelesp_scrape1page ( ) {
        var data = [];
        for (var i = 1; i <= 100; ++i) {
            var field = doc.querySelector('#texto_' + i);
            if (! field) break;
            data.push(field.value.split(/<b><u>|<\/u><\/b>/));
        }
        return data;
    }

    function scrape_cordelesp ( ) {
        var data = cordelesp_scrape1page();
        cordelesp_turnpage_then(function ( ) {
            data = data.concat(cordelesp_scrape1page());
            console.log(nestedarray2csv(data));
        });
    }

    insert_jquery_then(scrape_cordelesp);
})();
