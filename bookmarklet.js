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
    
    var target,
        parser = new DOMParser(),
        data = [],
        progress_steps,
        progress = 0;

    function create_statusbar ( ) {
        var statuswidget = document.createElement('div');
        statuswidget.setAttribute('style', 'background: #fff; padding: 20px; border-radius: 10px; z-index: 10; position: fixed; top: 50px; right: 50px;');
        statuswidget.innerHTML = (
            '<div style="width: 100px; height: 10px; border: 2px solid black;">'
            + '<div id="progress-fill" style="width: 0%; height: 100%; background: #d10" />'
            + '</div>'
        );
        target.document.body.appendChild(statuswidget);
    }
    
    function update_statusbar ( ) {
        var percentage = ++progress / progress_steps * 100;
        target.document.querySelector('#progress-fill').style.width = percentage + '%';
    }
    
    function retrieveAndProceed (href, continuation) {
        window.jQuery.get(href, function (data) {
            var docElem = parser.parseFromString(data, 'text/html');
            continuation(docElem);
        });
    }
    
    var domain = ({
        'www.corpusdelespanol.org': {
            init: function ( ) {
                target = frames[6];
                var navtable = target.document.querySelectorAll('#zabba table')[1],
                    navrow = navtable.querySelectorAll('td')[2];
                progress_steps = Number(navrow.childNodes[4].nodeValue.split('/')[1]);
            },
            turnpage_then: function (doc, continuation, alternative) {
                var navtable = doc.querySelectorAll('#zabba table')[1];
                if (!navtable) {
                    alternative();
                    return;
                }
                var navrow = navtable.querySelectorAll('td')[2],
                    anchor = navrow.querySelectorAll('a')[2],
                    progress = navrow.childNodes[4].nodeValue.split('/');
                if (Number(progress[0]) < Number(progress[1])) {
                    retrieveAndProceed(anchor.href, continuation);
                } else {
                    alternative();
                }
            },
            scrape1page: function (doc) {
                var row, anchors, field, rowdata;
                for (var i = 1; i <= 100; ++i) {
                    row = doc.querySelector('#t' + i);
                    if (!row) continue;
                    anchors = row.querySelectorAll('a');
                    field = row.querySelector('#texto_' + i);
                    rowdata = [];
                    if (!anchors || !field || !field.value) continue;
                    for (var j = 0; j < 3; ++j) {
                        rowdata.push(anchors[j].childNodes[0].nodeValue);
                    }
                    data.push(rowdata.concat(field.value.split(/<b><u>|<\/u><\/b>/)));
                }
                update_statusbar();
            }
        },
        'corpus.rae.es': {
            init: function ( ) {
                target = window;
                var navnode = document.querySelector('td.texto[align="center"]');
                progress_steps = Number(navnode.textContent.split(/[^0,1-9]+/)[2]) + 1;
            },
            turnpage_then: function (doc, continuation, alternative) {
                var anchor = doc.querySelector('td > a');
                if (!anchor || anchor.textContent !== 'Siguiente') {
                    alternative();
                    return;
                }
                retrieveAndProceed(anchor.href, continuation);
            },
            scrape1page: function (doc) {
                var lines = doc.querySelector('tt').innerHTML.split('\n'),
                    pieces, century, rowdata;
                for (var l = lines.length, i = 1; i < l; ++i) {
                    pieces = lines[i].split(/<a.+?>|<\/a>/);
                    if (pieces.length < 3) continue;
                    century = Number(pieces[2].substr(52, 15).match(/\d\d/));
                    rowdata = [
                        pieces[0].substr(0, 5),
                        century + 1,
                        pieces[2].substr(109, 61),
                        pieces[0].substr(5),
                        pieces[1],
                        pieces[2].substr(0, 48)
                    ];
                    data.push(rowdata);
                }
                update_statusbar();
            }
        }
    }[window.location.hostname]);
    
    if (!domain) return;

    function insert_jquery_then (continuation) {
        var scriptnode = document.createElement('script');
        scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
        document.head.appendChild(scriptnode);
        scriptnode.addEventListener('load', continuation);
    }

    function data2csv ( ) {
        console.log(data);
        // step below removes mysterious undefined elements that
        // creep into the array
        data = data.filter(function (elem) { return elem; });
        var text = '',
            aLength;
        for (var l = data.length, i = 0; i < l; ++i) {
            var a = data[i];
            aLength = a.length;
            if (aLength !== 6) {
                console.log('Error: subarray of incorrect length.\n', a);
                continue;
            }
            text += String(a[0]).trim() + ';' + String(a[1]).trim();
            for (var j = 2; j < aLength; ++j) {
                text += ';"' + String(a[j]).trim() + '"';
            }
            text += '\n';
        }
        document.write(
            'Scraping complete. Please copy the contents below ' +
            'into a plaintext document and give it a .csv extension.<br>' +
            '<textarea id="output" style="width: 50ex; height: 10em;">' +
            'number;century;text;contextLeft;sample;contextRight\n' +
            text +
            '</textarea>'
        );
        window.jQuery('#output').focus().select();
    }
    
    function scrape (doc) {
        domain.turnpage_then(doc, function (next_doc) {
            domain.scrape1page(next_doc);
            scrape(next_doc);
        }, data2csv);
    }

    domain.init();
    create_statusbar();
    domain.scrape1page(target.document);
    insert_jquery_then(function ( ) {
        update_statusbar();
        scrape(target.document);
    });
}());
